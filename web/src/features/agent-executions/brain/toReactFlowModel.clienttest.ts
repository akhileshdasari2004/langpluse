import type {
  AgentBrainGraph,
  AgentBrainNode,
  AgentCommunicationGraph,
} from "@langfuse/shared";
import { Position } from "@xyflow/react";
import {
  AGENT_NODE_HEIGHT,
  AGENT_NODE_WIDTH,
  BRAIN_NODE_HEIGHT,
  BRAIN_NODE_WIDTH,
  toAgentReactFlowModel,
  toBrainReactFlowModel,
} from "./toReactFlowModel";

const startedAt = new Date("2026-07-29T00:00:00.000Z");

const brainNode = (
  id: string,
  sequence: number,
  kind: AgentBrainNode["kind"],
): AgentBrainNode => ({
  id,
  event: {
    id,
    parentEventId: null,
    category: kind === "GOAL" ? "TASK_RECEIVED" : "COMPLETION",
    categoryProvenance: "EXPLICIT",
    confidence: 0.97,
    name: id,
    observationType: "SPAN",
    level: "DEFAULT",
    status: "COMPLETED",
    statusMessage: null,
    startedAt: new Date(startedAt.getTime() + sequence * 1_000),
    endedAt: new Date(startedAt.getTime() + sequence * 1_000 + 250),
    latencySeconds: 0.25,
    apiLatencyMs: null,
    toolUsed: null,
    reasoningSummary: null,
    agent: {
      key: "orchestrator",
      name: "Execution Orchestrator",
      version: "4.0",
      provenance: "EXPLICIT",
    },
    metadata: {},
  },
  kind,
  title: id,
  sequence,
  reasoning: null,
  promptSummary: null,
  toolSelectionReason: null,
  rejectedAlternatives: [],
  memoryUsed: [],
  tokenUsage: { input: null, output: null, total: null },
  executionDurationSeconds: 0.25,
  dependencyIds: sequence === 0 ? [] : ["goal"],
  dependencyProvenance: sequence === 0 ? "INFERRED" : "EXPLICIT",
  agent: {
    key: "orchestrator",
    name: "Execution Orchestrator",
    version: "4.0",
    provenance: "EXPLICIT",
  },
});

describe("Agent Brain React Flow projection", () => {
  it("reuses ELK layout while preserving semantic nodes and animated edges", async () => {
    const graph: AgentBrainGraph = {
      runId: "run-1",
      status: "RUNNING",
      nodes: [
        brainNode("goal", 0, "GOAL"),
        brainNode("complete", 1, "COMPLETION"),
      ],
      edges: [
        {
          id: "goal->complete",
          source: "goal",
          target: "complete",
          kind: "DEPENDENCY",
          provenance: "EXPLICIT",
          animated: true,
        },
      ],
    };

    const model = await toBrainReactFlowModel(graph);

    expect(model.tooLarge).toBe(false);
    expect(model.nodes).toHaveLength(2);
    expect(model.nodes[0]).toMatchObject({
      type: "brain",
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      style: { width: BRAIN_NODE_WIDTH, height: BRAIN_NODE_HEIGHT },
      draggable: false,
      connectable: false,
    });
    expect(model.nodes[1].position.y).toBeGreaterThan(
      model.nodes[0].position.y,
    );
    expect(model.edges[0]).toMatchObject({
      source: "goal",
      target: "complete",
      type: "smoothstep",
      animated: true,
      className: "mission-control-brain-edge",
      data: { kind: "DEPENDENCY", provenance: "EXPLICIT" },
    });
  });

  it("renders the multi-agent handoff map from left to right", async () => {
    const graph: AgentCommunicationGraph = {
      nodes: [
        {
          id: "planner",
          agent: {
            key: "planner",
            name: "Planner Agent",
            version: "4.0",
            provenance: "EXPLICIT",
          },
          eventIds: ["plan"],
          eventCount: 1,
          averageConfidence: 0.96,
          totalDurationSeconds: 0.4,
          status: "SUCCEEDED",
        },
        {
          id: "tool-agent",
          agent: {
            key: "tool-agent",
            name: "Tool Agent",
            version: "4.0",
            provenance: "EXPLICIT",
          },
          eventIds: ["tool"],
          eventCount: 1,
          averageConfidence: 0.94,
          totalDurationSeconds: 0.8,
          status: "SUCCEEDED",
        },
      ],
      edges: [
        {
          id: "planner->tool-agent",
          source: "planner",
          target: "tool-agent",
          eventIds: ["tool"],
          handoffCount: 1,
          summaries: ["Planner delegated verified account retrieval."],
        },
      ],
    };

    const model = await toAgentReactFlowModel(graph);

    expect(model.nodes[0]).toMatchObject({
      type: "agent",
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: { width: AGENT_NODE_WIDTH, height: AGENT_NODE_HEIGHT },
    });
    expect(model.nodes[1].position.x).toBeGreaterThan(
      model.nodes[0].position.x,
    );
    expect(model.edges[0]).toMatchObject({
      animated: true,
      label: "1 handoff",
      className: "mission-control-handoff-edge",
    });
  });
});
