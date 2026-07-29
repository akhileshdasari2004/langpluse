import {
  AgentExecutionEventCategory,
  type AgentExecutionEvent,
  type AgentExecutionEventStatus,
  type AgentExecutionProjection,
  type AgentExecutionProvenance,
  type AgentIdentity,
} from "./schema";
import type {
  AgentExecutionSourceEvent,
  AgentExecutionSourceTrace,
} from "./types";

export const MISSION_CONTROL_METADATA_KEYS = {
  eventCategory: "mission_control.event.category",
  agentKey: "mission_control.agent.key",
  agentName: "mission_control.agent.name",
  agentVersion: "mission_control.agent.version",
  eventStatus: "mission_control.event.status",
  eventConfidence: "mission_control.event.confidence",
  reasoningSummary: "mission_control.reasoning.summary",
  toolName: "mission_control.tool.name",
  apiLatencyMs: "mission_control.api.latency_ms",
} as const;

const EXPLICIT_CATEGORY_ALIASES: Record<string, AgentExecutionEventCategory> = {
  task: "TASK_RECEIVED",
  task_received: "TASK_RECEIVED",
  planning: "PLANNING",
  plan: "PLANNING",
  reasoning: "REASONING",
  thought: "REASONING",
  memory: "MEMORY_RETRIEVAL",
  memory_retrieval: "MEMORY_RETRIEVAL",
  retrieval: "MEMORY_RETRIEVAL",
  decision: "DECISION",
  tool: "TOOL_CALL",
  tool_call: "TOOL_CALL",
  observation: "OBSERVATION",
  retry: "RETRY",
  handoff: "HANDOFF",
  approval: "APPROVAL",
  completion: "COMPLETION",
  complete: "COMPLETION",
  failure: "FAILURE",
  failed: "FAILURE",
};

