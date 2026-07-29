import { z } from "zod";
import {
  AgentExecutionEventSchema,
  AgentExecutionProvenance,
  AgentExecutionStatus,
  AgentIdentitySchema,
  type AgentExecutionEvent,
  type AgentExecutionProjection,
} from "./schema";

export const MISSION_CONTROL_BRAIN_METADATA_KEYS = {
  nodeKind: "mission_control.brain.kind",
  nodeTitle: "mission_control.brain.title",
  promptSummary: "mission_control.prompt.summary",
  toolSelectionReason: "mission_control.tool.selection_reason",
  rejectedAlternatives: "mission_control.decision.rejected_alternatives",
  memoryUsed: "mission_control.memory.used",
  dependencies: "mission_control.dependencies",
  inputTokens: "mission_control.tokens.input",
  outputTokens: "mission_control.tokens.output",
  totalTokens: "mission_control.tokens.total",
  executionDurationMs: "mission_control.execution.duration_ms",
  handoffFromAgent: "mission_control.handoff.from_agent",
  handoffToAgent: "mission_control.handoff.to_agent",
  handoffSummary: "mission_control.handoff.summary",
} as const;

export const AgentBrainNodeKind = z.enum([
  "GOAL",
  "PLAN",
  "UPDATED_PLAN",
  "REASONING",
  "DECISION",
  "TOOL",
  "OBSERVATION",
  "MEMORY",
  "RETRY",
  "APPROVAL",
  "HANDOFF",
  "ERROR",
  "COMPLETION",
]);

export type AgentBrainNodeKind = z.infer<typeof AgentBrainNodeKind>;

export const AgentBrainTokenUsageSchema = z.object({
  input: z.number().nonnegative().nullable(),
  output: z.number().nonnegative().nullable(),
  total: z.number().nonnegative().nullable(),
});

export type AgentBrainTokenUsage = z.infer<typeof AgentBrainTokenUsageSchema>;

export const AgentBrainNodeSchema = z.object({
  id: z.string().min(1),
  event: AgentExecutionEventSchema,
  kind: AgentBrainNodeKind,
  title: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  reasoning: z.string().nullable(),
  promptSummary: z.string().nullable(),
  toolSelectionReason: z.string().nullable(),
  rejectedAlternatives: z.array(z.string()),
  memoryUsed: z.array(z.string()),
  tokenUsage: AgentBrainTokenUsageSchema,
  executionDurationSeconds: z.number().nonnegative().nullable(),
  dependencyIds: z.array(z.string()),
  dependencyProvenance: AgentExecutionProvenance,
  agent: AgentIdentitySchema,
});

export type AgentBrainNode = z.infer<typeof AgentBrainNodeSchema>;

export const AgentBrainEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  kind: z.enum(["DEPENDENCY", "SEQUENCE", "HANDOFF"]),
  provenance: AgentExecutionProvenance,
  animated: z.boolean(),
});

export type AgentBrainEdge = z.infer<typeof AgentBrainEdgeSchema>;

export const AgentBrainGraphSchema = z.object({
  runId: z.string().min(1),
  status: AgentExecutionStatus,
  nodes: z.array(AgentBrainNodeSchema),
  edges: z.array(AgentBrainEdgeSchema),
});

export type AgentBrainGraph = z.infer<typeof AgentBrainGraphSchema>;

export const AgentCommunicationNodeSchema = z.object({
  id: z.string().min(1),
  agent: AgentIdentitySchema,
  eventIds: z.array(z.string()),
  eventCount: z.number().int().nonnegative(),
  averageConfidence: z.number().min(0).max(1),
  totalDurationSeconds: z.number().nonnegative(),
  status: AgentExecutionStatus,
});

export type AgentCommunicationNode = z.infer<
  typeof AgentCommunicationNodeSchema
>;

export const AgentCommunicationEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  eventIds: z.array(z.string()),
  handoffCount: z.number().int().nonnegative(),
  summaries: z.array(z.string()),
});

export type AgentCommunicationEdge = z.infer<
  typeof AgentCommunicationEdgeSchema
>;

export const AgentCommunicationGraphSchema = z.object({
  nodes: z.array(AgentCommunicationNodeSchema),
  edges: z.array(AgentCommunicationEdgeSchema),
});

export type AgentCommunicationGraph = z.infer<
  typeof AgentCommunicationGraphSchema
