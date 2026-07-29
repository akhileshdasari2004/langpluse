import { describe, expect, it } from "vitest";
import { RunStreamMessageSchema, RunStreamQuerySchema } from "./schema";

describe("run stream schemas", () => {
  it("rejects malformed frames without throwing", () => {
    expect(
      RunStreamMessageSchema.safeParse({
        type: "append",
        cursor: "",
        event: { id: "incomplete" },
      }).success,
    ).toBe(false);
    expect(
      RunStreamMessageSchema.safeParse({
        type: "heartbeat",
        cursor: "x".repeat(501),
        serverTime: "not-a-date",
        queryLatencyMs: -1,
      }).success,
    ).toBe(false);
  });

  it("accepts only bounded route inputs and the explicit demo flag", () => {
    const parsed = RunStreamQuerySchema.safeParse({
      projectId: "project-1",
      runId: "run-1",
      timestamp: "2026-07-29T00:00:00.000Z",
      demo: "1",
    });

    expect(parsed.success && parsed.data.demo).toBe(true);
    expect(
      RunStreamQuerySchema.safeParse({
        projectId: "project-1",
        runId: "run-1",
        demo: "true",
      }).success,
    ).toBe(false);
  });
});
