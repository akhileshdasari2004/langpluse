import { describe, expect, it } from "vitest";
import type { AgentExecutionSourceEvent } from "./types";
import { projectAgentExecution } from "./classification";
import { buildAgentBrainGraph, buildAgentCommunicationGraph } from "./brain";

const event = (
  id: string,
  category: string,
  offsetSeconds: number,
  metadata: Record<string, string | number> = {},
): AgentExecutionSourceEvent => ({
  id,
  parentObservationId: "goal",
  name: id,
  type: category === "tool_call" ? "TOOL" : "SPAN",
  level: "DEFAULT",
  statusMessage: null,
  startTime: new Date(Date.UTC(2026, 6, 29, 0, 0, offsetSeconds)),
  endTime: new Date(Date.UTC(2026, 6, 29, 0, 0, offsetSeconds + 1)),
  version: "1.0",
  metadata: {
    "mission_control.event.category": category,
    ...metadata,
  },
});

const projection = projectAgentExecution({
  trace: {
    id: "run-1",
    projectId: "project-1",
    name: "Enterprise sales email",
    timestamp: new Date("2026-07-29T00:00:00.000Z"),
    version: "1.0",
    metadata: {
      "mission_control.agent.key": "orchestrator",
      "mission_control.agent.name": "Orchestrator",
    },
  },
  events: [
    event("goal", "task_received", 0, {
      "mission_control.brain.kind": "goal",
    }),
    event("plan", "planning", 1, {
      "mission_control.dependencies": '["goal"]',
      "mission_control.prompt.summary": "Plan verified renewal outreach.",
    }),
    event("decision", "decision", 2, {
      "mission_control.dependencies": '["plan"]',
      "mission_control.reasoning.summary":
        "CRM evidence is required before selecting an outreach strategy.",
      "mission_control.decision.rejected_alternatives":
        '["generic check-in","discount-led outreach"]',
      "mission_control.agent.key": "planner",
      "mission_control.agent.name": "Planner Agent",
    }),
    event("tool", "tool_call", 3, {
      "mission_control.dependencies": '["decision"]',
      "mission_control.tool.name": "Salesforce CRM",
      "mission_control.tool.selection_reason":
        "CRM is the authoritative account-health source.",
      "mission_control.memory.used":
        '["Northstar renewal preferences","EU residency interest"]',
      "mission_control.tokens.input": 180,
      "mission_control.tokens.output": 42,
      "mission_control.agent.key": "tool-agent",
      "mission_control.agent.name": "Tool Agent",
      "mission_control.handoff.summary":
        "Planner delegated verified account retrieval.",
    }),
    event("updated-plan", "planning", 4, {
      "mission_control.dependencies": '["tool"]',
    }),
    event("complete", "completion", 5, {
      "mission_control.dependencies": '["updated-plan"]',
    }),
  ],
});

describe("buildAgentBrainGraph", () => {
  it("builds the explicit goal-to-completion dependency path", () => {
    const graph = buildAgentBrainGraph(projection);

    expect(graph.nodes.map((node) => node.kind)).toEqual([
      "GOAL",
      "PLAN",
      "DECISION",
      "TOOL",
      "UPDATED_PLAN",
      "COMPLETION",
    ]);
    expect(graph.edges.map(({ source, target }) => [source, target])).toEqual([
      ["goal", "plan"],
      ["plan", "decision"],
      ["decision", "tool"],
      ["tool", "updated-plan"],
      ["updated-plan", "complete"],
    ]);
  });

  it("exposes only instrumented reasoning, evidence, usage, and dependencies", () => {
    const graph = buildAgentBrainGraph(projection);
    const tool = graph.nodes.find((node) => node.id === "tool");
    const goal = graph.nodes.find((node) => node.id === "goal");

    expect(tool).toMatchObject({
      toolSelectionReason: "CRM is the authoritative account-health source.",
      memoryUsed: ["Northstar renewal preferences", "EU residency interest"],
      tokenUsage: { input: 180, output: 42, total: 222 },
      dependencyIds: ["decision"],
      dependencyProvenance: "EXPLICIT",
    });
    expect(goal?.reasoning).toBeNull();
  });

  it("falls back to deterministic sequence edges for legacy telemetry", () => {
    const legacy = {
      ...projection,
      events: projection.events.map((projectedEvent) => ({
        ...projectedEvent,
        metadata: {},
      })),
    };
    const graph = buildAgentBrainGraph(legacy);

    expect(graph.edges).toHaveLength(graph.nodes.length - 1);
    expect(graph.edges.every((edge) => edge.provenance === "INFERRED")).toBe(
      true,
    );
  });
});

describe("buildAgentCommunicationGraph", () => {
  it("aggregates cross-agent dependencies as auditable handoffs", () => {
    const communication = buildAgentCommunicationGraph(
      buildAgentBrainGraph(projection),
    );

    expect(communication.nodes.map((node) => node.id).sort()).toEqual([
      "orchestrator",
      "planner",
      "tool-agent",
    ]);
    expect(communication.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "planner",
          target: "tool-agent",
          handoffCount: 1,
          summaries: ["Planner delegated verified account retrieval."],
        }),
      ]),
    );
  });
});
