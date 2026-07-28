import { describe, expect, it } from "vitest";
import { buildMissionControlDashboardSnapshot } from "@langfuse/shared";
import { prepareExecutionTrend, prepareToolUsage } from "./dashboard-model";

const snapshot = buildMissionControlDashboardSnapshot({
  projectId: "project-1",
  from: new Date("2026-07-27T12:00:00.000Z"),
  to: new Date("2026-07-28T12:00:00.000Z"),
  now: new Date("2026-07-28T12:00:00.000Z"),
});

describe("Mission Control dashboard model", () => {
  it("prepares three honest execution series per hour", () => {
    const points = prepareExecutionTrend(snapshot);
    expect(points).toHaveLength(72);
    expect(new Set(points.map((point) => point.dimension))).toEqual(
      new Set(["Successful", "Failed", "Running"]),
    );
  });

  it("prepares ranked tool usage without changing source order", () => {
    expect(prepareToolUsage(snapshot)[0]).toMatchObject({
      dimension: "Salesforce CRM",
      metric: snapshot.topUsedTools[0].calls,
    });
  });
});