>;

function metadataString(
  event: AgentExecutionEvent,
  key: string,
): string | null {
  const value = event.metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function metadataNumber(
  event: AgentExecutionEvent,
  key: string,
): number | null {
  const value = event.metadata[key];
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function metadataStringArray(
  event: AgentExecutionEvent,
  key: string,
): string[] {
  const value = event.metadata[key];
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string" && item.trim() !== "",
    );
  }
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is string =>
          typeof item === "string" && item.trim() !== "",
      );
    }
  } catch {
    // Instrumentation may use a compact comma-separated representation.
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveNodeKind(
  event: AgentExecutionEvent,
  planningIndex: number,
): AgentBrainNodeKind {
  const explicit = metadataString(
    event,
    MISSION_CONTROL_BRAIN_METADATA_KEYS.nodeKind,
  );
  if (explicit) {
    const parsed = AgentBrainNodeKind.safeParse(
      explicit
        .trim()
        .toUpperCase()
        .replaceAll(/[\s.-]+/g, "_"),
    );
    if (parsed.success) return parsed.data;
  }

  switch (event.category) {
    case "TASK_RECEIVED":
      return "GOAL";
    case "PLANNING":
      return planningIndex === 0 ? "PLAN" : "UPDATED_PLAN";
    case "REASONING":
      return "REASONING";
    case "DECISION":
      return "DECISION";
    case "TOOL_CALL":
      return "TOOL";
    case "MEMORY_RETRIEVAL":
      return "MEMORY";
    case "RETRY":
      return "RETRY";
    case "APPROVAL":
      return "APPROVAL";
    case "HANDOFF":
      return "HANDOFF";
    case "FAILURE":
      return "ERROR";
    case "COMPLETION":
      return "COMPLETION";
    case "OBSERVATION":
    case "UNKNOWN":
      return "OBSERVATION";
  }
}

function resolveTokenUsage(event: AgentExecutionEvent): AgentBrainTokenUsage {
  const input = metadataNumber(
    event,
    MISSION_CONTROL_BRAIN_METADATA_KEYS.inputTokens,
  );
  const output = metadataNumber(
    event,
    MISSION_CONTROL_BRAIN_METADATA_KEYS.outputTokens,
  );
  const explicitTotal = metadataNumber(
    event,
    MISSION_CONTROL_BRAIN_METADATA_KEYS.totalTokens,
  );
  return {
    input,
    output,
    total:
      explicitTotal ??
      (input !== null || output !== null ? (input ?? 0) + (output ?? 0) : null),
  };
}

function isAnimatedNode(node: AgentBrainNode, runStatus: AgentExecutionStatus) {
  return (
    runStatus === "RUNNING" ||
    node.event.status === "RUNNING" ||
    node.kind === "RETRY" ||
    node.kind === "HANDOFF"
  );
}

export function buildAgentBrainGraph(
  projection: AgentExecutionProjection,
): AgentBrainGraph {
  const events = [...projection.events].sort(
    (left, right) =>
      left.startedAt.getTime() - right.startedAt.getTime() ||
      left.id.localeCompare(right.id),
  );
  const eventIds = new Set(events.map((event) => event.id));
  let planningIndex = 0;

  const nodes = events.map((event, sequence): AgentBrainNode => {
    const kind = resolveNodeKind(event, planningIndex);
    if (event.category === "PLANNING") planningIndex += 1;
    const explicitDependencies = metadataStringArray(
      event,
      MISSION_CONTROL_BRAIN_METADATA_KEYS.dependencies,
    ).filter((id) => id !== event.id && eventIds.has(id));
    const previousEvent = events[sequence - 1];
    const inferredDependencies =
      previousEvent && previousEvent.id !== event.id ? [previousEvent.id] : [];
    const explicitDurationMs = metadataNumber(
      event,
      MISSION_CONTROL_BRAIN_METADATA_KEYS.executionDurationMs,
    );

    return {
      id: event.id,
      event,
      kind,
      title:
        metadataString(event, MISSION_CONTROL_BRAIN_METADATA_KEYS.nodeTitle) ??
        event.name,
      sequence,
      reasoning: event.reasoningSummary,
      promptSummary: metadataString(
        event,
        MISSION_CONTROL_BRAIN_METADATA_KEYS.promptSummary,
      ),
      toolSelectionReason: metadataString(
        event,
        MISSION_CONTROL_BRAIN_METADATA_KEYS.toolSelectionReason,
      ),
      rejectedAlternatives: metadataStringArray(
        event,
        MISSION_CONTROL_BRAIN_METADATA_KEYS.rejectedAlternatives,
      ),
      memoryUsed: metadataStringArray(
        event,
        MISSION_CONTROL_BRAIN_METADATA_KEYS.memoryUsed,
      ),
      tokenUsage: resolveTokenUsage(event),
      executionDurationSeconds:
        explicitDurationMs !== null
          ? explicitDurationMs / 1_000
          : event.latencySeconds,
      dependencyIds:
        explicitDependencies.length > 0
          ? explicitDependencies
          : inferredDependencies,
      dependencyProvenance:
        explicitDependencies.length > 0 ? "EXPLICIT" : "INFERRED",
      agent: event.agent ?? projection.agent,
    };
  });

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges = nodes.flatMap((node): AgentBrainEdge[] =>
    node.dependencyIds.flatMap((source) => {
      const sourceNode = nodeById.get(source);
      if (!sourceNode) return [];
      const isHandoff =
        node.kind === "HANDOFF" || sourceNode.agent.key !== node.agent.key;
      return [
        {
          id: `${source}->${node.id}`,
          source,
          target: node.id,
          kind: isHandoff
            ? "HANDOFF"
            : node.dependencyProvenance === "EXPLICIT"
              ? "DEPENDENCY"
              : "SEQUENCE",
          provenance: node.dependencyProvenance,
          animated:
            isHandoff ||
            isAnimatedNode(sourceNode, projection.status) ||
            isAnimatedNode(node, projection.status),
        },
      ];
    }),
  );

  return {
    runId: projection.id,
    status: projection.status,
    nodes,
    edges,
  };
}

export function buildAgentCommunicationGraph(
  graph: AgentBrainGraph,
): AgentCommunicationGraph {
  const groupedNodes = new Map<string, AgentBrainNode[]>();
  for (const node of graph.nodes) {
    const current = groupedNodes.get(node.agent.key);
    if (current) current.push(node);
    else groupedNodes.set(node.agent.key, [node]);
  }

  const nodes = [...groupedNodes.entries()].map(
    ([id, agentNodes]): AgentCommunicationNode => {
      const completed = agentNodes.filter(
        (node) => node.event.status === "COMPLETED",
      ).length;
      const failed = agentNodes.some((node) => node.event.status === "FAILED");
      const running = agentNodes.some(
        (node) => node.event.status === "RUNNING",
      );
      return {
        id,
        agent: agentNodes[0].agent,
        eventIds: agentNodes.map((node) => node.event.id),
        eventCount: agentNodes.length,
        averageConfidence:
          agentNodes.reduce((sum, node) => sum + node.event.confidence, 0) /
          agentNodes.length,
        totalDurationSeconds: agentNodes.reduce(
          (sum, node) => sum + (node.executionDurationSeconds ?? 0),
          0,
        ),
        status: failed
          ? "FAILED"
          : running
            ? "RUNNING"
            : completed === agentNodes.length
              ? "SUCCEEDED"
              : "UNKNOWN",
      };
    },
  );

  const groupedEdges = new Map<string, AgentCommunicationEdge>();
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  for (const edge of graph.edges) {
    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);
    if (
      !sourceNode ||
      !targetNode ||
      sourceNode.agent.key === targetNode.agent.key
    )
      continue;
    const key = JSON.stringify([sourceNode.agent.key, targetNode.agent.key]);
    const existing = groupedEdges.get(key);
    const summary =
      metadataString(
        targetNode.event,
        MISSION_CONTROL_BRAIN_METADATA_KEYS.handoffSummary,
      ) ?? targetNode.reasoning;
    if (existing) {
      existing.eventIds.push(targetNode.event.id);
      existing.handoffCount += 1;
      if (summary && !existing.summaries.includes(summary)) {
        existing.summaries.push(summary);
      }
    } else {
      groupedEdges.set(key, {
        id: `${sourceNode.agent.key}->${targetNode.agent.key}`,
        source: sourceNode.agent.key,
        target: targetNode.agent.key,
        eventIds: [targetNode.event.id],
        handoffCount: 1,
        summaries: summary ? [summary] : [],
      });
    }
  }

  return { nodes, edges: [...groupedEdges.values()] };
}
