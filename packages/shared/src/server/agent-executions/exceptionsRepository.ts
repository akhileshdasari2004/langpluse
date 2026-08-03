import type { AgentExecutionException, PrismaClient } from "../../db";
import { Prisma, prisma } from "../../db";
import {
  exceptionDecisionToStatus,
  type AgentExecutionExceptionRecordInput,
  type AgentExecutionExceptionResolveInput,
} from "../../features/agent-executions/exceptions";

type AgentExecutionExceptionClient = Pick<
  PrismaClient,
  "agentExecutionException"
>;

const exceptionSelect = {
  id: true,
  projectId: true,
  runId: true,
  eventId: true,
  dedupeKey: true,
  type: true,
  severity: true,
  status: true,
  title: true,
  summary: true,
  proposedAction: true,
  evidence: true,
  sourceEventIds: true,
  resolutionReason: true,
  resolvedAt: true,
  resolvedByUserId: true,
  version: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AgentExecutionExceptionSelect;

export type AgentExecutionExceptionRecord = Pick<
  AgentExecutionException,
  keyof typeof exceptionSelect
>;

export type ExceptionResolutionResult =
  | {
      kind: "resolved";
      before: AgentExecutionExceptionRecord;
      after: AgentExecutionExceptionRecord;
    }
  | { kind: "not_found" }
  | { kind: "conflict"; current: AgentExecutionExceptionRecord };

function nullableJson(value: AgentExecutionExceptionRecordInput["evidence"]) {
  return value === undefined || value === null ? Prisma.JsonNull : value;
}

export async function recordAgentExecutionException({
  input,
  db = prisma,
}: {
  input: AgentExecutionExceptionRecordInput;
  db?: AgentExecutionExceptionClient;
}): Promise<AgentExecutionExceptionRecord> {
  return db.agentExecutionException.upsert({
    where: {
      projectId_runId_dedupeKey: {
        projectId: input.projectId,
        runId: input.runId,
        dedupeKey: input.dedupeKey,
      },
    },
    create: {
      projectId: input.projectId,
      runId: input.runId,
      eventId: input.eventId ?? null,
      dedupeKey: input.dedupeKey,
      type: input.type,
      severity: input.severity,
      title: input.title,
      summary: input.summary,
      proposedAction: input.proposedAction ?? null,
      evidence: nullableJson(input.evidence),
      sourceEventIds: input.sourceEventIds,
    },
    // A producer retry must not mutate an operator's terminal decision.
    update: {},
    select: exceptionSelect,
  });
}

export async function listAgentExecutionExceptions({
  projectId,
  runId,
  limit = 100,
  db = prisma,
}: {
  projectId: string;
  runId: string;
  limit?: number;
  db?: AgentExecutionExceptionClient;
}): Promise<AgentExecutionExceptionRecord[]> {
  return db.agentExecutionException.findMany({
    where: { projectId, runId },
    select: exceptionSelect,
    orderBy: [
      { status: "asc" },
      { severity: "desc" },
      { createdAt: "desc" },
      { id: "asc" },
    ],
    take: Math.max(1, Math.min(limit, 100)),
  });
}

export async function resolveAgentExecutionException({
  input,
  actorUserId,
  db = prisma,
}: {
  input: AgentExecutionExceptionResolveInput;
  actorUserId: string;
  db?: AgentExecutionExceptionClient;
}): Promise<ExceptionResolutionResult> {
  const before = await db.agentExecutionException.findFirst({
    where: { id: input.exceptionId, projectId: input.projectId },
    select: exceptionSelect,
  });
  if (!before) return { kind: "not_found" };

  const targetStatus = exceptionDecisionToStatus(input.decision);
  if (before.status !== "OPEN" || before.version !== input.expectedVersion) {
    return { kind: "conflict", current: before };
  }

  const updated = await db.agentExecutionException.updateMany({
    where: {
      id: input.exceptionId,
      projectId: input.projectId,
      status: "OPEN",
      version: input.expectedVersion,
    },
    data: {
      status: targetStatus,
      resolutionReason: input.resolutionReason ?? null,
      resolvedAt: new Date(),
      resolvedByUserId: actorUserId,
      version: { increment: 1 },
    },
  });

  if (updated.count !== 1) {
    const current = await db.agentExecutionException.findFirst({
      where: { id: input.exceptionId, projectId: input.projectId },
      select: exceptionSelect,
    });
    return current ? { kind: "conflict", current } : { kind: "not_found" };
  }

  const after = await db.agentExecutionException.findFirstOrThrow({
    where: { id: input.exceptionId, projectId: input.projectId },
    select: exceptionSelect,
  });
  return { kind: "resolved", before, after };
}
