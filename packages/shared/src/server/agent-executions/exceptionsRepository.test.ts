import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({
  Prisma: { JsonNull: "JsonNull" },
  prisma: {},
}));

import {
  recordAgentExecutionException,
  resolveAgentExecutionException,
} from "./exceptionsRepository";

const record = {
  id: "exception-1",
  projectId: "project-1",
  runId: "run-1",
  eventId: "approval",
  dedupeKey: "customer-policy-conflict",
  type: "CUSTOMER_POLICY_CONFLICT",
  severity: "HIGH",
  status: "OPEN",
  title: "Approval required",
  summary: "A policy decision is required.",
  proposedAction: "Send the approved renewal response.",
  evidence: { approval_policy: "manager_required" },
  sourceEventIds: ["decision", "approval"],
  resolutionReason: null,
  resolvedAt: null,
  resolvedByUserId: null,
  version: 1,
  createdAt: new Date("2026-08-03T00:00:00.000Z"),
  updatedAt: new Date("2026-08-03T00:00:00.000Z"),
};

function mockDb() {
  return {
    agentExecutionException: {
      upsert: vi.fn().mockResolvedValue(record),
      findMany: vi.fn().mockResolvedValue([record]),
      findFirst: vi.fn().mockResolvedValue(record),
      findFirstOrThrow: vi
        .fn()
        .mockResolvedValue({ ...record, status: "APPROVED", version: 2 }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

describe("agent execution exception repository", () => {
  it("uses a project-scoped dedupe key without overwriting terminal decisions", async () => {
    const db = mockDb();
    await recordAgentExecutionException({
      input: {
        projectId: "project-1",
        runId: "run-1",
        dedupeKey: "customer-policy-conflict",
        type: "CUSTOMER_POLICY_CONFLICT",
        severity: "HIGH",
        title: "Approval required",
        summary: "A policy decision is required.",
        sourceEventIds: [],
      },
      db: db as never,
    });

    expect(db.agentExecutionException.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId_runId_dedupeKey: {
            projectId: "project-1",
            runId: "run-1",
            dedupeKey: "customer-policy-conflict",
          },
        },
        update: {},
      }),
    );
  });

  it("uses a versioned project-scoped update for an operator decision", async () => {
    const db = mockDb();
    const result = await resolveAgentExecutionException({
      input: {
        projectId: "project-1",
        exceptionId: "exception-1",
        expectedVersion: 1,
        decision: "APPROVE",
      },
      actorUserId: "user-1",
      db: db as never,
    });

    expect(result.kind).toBe("resolved");
    expect(db.agentExecutionException.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: "project-1",
          status: "OPEN",
          version: 1,
        }),
        data: expect.objectContaining({
          status: "APPROVED",
          resolvedByUserId: "user-1",
          version: { increment: 1 },
        }),
      }),
    );
  });

  it("returns a conflict without a write when the exception is no longer open", async () => {
    const db = mockDb();
    db.agentExecutionException.findFirst.mockResolvedValue({
      ...record,
      status: "ESCALATED",
      version: 2,
    });

    const result = await resolveAgentExecutionException({
      input: {
        projectId: "project-1",
        exceptionId: "exception-1",
        expectedVersion: 1,
        decision: "APPROVE",
      },
      actorUserId: "user-1",
      db: db as never,
    });

    expect(result.kind).toBe("conflict");
    expect(db.agentExecutionException.updateMany).not.toHaveBeenCalled();
  });
});
