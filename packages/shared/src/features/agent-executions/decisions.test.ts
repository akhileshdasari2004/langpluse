import { describe, expect, it } from "vitest";
import type { AgentExecutionSourceEvent } from "./types";
import { projectAgentExecution } from "./classification";
import { buildAgentDecisionProjection } from "./decisions";

const startedAt = new Date("2026-07-29T09:30:00.000Z");

const event = (
  id: string,
  metadata: AgentExecutionSourceEvent["metadata"],
): AgentExecutionSourceEvent => ({
  id,
  parentObservationId: "root",
  name: "select-outreach-strategy",
  type: "EVENT",
  level: "DEFAULT",
  statusMessage: null,
  startTime: startedAt,
  endTime: new Date(startedAt.getTime() + 40),
  version: "1.0",
  metadata: {
    "mission_control.event.category": "decision",
    "mission_control.event.confidence": 0.91,
    "mission_control.agent.key": "planner-agent",
    "mission_control.agent.name": "Planner Agent",
    ...metadata,
  },
});

const projection = (decisionEvent: AgentExecutionSourceEvent) =>
  projectAgentExecution({
    trace: {
      id: "run-1",
      projectId: "project-1",
      name: "Enterprise sales email",
      timestamp: startedAt,
      version: "1.0",
      metadata: {
        "mission_control.agent.key": "orchestrator",
        "mission_control.agent.name": "Execution Orchestrator",
      },
    },
    events: [
      event("crm", { "mission_control.event.category": "observation" }),
      decisionEvent,
    ],
  });

describe("buildAgentDecisionProjection", () => {
  it("projects explicit selected and rejected paths without fabricating evidence", () => {
    const result = buildAgentDecisionProjection(
      projection(
        event("decision", {
          "mission_control.dependencies": '["crm"]',
          "mission_control.reasoning.summary":
            "Verified account evidence supports value-led renewal outreach.",
          "mission_control.decision.rejected_alternatives": JSON.stringify([
            "Legacy discount-led label",
          ]),
          "mission_control.decision.alternatives": JSON.stringify([
            {
              id: "value-led",
              title: "Value-led renewal",
              disposition: "selected",
              reason: "Verified account priorities are current.",
              confidence: 0.91,
              risk: "low",
              executionImpact: "positive",
              dependencies: ["crm"],
            },
            {
              id: "discount-led",
              title: "Discount-led outreach",
              disposition: "rejected",
              reason: "No approved concession exists.",
              confidence: 0.94,
              risk: "high",
              executionImpact: "negative",
              dependencies: ["crm"],
            },
          ]),
        }),
      ),
    );

    expect(result).toMatchObject({
      selectedCount: 1,
      rejectedCount: 1,
      highRiskCount: 0,
      averageConfidence: 0.91,
    });
    expect(result.decisions[0]).toMatchObject({
      id: "decision",
      selectedDecision: "Value-led renewal",
      reason: "Verified account evidence supports value-led renewal outreach.",
      dependencyIds: ["crm"],
      provenance: "EXPLICIT",
      agent: { key: "planner-agent", name: "Planner Agent" },
    });
    expect(result.decisions[0].alternatives).toEqual([
      expect.objectContaining({
        id: "decision:value-led",
        disposition: "SELECTED",
        risk: "LOW",
        executionImpact: "POSITIVE",
        dependencyIds: ["crm"],
      }),
      expect.objectContaining({
        id: "decision:discount-led",
        disposition: "REJECTED",
        risk: "HIGH",
        executionImpact: "NEGATIVE",
      }),
    ]);
  });

  it("keeps legacy rejected alternatives but labels missing selection and rationale", () => {
    const result = buildAgentDecisionProjection(
      projection(
        event("legacy-decision", {
          "mission_control.decision.rejected_alternatives": JSON.stringify([
            "Generic check-in",
          ]),
        }),
      ),
    );

    expect(result.decisions[0]).toMatchObject({
      selectedDecision: null,
      risk: "UNKNOWN",
      executionImpact: "UNKNOWN",
      alternatives: [
        {
          title: "Generic check-in",
          disposition: "REJECTED",
          reason: null,
          provenance: "EXPLICIT",
        },
      ],
    });
  });

  it("ignores malformed alternatives and unresolved dependency ids", () => {
    const result = buildAgentDecisionProjection(
      projection(
        event("decision", {
          "mission_control.dependencies": '["missing"]',
          "mission_control.decision.alternatives": JSON.stringify([
            { id: "invalid", disposition: "selected" },
            {
              id: "valid",
              title: "Evidence-backed path",
              disposition: "selected",
              risk: "low",
              executionImpact: "positive",
              dependencies: ["missing"],
            },
          ]),
        }),
      ),
    );

    expect(result.decisions[0].dependencyIds).toEqual([]);
    expect(result.decisions[0].alternatives).toEqual([
      expect.objectContaining({
        id: "decision:valid",
        dependencyIds: [],
      }),
    ]);
  });
});