function metadataString(
  metadata: AgentExecutionSourceEvent["metadata"],
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function metadataNumber(
  metadata: AgentExecutionSourceEvent["metadata"],
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const value = metadata[key];
    const number =
      typeof value === "number"
        ? value
        : typeof value === "string" && value.trim()
          ? Number(value)
          : Number.NaN;
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function normalizeCategory(value: string): AgentExecutionEventCategory | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replaceAll(/[\s.-]+/g, "_");
  const alias = EXPLICIT_CATEGORY_ALIASES[normalized];
  if (alias) return alias;

  const upper = normalized.toUpperCase();
  const parsed = AgentExecutionEventCategory.safeParse(upper);
  return parsed.success ? parsed.data : null;
}

export function classifyAgentExecutionEvent(event: AgentExecutionSourceEvent): {
  category: AgentExecutionEventCategory;
  provenance: AgentExecutionProvenance;
  confidence: number;
} {
  const explicitValue = metadataString(
    event.metadata,
    MISSION_CONTROL_METADATA_KEYS.eventCategory,
    "agent.event.category",
  );
  const explicitCategory = explicitValue
    ? normalizeCategory(explicitValue)
    : null;
  if (explicitCategory) {
    return {
      category: explicitCategory,
      provenance: "EXPLICIT",
      confidence: 1,
    };
  }

  if (event.level === "ERROR") {
    return { category: "FAILURE", provenance: "INFERRED", confidence: 0.95 };
  }

  if (event.type === "TOOL") {
    return { category: "TOOL_CALL", provenance: "INFERRED", confidence: 0.95 };
  }

  if (event.type === "RETRIEVER") {
    return {
      category: "MEMORY_RETRIEVAL",
      provenance: "INFERRED",
      confidence: 0.9,
    };
  }

  const searchableName = `${event.name ?? ""} ${event.statusMessage ?? ""}`
    .toLowerCase()
    .replaceAll(/[_\s.-]+/g, " ");

  const nameRules: Array<{
    pattern: RegExp;
    category: AgentExecutionEventCategory;
    confidence: number;
  }> = [
    { pattern: /\bretr(y|ies|ying)\b/, category: "RETRY", confidence: 0.85 },
    {
      pattern: /\b(memory|retriev(e|al))\b/,
      category: "MEMORY_RETRIEVAL",
      confidence: 0.8,
    },
    { pattern: /\b(plan|planning)\b/, category: "PLANNING", confidence: 0.75 },
    {
      pattern: /\b(reason|reasoning|thought)\b/,
      category: "REASONING",
      confidence: 0.75,
    },
    {
      pattern: /\b(decide|decision|select)\b/,
      category: "DECISION",
      confidence: 0.75,
    },
    {
      pattern: /\b(handoff|delegate)\b/,
      category: "HANDOFF",
      confidence: 0.75,
    },
    {
      pattern: /\b(approval|approve)\b/,
      category: "APPROVAL",
      confidence: 0.75,
    },
    {
      pattern: /\b(complete|completed|success)\b/,
      category: "COMPLETION",
      confidence: 0.7,
    },
    {
      pattern: /\b(fail|failed|error)\b/,
      category: "FAILURE",
      confidence: 0.8,
    },
  ];

  for (const rule of nameRules) {
    if (rule.pattern.test(searchableName)) {
      return {
        category: rule.category,
        provenance: "INFERRED",
        confidence: rule.confidence,
      };
    }
  }

  if (event.type === "EVENT") {
    return {
      category: "OBSERVATION",
      provenance: "INFERRED",
      confidence: 0.6,
    };
  }

  return { category: "UNKNOWN", provenance: "RAW", confidence: 0 };
}

function resolveAgentIdentity(
  trace: AgentExecutionSourceTrace,
  events: AgentExecutionSourceEvent[],
): AgentIdentity {
  const agentEvent = events.find((event) => event.type === "AGENT");
  const metadataSources = [agentEvent?.metadata, trace.metadata].filter(
    (metadata): metadata is NonNullable<typeof metadata> => !!metadata,
  );

  const findValue = (...keys: string[]) => {
    for (const metadata of metadataSources) {
      const value = metadataString(metadata, ...keys);
      if (value) return value;
    }
    return null;
  };

  const explicitKey = findValue(
    MISSION_CONTROL_METADATA_KEYS.agentKey,
    "agent.id",
    "gen_ai.agent.id",
  );
  const explicitName = findValue(
    MISSION_CONTROL_METADATA_KEYS.agentName,
    "agent.name",
    "gen_ai.agent.name",
  );
  const explicitVersion = findValue(
    MISSION_CONTROL_METADATA_KEYS.agentVersion,
    "agent.version",
  );

  if (explicitKey || explicitName) {
    const name = explicitName ?? agentEvent?.name ?? trace.name ?? "Agent";
    return {
      key: explicitKey ?? name,
      name,
      version: explicitVersion ?? agentEvent?.version ?? trace.version,
      provenance: "EXPLICIT",
    };
  }

  const name = agentEvent?.name ?? trace.name ?? "Unidentified agent";
  return {
    key: name,
    name,
    version: agentEvent?.version ?? trace.version,
    provenance: agentEvent || trace.name ? "INFERRED" : "RAW",
  };
}

function resolveEventStatus(
  event: AgentExecutionSourceEvent,
  category: AgentExecutionEventCategory,
): AgentExecutionEventStatus {
  const explicit = metadataString(
    event.metadata,
    MISSION_CONTROL_METADATA_KEYS.eventStatus,
  )
    ?.toLowerCase()
    .replaceAll(/[\s.-]+/g, "_");
  if (explicit === "running" || explicit === "in_progress") return "RUNNING";
  if (
    explicit === "completed" ||
    explicit === "complete" ||
    explicit === "succeeded" ||
    explicit === "success"
  )
    return "COMPLETED";
  if (explicit === "failed" || explicit === "failure" || explicit === "error")
    return "FAILED";
  if (explicit === "waiting_approval" || explicit === "pending_approval")
    return "WAITING_APPROVAL";

  if (category === "FAILURE" || event.level === "ERROR") return "FAILED";
  if (category === "APPROVAL" && !event.endTime) return "WAITING_APPROVAL";
  return event.endTime ? "COMPLETED" : "RUNNING";
}

export function projectAgentExecution({
  trace,
  events,
}: {
  trace: AgentExecutionSourceTrace;
  events: AgentExecutionSourceEvent[];
}): AgentExecutionProjection {
  const sortedEvents = [...events].sort(
    (a, b) =>
      a.startTime.getTime() - b.startTime.getTime() || a.id.localeCompare(b.id),
  );
  const agent = resolveAgentIdentity(trace, sortedEvents);
  const projectedEvents: AgentExecutionEvent[] = sortedEvents.map((event) => {
    const classification = classifyAgentExecutionEvent(event);
    const explicitConfidence = metadataNumber(
      event.metadata,
      MISSION_CONTROL_METADATA_KEYS.eventConfidence,
    );
    const latencySeconds = event.endTime
      ? Math.max(
          0,
          (event.endTime.getTime() - event.startTime.getTime()) / 1_000,
        )
      : null;
    const explicitApiLatency = metadataNumber(
      event.metadata,
      MISSION_CONTROL_METADATA_KEYS.apiLatencyMs,
    );
    return {
      id: event.id,
      parentEventId: event.parentObservationId,
      category: classification.category,
      categoryProvenance: classification.provenance,
      confidence:
        explicitConfidence !== null &&
        explicitConfidence >= 0 &&
        explicitConfidence <= 1
          ? explicitConfidence
          : classification.confidence,
      name: event.name ?? event.type,
      observationType: event.type,
      level: event.level,
      status: resolveEventStatus(event, classification.category),
      statusMessage: event.statusMessage,
      startedAt: event.startTime,
      endedAt: event.endTime,
      latencySeconds,
      apiLatencyMs:
        explicitApiLatency !== null && explicitApiLatency >= 0
          ? explicitApiLatency
          : event.type === "TOOL" && latencySeconds !== null
            ? latencySeconds * 1_000
            : null,
      toolUsed:
        metadataString(
          event.metadata,
          MISSION_CONTROL_METADATA_KEYS.toolName,
        ) ?? (event.type === "TOOL" ? event.name : null),
      reasoningSummary: metadataString(
        event.metadata,
        MISSION_CONTROL_METADATA_KEYS.reasoningSummary,
        "reasoning.summary",
      ),
      agent: event.type === "AGENT" ? agent : null,
      metadata: event.metadata,
    };
  });

  const startedAt = projectedEvents[0]?.startedAt ?? trace.timestamp;
  const completedEvents = projectedEvents.filter((event) => event.endedAt);
  const endedAt =
    completedEvents.length > 0
      ? new Date(
          Math.max(...completedEvents.map((event) => event.endedAt!.getTime())),
        )
      : null;
  const terminalEvent = [...projectedEvents]
    .reverse()
    .find(
      (event) =>
        event.category === "COMPLETION" || event.category === "FAILURE",
    );

  return {
    id: trace.id,
    traceId: trace.id,
    projectId: trace.projectId,
    name: trace.name ?? agent.name,
    status:
      terminalEvent?.category === "FAILURE"
        ? "FAILED"
        : terminalEvent?.category === "COMPLETION"
          ? "SUCCEEDED"
        : endedAt
          ? "UNKNOWN"
          : "RUNNING",
    startedAt,
    endedAt,
    latencySeconds: endedAt
      ? Math.max(0, (endedAt.getTime() - startedAt.getTime()) / 1_000)
      : null,
    agent,
    events: projectedEvents,
  };
}
