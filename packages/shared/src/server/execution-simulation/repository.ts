import { Prisma, type PrismaClient, prisma } from "../../db";
import {
  SimulationExecutionResultSchema,
  SimulationRunStatus,
  SimulationScenarioDefinitionSchema,
  type SimulationExecutionResult,
  type SimulationRunStatus as SimulationRunStatusType,
  type SimulationScenarioDefinition,
} from "../../features/execution-simulation";

type SimulationDbClient = Pick<
  PrismaClient,
  "simulationScenario" | "simulationRun"
>;

const scenarioSelect = {
  id: true,
  projectId: true,
  sourceRunId: true,
  name: true,
  definition: true,
  definitionVersion: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SimulationScenarioSelect;

const runSelect = {
  id: true,
  projectId: true,
  scenarioId: true,
  status: true,
  deterministicSeed: true,
  model: true,
  result: true,
  error: true,
  cancelRequestedAt: true,
  startedAt: true,
  finishedAt: true,
  triggeredByUserId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SimulationRunSelect;

export type SimulationScenarioRecord = Prisma.SimulationScenarioGetPayload<{
  select: typeof scenarioSelect;
}>;

export type SimulationRunRecord = Prisma.SimulationRunGetPayload<{
  select: typeof runSelect;
}>;

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function parseScenarioDefinition(
  value: unknown,
): SimulationScenarioDefinition | null {
  const result = SimulationScenarioDefinitionSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function parseSimulationResult(
  value: unknown,
): SimulationExecutionResult | null {
  const result = SimulationExecutionResultSchema.safeParse(value);
  return result.success ? result.data : null;
}

export async function createSimulationScenario({
  projectId,
  name,
  definition,
  actorUserId,
  db = prisma,
}: {
  projectId: string;
  name: string;
  definition: SimulationScenarioDefinition;
  actorUserId: string;
  db?: SimulationDbClient;
}): Promise<SimulationScenarioRecord> {
  return db.simulationScenario.create({
    data: {
      projectId,
      sourceRunId: definition.sourceRunId,
      name,
      definition: toJson(definition),
      createdByUserId: actorUserId,
    },
    select: scenarioSelect,
  });
}

export async function getSimulationScenario({
  projectId,
  scenarioId,
  db = prisma,
}: {
  projectId: string;
  scenarioId: string;
  db?: SimulationDbClient;
}): Promise<SimulationScenarioRecord | null> {
  return db.simulationScenario.findFirst({
    where: { id: scenarioId, projectId },
    select: scenarioSelect,
  });
}

export async function listSimulationScenarios({
  projectId,
  sourceRunId,
  limit = 50,
  db = prisma,
}: {
  projectId: string;
  sourceRunId?: string;
  limit?: number;
  db?: SimulationDbClient;
}): Promise<SimulationScenarioRecord[]> {
  return db.simulationScenario.findMany({
    where: { projectId, ...(sourceRunId ? { sourceRunId } : {}) },
    select: scenarioSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: Math.max(1, Math.min(limit, 100)),
  });
}

export async function createSimulationRun({
  projectId,
  scenarioId,
  deterministicSeed,
  model,
  actorUserId,
  db = prisma,
}: {
  projectId: string;
  scenarioId: string;
  deterministicSeed: string;
  model: string | null;
  actorUserId: string;
  db?: SimulationDbClient;
}): Promise<SimulationRunRecord> {
  return db.simulationRun.create({
    data: {
      projectId,
      scenarioId,
      status: "QUEUED",
      deterministicSeed,
      model,
      triggeredByUserId: actorUserId,
    },
    select: runSelect,
  });
}

export async function getSimulationRun({
  projectId,
  simulationRunId,
  db = prisma,
}: {
  projectId: string;
  simulationRunId: string;
  db?: SimulationDbClient;
}): Promise<SimulationRunRecord | null> {
  return db.simulationRun.findFirst({
    where: { id: simulationRunId, projectId },
    select: runSelect,
  });
}

export async function listSimulationRuns({
  projectId,
  scenarioId,
  limit = 50,
  db = prisma,
}: {
  projectId: string;
  scenarioId?: string;
  limit?: number;
  db?: SimulationDbClient;
}): Promise<SimulationRunRecord[]> {
  return db.simulationRun.findMany({
    where: { projectId, ...(scenarioId ? { scenarioId } : {}) },
    select: runSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: Math.max(1, Math.min(limit, 100)),
  });
}

export async function claimSimulationRun({
  projectId,
  simulationRunId,
  db = prisma,
}: {
  projectId: string;
  simulationRunId: string;
  db?: SimulationDbClient;
}): Promise<SimulationRunRecord | null> {
  const updated = await db.simulationRun.updateMany({
    where: { id: simulationRunId, projectId, status: "QUEUED" },
    data: { status: "RUNNING", startedAt: new Date() },
  });
  return updated.count > 0
    ? getSimulationRun({ projectId, simulationRunId, db })
    : null;
}

export async function completeSimulationRun({
  projectId,
  simulationRunId,
  result,
  status,
  db = prisma,
}: {
  projectId: string;
  simulationRunId: string;
  result: SimulationExecutionResult;
  status: Extract<SimulationRunStatusType, "SUCCEEDED" | "FAILED">;
  db?: SimulationDbClient;
}): Promise<SimulationRunRecord> {
  return db.simulationRun.update({
    where: { id: simulationRunId, projectId },
    data: { status, result: toJson(result), finishedAt: new Date() },
    select: runSelect,
  });
}

export async function failSimulationRun({
  projectId,
  simulationRunId,
  error,
  db = prisma,
}: {
  projectId: string;
  simulationRunId: string;
  error: string;
  db?: SimulationDbClient;
}): Promise<SimulationRunRecord> {
  return db.simulationRun.update({
    where: { id: simulationRunId, projectId },
    data: {
      status: SimulationRunStatus.enum.FAILED,
      error: error.slice(0, 2_000),
      finishedAt: new Date(),
    },
    select: runSelect,
  });
}

export async function requestSimulationRunCancellation({
  projectId,
  simulationRunId,
  db = prisma,
}: {
  projectId: string;
  simulationRunId: string;
  db?: SimulationDbClient;
}): Promise<SimulationRunRecord | null> {
  const run = await getSimulationRun({ projectId, simulationRunId, db });
  if (!run || ["SUCCEEDED", "FAILED", "CANCELLED"].includes(run.status)) {
    return null;
  }
  return db.simulationRun.update({
    where: { id: simulationRunId, projectId },
    data: { cancelRequestedAt: new Date() },
    select: runSelect,
  });
}

export async function cancelSimulationRun({
  projectId,
  simulationRunId,
  db = prisma,
}: {
  projectId: string;
  simulationRunId: string;
  db?: SimulationDbClient;
}): Promise<SimulationRunRecord> {
  return db.simulationRun.update({
    where: { id: simulationRunId, projectId },
    data: { status: "CANCELLED", finishedAt: new Date() },
    select: runSelect,
  });
}
