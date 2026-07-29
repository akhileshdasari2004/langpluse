import { describe, expect, it } from "vitest";
import type { AgentExecutionProjection } from "../agent-executions/schema";
import { compileSimulationScenario } from "./scenarioCompiler";

const baseline: AgentExecutionProjection = {
  id: "run-001",
  traceId: "trace-001",
  projectId: "project-001",
  name: "Enterprise renewal outreach",
  status: "SUCCEEDED",
  startedAt: new Date("2026-07-29T08:00:00.000Z"),
  endedAt: new Date("2026-07-29T08:00:03.000Z"),
  latencySeconds: 3,
  agent: {
    key: "planner",
    name: "Planner Agent",
    version: "2026.07",
    provenance: "EXPLICIT",
  },
  events: [
    {
      id: "crm",
      parentEventId: null,
      category: "TOOL_CALL",
      categoryProvenance: "EXPLICIT",
      confidence: 0.98,
      name: "salesforce.get-account",
      observationType: "TOOL",
      level: "DEFAULT",
      status: "COMPLETED",
      statusMessage: null,
      startedAt: new Date("2026-07-29T08:00:01.000Z"),
      endedAt: new Date("2026-07-29T08:00:01.200Z"),
      latencySeconds: 0.2,
      apiLatencyMs: 200,
      toolUsed: "Salesforce CRM",
      reasoningSummary: null,
      agent: {
        key: "tool",
        name: "Tool Agent",
        version: null,
        provenance: "EXPLICIT",
      },
      metadata: {},
    },
    {
      id: "memory",
      parentEventId: null,
      category: "MEMORY_RETRIEVAL",
      categoryProvenance: "EXPLICIT",
      confidence: 0.96,
      name: "retrieve-memory",
      observationType: "RETRIEVER",
      level: "DEFAULT",
      status: "COMPLETED",
      statusMessage: null,
      startedAt: new Date("2026-07-29T08:00:01.300Z"),
      endedAt: new Date("2026-07-29T08:00:01.600Z"),
      latencySeconds: 0.3,
      apiLatencyMs: null,
      toolUsed: null,
      reasoningSummary: null,
      agent: null,
      metadata: {},
    },
  ],
};

describe("compileSimulationScenario", () => {
  it("creates a deterministic, isolated CRM-offline reasoning path", () => {
    const input = {
      baseline,
      scenario: {
        sourceRunId: baseline.id,
        conditions: [{ type: "CRM_OFFLINE" as const }],
      },
      seed: "simulation-001",
    };

    const first = compileSimulationScenario(input);
    const second = compileSimulationScenario(input);

    expect(first).toEqual(second);
    expect(first.reasoningOrigin).toBe("FIXTURE_POLICY");
    expect(first.simulatedRun.status).toBe("FAILED");
    expect(
      first.simulatedRun.events.find((event) => event.id === "crm"),
    ).toMatchObject({
      category: "FAILURE",
      status: "FAILED",
    });
    expect(first.comparison.addedReasoningEventIds).toHaveLength(1);
    expect(baseline.events[0].status).toBe("COMPLETED");
  });

  it("handles every supported condition without invoking external tools", () => {
    const result = compileSimulationScenario({
      baseline,
      scenario: {
        sourceRunId: baseline.id,
        conditions: [
          { type: "SLACK_FAILURE" },
          { type: "ERP_TIMEOUT" },
          { type: "MEMORY_MISSING" },
          { type: "CUSTOMER_REPLY", customerReplyIntent: "NEGOTIATION" },
          { type: "TOOL_FAILURE" },
          { type: "RATE_LIMIT" },
          { type: "DIFFERENT_MODEL", model: "Claude 4.1 Opus" },
        ],
      },
      seed: "simulation-all-conditions",
    });

    expect(result.simulatedRun.events).toHaveLength(baseline.events.length + 8);
    expect(result.comparison.addedReasoningEventIds).toHaveLength(7);
    expect(result.simulatedRun.events.at(-1)?.metadata).toMatchObject({
      "mission_control.simulation.is_simulated": true,
      "mission_control.simulation.reasoning_origin": "fixture_policy",
    });
  });
});
