import type {
  AgentBrainGraph,
  AgentCommunicationGraph,
} from "@langfuse/shared";
import { MarkerType, Position } from "@xyflow/react";
import { computeGraphLayout } from "@/src/features/trace-graph-view/layout/elkLayout";
import type { GraphCanvasData } from "@/src/features/trace-graph-view/types";
import type {
  AgentCommunicationFlowEdge,
  AgentFlowNode,
  BrainFlowNode,
  BrainGraphLayoutResult,
  MissionControlFlowEdge,
} from "./types";

export const BRAIN_NODE_WIDTH = 304;
export const BRAIN_NODE_HEIGHT = 160;
export const AGENT_NODE_WIDTH = 280;
export const AGENT_NODE_HEIGHT = 136;

export async function toBrainReactFlowModel(
  graph: AgentBrainGraph,
): Promise<BrainGraphLayoutResult<BrainFlowNode, MissionControlFlowEdge>> {
  const canvas: GraphCanvasData = {
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      label: node.title,
      type: node.kind,
      width: BRAIN_NODE_WIDTH,
      height: BRAIN_NODE_HEIGHT,
    })),
    edges: graph.edges.map((edge) => ({
      from: edge.source,
      to: edge.target,
    })),
  };
  const layout = await computeGraphLayout(canvas, {}, "DOWN");
  const positions = new Map(layout.nodes.map((node) => [node.id, node]));

  return {
    nodes: graph.nodes.flatMap((brainNode): BrainFlowNode[] => {
      const position = positions.get(brainNode.id);
      if (!position) return [];
      return [
        {
          id: brainNode.id,
          type: "brain",
          position: { x: position.x, y: position.y },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
          data: {
            brainNode,
            searchMatch: false,
            searchDimmed: false,
            replayActive: false,
          },
          style: { width: BRAIN_NODE_WIDTH, height: BRAIN_NODE_HEIGHT },
          draggable: false,
          connectable: false,
          selectable: true,
          focusable: true,
          ariaLabel: `${brainNode.kind}: ${brainNode.title}`,
        },
      ];
    }),
    edges: graph.edges.map(
      (edge): MissionControlFlowEdge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "smoothstep",
        animated: edge.animated,
        focusable: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 18,
          height: 18,
        },
        data: { kind: edge.kind, provenance: edge.provenance },
        className:
          edge.kind === "HANDOFF"
            ? "mission-control-handoff-edge"
            : "mission-control-brain-edge",
        ariaLabel: `${edge.kind.toLocaleLowerCase()} from ${edge.source} to ${edge.target}`,
      }),
    ),
    tooLarge: Boolean(layout.tooLarge),
    nodeCount: layout.nodeCount ?? graph.nodes.length,
    edgeCount: layout.edgeCount ?? graph.edges.length,
  };
}

export async function toAgentReactFlowModel(
  graph: AgentCommunicationGraph,
): Promise<BrainGraphLayoutResult<AgentFlowNode, AgentCommunicationFlowEdge>> {
  const canvas: GraphCanvasData = {
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      label: node.agent.name,
      type: "AGENT",
      width: AGENT_NODE_WIDTH,
      height: AGENT_NODE_HEIGHT,
    })),
    edges: graph.edges.map((edge) => ({
      from: edge.source,
      to: edge.target,
    })),
  };
  const layout = await computeGraphLayout(canvas, {}, "RIGHT", false);
  const positions = new Map(layout.nodes.map((node) => [node.id, node]));

  return {
    nodes: graph.nodes.flatMap((communicationNode): AgentFlowNode[] => {
      const position = positions.get(communicationNode.id);
      if (!position) return [];
      return [
        {
          id: communicationNode.id,
          type: "agent",
          position: { x: position.x, y: position.y },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          data: {
            communicationNode,
            searchMatch: false,
            searchDimmed: false,
          },
          style: { width: AGENT_NODE_WIDTH, height: AGENT_NODE_HEIGHT },
          draggable: false,
          connectable: false,
          selectable: true,
          focusable: true,
          ariaLabel: `Agent: ${communicationNode.agent.name}`,
        },
      ];
    }),
    edges: graph.edges.map(
      (edge): AgentCommunicationFlowEdge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "smoothstep",
        animated: true,
        focusable: true,
        label: `${edge.handoffCount} handoff${edge.handoffCount === 1 ? "" : "s"}`,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 18,
          height: 18,
        },
        data: { eventIds: edge.eventIds, summaries: edge.summaries },
        className: "mission-control-handoff-edge",
        ariaLabel: `${edge.handoffCount} handoffs from ${edge.source} to ${edge.target}`,
      }),
    ),
    tooLarge: Boolean(layout.tooLarge),
    nodeCount: layout.nodeCount ?? graph.nodes.length,
    edgeCount: layout.edgeCount ?? graph.edges.length,
  };
}
