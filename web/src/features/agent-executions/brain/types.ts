import type { AgentBrainNode, AgentCommunicationNode } from "@langfuse/shared";
import type { Edge, Node } from "@xyflow/react";

export type BrainFlowNodeData = {
  brainNode: AgentBrainNode;
  searchMatch: boolean;
  searchDimmed: boolean;
};

export type BrainFlowNode = Node<BrainFlowNodeData, "brain">;

export type AgentFlowNodeData = {
  communicationNode: AgentCommunicationNode;
  searchMatch: boolean;
  searchDimmed: boolean;
};

export type AgentFlowNode = Node<AgentFlowNodeData, "agent">;

export type MissionControlFlowNode = BrainFlowNode | AgentFlowNode;

export type MissionControlFlowEdge = Edge<
  { kind: "DEPENDENCY" | "SEQUENCE" | "HANDOFF"; provenance: string },
  "smoothstep"
>;

export type AgentCommunicationFlowEdge = Edge<
  { eventIds: string[]; summaries: string[] },
  "smoothstep"
>;

export type BrainGraphLayoutResult<TNode extends Node, TEdge extends Edge> = {
  nodes: TNode[];
  edges: TEdge[];
  tooLarge: boolean;
  nodeCount: number;
  edgeCount: number;
};
