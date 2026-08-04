import { describe, expect, it, vi } from "vitest";
vi.mock("../../db", () => ({ prisma: {} }));
import { createAgentAction, listAgentActions } from "./actionsRepository";

describe("agent action repository", () => {
  it("uses project-scoped idempotency without overwriting an action", async () => {
    const db = { agentAction: { upsert: vi.fn().mockResolvedValue({ id: "a" }), findMany: vi.fn() }, agentActionAttempt: {} };
    await createAgentAction({ input: { projectId: "p", runId: "r", idempotencyKey: "key", provider: "GMAIL", actionType: "SEND_EMAIL", payload: { subject: "renewal" } }, db: db as never });
    expect(db.agentAction.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { projectId_idempotencyKey: { projectId: "p", idempotencyKey: "key" } }, update: {} }));
  });
  it("scopes run lists to a project", async () => {
    const db = { agentAction: { findMany: vi.fn().mockResolvedValue([]) }, agentActionAttempt: {} };
    await listAgentActions({ projectId: "p", runId: "r", db: db as never });
    expect(db.agentAction.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { projectId: "p", runId: "r" }, take: 100 }));
  });
});
