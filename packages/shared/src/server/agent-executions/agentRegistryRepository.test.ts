import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({
  Prisma: { JsonNull: "JsonNull" },
  prisma: {},
}));

import {
  getAgentRegistryEntry,
  listAgentRegistryEntries,
  upsertAgentRegistryEntry,
} from "./agentRegistryRepository";

const record = {
  id: "agent-1",
  projectId: "project-1",
  stableKey: "support-agent",
  name: "Support Agent",
  description: null,
  version: "1.0",
  owner: null,
  team: null,
  metadata: null,
  firstSeenAt: null,
  lastSeenAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  createdBy: "user-1",
  updatedBy: "user-1",
};

function mockDb() {
  return {
    agent: {
      findFirst: vi.fn().mockResolvedValue(record),
      findMany: vi.fn().mockResolvedValue([record]),
      upsert: vi.fn().mockResolvedValue(record),
    },
  };
}

describe("agentRegistryRepository tenant isolation", () => {
  it("scopes a detail lookup by project and agent id", async () => {
    const db = mockDb();
    await getAgentRegistryEntry({
      projectId: "project-1",
      agentId: "agent-1",
      db: db as never,
    });

    expect(db.agent.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "agent-1", projectId: "project-1" },
      }),
    );
  });

  it("scopes and bounds registry lists", async () => {
    const db = mockDb();
    await listAgentRegistryEntries({
      projectId: "project-1",
      limit: 1_000,
      db: db as never,
    });

    expect(db.agent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: "project-1" },
        take: 100,
      }),
    );
  });

  it("uses a project-scoped compound key for upserts", async () => {
    const db = mockDb();
    await upsertAgentRegistryEntry({
      input: {
        projectId: "project-1",
        stableKey: "support-agent",
        name: "Support Agent",
        metadata: null,
      },
      actorUserId: "user-1",
      db: db as never,
    });

    expect(db.agent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId_stableKey: {
            projectId: "project-1",
            stableKey: "support-agent",
          },
        },
        create: expect.objectContaining({
          projectId: "project-1",
          createdBy: "user-1",
        }),
        update: expect.objectContaining({ updatedBy: "user-1" }),
      }),
    );
  });
});
