import { createHash } from "crypto";
import { Prisma, type PrismaClient, prisma } from "../../db";

type Db = Pick<PrismaClient, "agentAction" | "agentActionAttempt">;

const select = {
  id: true, projectId: true, runId: true, idempotencyKey: true, provider: true,
  actionType: true, payload: true, payloadHash: true, status: true, retryCount: true,
  externalReference: true, failureCode: true, failureSummary: true, version: true,
  approvedAt: true, approvedByUserId: true, createdAt: true, updatedAt: true,
} satisfies Prisma.AgentActionSelect;

export type AgentActionRecord = Prisma.AgentActionGetPayload<{ select: typeof select }>;

function hashPayload(payload: Prisma.InputJsonValue) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function createAgentAction({ input, db = prisma }: {
  input: { projectId: string; runId: string; idempotencyKey: string; provider: "GMAIL" | "SALESFORCE" | "HUBSPOT" | "PRINTAVO"; actionType: string; payload: Prisma.InputJsonValue };
  db?: Db;
}): Promise<AgentActionRecord> {
  return db.agentAction.upsert({
    where: { projectId_idempotencyKey: { projectId: input.projectId, idempotencyKey: input.idempotencyKey } },
    create: { ...input, payloadHash: hashPayload(input.payload) },
    update: {}, select,
  });
}

export async function listAgentActions({ projectId, runId, db = prisma }: { projectId: string; runId: string; db?: Db }): Promise<AgentActionRecord[]> {
  return db.agentAction.findMany({ where: { projectId, runId }, select, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100 });
}

export async function recordAgentActionAttempt({ actionId, attempt, outcome, summary, db = prisma }: { actionId: string; attempt: number; outcome: string; summary?: string; db?: Db }) {
  return db.agentActionAttempt.upsert({ where: { actionId_attempt: { actionId, attempt } }, create: { actionId, attempt, outcome, summary: summary?.slice(0, 1000) }, update: {} });
}
