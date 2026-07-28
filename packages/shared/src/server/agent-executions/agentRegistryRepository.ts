import type { Agent, PrismaClient } from "../../db";
import { Prisma, prisma } from "../../db";
import type { AgentRegistryUpsert } from "../../features/agent-executions";

type AgentRegistryClient = Pick<PrismaClient, "agent">;

const agentRegistrySelect = {
  id: true,
  projectId: true,
  stableKey: true,
  name: true,
  description: true,
  version: true,
  owner: true,
  team: true,
  metadata: true,
  firstSeenAt: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
} satisfies Prisma.AgentSelect;

export type AgentRegistryRecord = Pick<Agent, keyof typeof agentRegistrySelect>;

export async function getAgentRegistryEntry({
  projectId,
  agentId,
  db = prisma,
}: {
  projectId: string;
  agentId: string;
  db?: AgentRegistryClient;
}): Promise<AgentRegistryRecord | null> {
  return db.agent.findFirst({
    where: { id: agentId, projectId },
    select: agentRegistrySelect,
  });
}

export async function listAgentRegistryEntries({
  projectId,
  limit = 50,
  cursor,
  db = prisma,
}: {
  projectId: string;
  limit?: number;
  cursor?: string;
  db?: AgentRegistryClient;
}): Promise<AgentRegistryRecord[]> {
  const boundedLimit = Math.max(1, Math.min(limit, 100));
  return db.agent.findMany({
    where: { projectId },
    select: agentRegistrySelect,
    orderBy: [{ lastSeenAt: "desc" }, { id: "asc" }],
    take: boundedLimit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
}

export async function upsertAgentRegistryEntry({
  input,
  actorUserId,
  db = prisma,
}: {
  input: AgentRegistryUpsert;
  actorUserId: string;
  db?: AgentRegistryClient;
}): Promise<AgentRegistryRecord> {
  const mutableFields = {
    name: input.name,
    description: input.description,
    version: input.version,
    owner: input.owner,
    team: input.team,
    metadata:
      input.metadata === undefined
        ? undefined
        : input.metadata === null
          ? Prisma.JsonNull
          : input.metadata,
    firstSeenAt: input.firstSeenAt,
    lastSeenAt: input.lastSeenAt,
    updatedBy: actorUserId,
  };

  return db.agent.upsert({
    where: {
      projectId_stableKey: {
        projectId: input.projectId,
        stableKey: input.stableKey,
      },
    },
    create: {
      projectId: input.projectId,
      stableKey: input.stableKey,
      createdBy: actorUserId,
      ...mutableFields,
    },
    update: mutableFields,
    select: agentRegistrySelect,
  });
}
