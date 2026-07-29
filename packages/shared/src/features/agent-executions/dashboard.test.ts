import { describe, expect, it } from "vitest";
import {
  buildMissionControlDashboardSnapshot,
  MissionControlDashboardInputSchema,
} from "./dashboard";

describe("MissionControlDashboardInputSchema", () => {
  it("accepts a bounded project time range", () => {
    expect(
      MissionControlDashboardInputSchema.safeParse({
        projectId: "project-1",
        from: new Date("2026-07-27T00:00:00.000Z"),
        to: new Date("2026-07-28T00:00:00.000Z"),
      }).success,
    ).toBe(true);
  });

  it("rejects inverted and overlong time ranges", () => {
    const inverted = MissionControlDashboardInputSchema.safeParse({
      projectId: "project-1",
      from: new Date("2026-07-28T00:00:00.000Z"),
      to: new Date("2026-07-27T00:00:00.000Z"),
    });
    const overlong = MissionControlDashboardInputSchema.safeParse({
      projectId: "project-1",
      from: new Date("2025-06-01T00:00:00.000Z"),
      to: new Date("2026-07-28T00:00:00.000Z"),
    });

    expect(inverted.success).toBe(false);
    expect(overlong.success).toBe(false);
  });
});

describe("buildMissionControlDashboardSnapshot", () => {
  it("builds a deterministic, fully populated sales-email snapshot", () => {
    const now = new Date("2026-07-28T12:00:00.000Z");
    const snapshot = buildMissionControlDashboardSnapshot({
      projectId: "project-1",
      from: new Date("2026-07-27T12:00:00.000Z"),
      to: now,
      now,
    });

    expect(snapshot.workflow.name).toBe("Enterprise Sales Email");
    expect(Object.keys(snapshot.metrics)).toHaveLength(9);
    expect(snapshot.executionTrend).toHaveLength(24);
    expect(snapshot.recentExecutions.length).toBeGreaterThan(0);
    expect(snapshot.systemHealth.length).toBeGreaterThan(0);
    expect(snapshot.activity.length).toBeGreaterThan(0);
    expect(
      snapshot.recentExecutions.every(
        (execution) => execution.account === "Northstar Logistics",
      ),
    ).toBe(true);
    expect(
      snapshot.activity.every((activity) =>
        activity.summary.includes("Northstar"),
      ),
    ).toBe(true);
    expect(snapshot).toEqual(
      buildMissionControlDashboardSnapshot({
        projectId: "project-1",
        from: new Date("2026-07-27T12:00:00.000Z"),
        to: now,
        now,
      }),
    );
  });
});
