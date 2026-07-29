import type {
  AgentExecutionEvent,
  AgentExecutionProjection,
} from "../agent-executions/schema";
import type {
  CustomerReplyIntent,
  SimulationComparison,
  SimulationCondition,
  SimulationEventDifference,
  SimulationExecutionResult,
  SimulationFixtureInput,
} from "./schema";

const SIMULATION_METADATA_PREFIX = "mission_control.simulation.";

type MutableSimulation = {
  events: AgentExecutionEvent[];
  differences: SimulationEventDifference[];
  addedReasoningEventIds: string[];
  offsetMs: number;
  status: AgentExecutionProjection["status"];
};

function cloneEvent(event: AgentExecutionEvent): AgentExecutionEvent {
  return {
    ...event,
    agent: event.agent ? { ...event.agent } : null,
    metadata: { ...event.metadata },
  };
}

function nextTimestamp(
  state: MutableSimulation,
  baseline: AgentExecutionProjection,
) {
  const last = state.events.at(-1)?.endedAt ?? state.events.at(-1)?.startedAt;
  const anchor = last ?? baseline.endedAt ?? baseline.startedAt;
  state.offsetMs += 420;
  return new Date(anchor.getTime() + state.offsetMs);
}

function addReasoning(
  state: MutableSimulation,
  baseline: AgentExecutionProjection,
  condition: SimulationCondition["type"],
  summary: string,
  confidence = 0.88,
) {
  const startedAt = nextTimestamp(state, baseline);
  const id = `simulation:${condition.toLocaleLowerCase()}:${state.events.length}`;
  const event: AgentExecutionEvent = {
    id,
    parentEventId: baseline.events.at(0)?.id ?? null,
    category: "REASONING",
    categoryProvenance: "EXPLICIT",
    confidence,
    name: `simulate-${condition.toLocaleLowerCase().replaceAll("_", "-")}`,
    observationType: "EVENT",
    level: "DEFAULT",
    status: "COMPLETED",
    statusMessage: null,
    startedAt,
    endedAt: new Date(startedAt.getTime() + 240),
    latencySeconds: 0.24,
    apiLatencyMs: null,
    toolUsed: null,
    reasoningSummary: summary,
    agent: baseline.agent,
    metadata: {
      [`${SIMULATION_METADATA_PREFIX}condition`]: condition,
      [`${SIMULATION_METADATA_PREFIX}reasoning_origin`]: "fixture_policy",
      [`${SIMULATION_METADATA_PREFIX}is_simulated`]: true,
      "mission_control.brain.kind": "reasoning",
    },
  };
  state.events.push(event);
  state.addedReasoningEventIds.push(event.id);
  state.differences.push({
    eventId: event.id,
    baselineEventId: null,
    kind: "ADDED",
    summary,
  });
}

function markToolFailure(
  state: MutableSimulation,
  token: string,
  summary: string,
  statusMessage: string,
) {
  const index = state.events.findIndex((event) =>
    [event.name, event.toolUsed]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase()
      .includes(token),
  );
  if (index < 0) return false;

  const previous = state.events[index];
  const changed: AgentExecutionEvent = {
    ...previous,
    category: "FAILURE",
    level: "ERROR",
    status: "FAILED",
    statusMessage,
    metadata: {
      ...previous.metadata,
      [`${SIMULATION_METADATA_PREFIX}is_simulated`]: true,
      [`${SIMULATION_METADATA_PREFIX}failure_injected`]: true,
    },
  };
  state.events[index] = changed;
  state.differences.push({
    eventId: changed.id,
    baselineEventId: previous.id,
    kind: "CHANGED",
    summary,
  });
  return true;
}

function customerReplySummary(intent: CustomerReplyIntent) {
  switch (intent) {
    case "POSITIVE":
      return "Customer reply confirms interest; prioritize a concise executive review and preserve the existing approval boundary.";
    case "NEGOTIATION":
      return "Customer reply requests commercial discussion; route the next step to human approval instead of proposing unverified terms.";
    case "UNSUBSCRIBE":
      return "Customer reply requests no further outreach; stop automated delivery and record the suppression decision.";
  }
}

function applyCondition(
  state: MutableSimulation,
  baseline: AgentExecutionProjection,
  condition: SimulationCondition,
) {
  switch (condition.type) {
    case "CRM_OFFLINE": {
      markToolFailure(
        state,
        "salesforce",
        "CRM lookup changed from verified account context to an offline provider failure.",
        "Salesforce CRM is unavailable in this isolated simulation.",
      );
      addReasoning(
        state,
        baseline,
        condition.type,
        "CRM evidence is unavailable. Continue only with already-verified context and require human review before any customer-facing claim.",
        0.76,
      );
      break;
    }
    case "SLACK_FAILURE": {
      markToolFailure(
        state,
        "slack",
        "Slack notification changed to a delivery failure.",
        "Slack delivery failed in this isolated simulation.",
      );
      addReasoning(
        state,
        baseline,
        condition.type,
        "Slack delivery is unavailable. Preserve the approval record and route notification through the durable audit trail without retrying customer communication.",
      );
      break;
    }
    case "ERP_TIMEOUT": {
      markToolFailure(
        state,
        "netsuite",
        "ERP verification changed to a timeout.",
        "NetSuite ERP timed out in this isolated simulation.",
      );
      addReasoning(
        state,
        baseline,
        condition.type,
        "ERP verification timed out. Do not infer contract eligibility; retain the run in an approval-required state and schedule a bounded retry.",
        0.81,
      );
      break;
    }
    case "MEMORY_MISSING": {
      for (const [index, event] of state.events.entries()) {
        if (event.category !== "MEMORY_RETRIEVAL") continue;
        state.events[index] = {
          ...event,
          status: "FAILED",
          level: "WARNING",
          statusMessage:
            "Required account memory is unavailable in this isolated simulation.",
          metadata: {
            ...event.metadata,
            [`${SIMULATION_METADATA_PREFIX}is_simulated`]: true,
            [`${SIMULATION_METADATA_PREFIX}memory_available`]: false,
          },
        };
        state.differences.push({
          eventId: event.id,
          baselineEventId: event.id,
          kind: "CHANGED",
          summary:
            "Retrieved memory was withheld from the simulated execution.",
        });
      }
      addReasoning(
        state,
        baseline,
        condition.type,
        "Relevant account memory is missing. Remove personalized claims, use only current tool evidence, and request review before drafting outreach.",
        0.8,
      );
      break;
    }
    case "CUSTOMER_REPLY": {
      addReasoning(
        state,
        baseline,
        condition.type,
        customerReplySummary(condition.customerReplyIntent ?? "NEGOTIATION"),
        condition.customerReplyIntent === "POSITIVE" ? 0.93 : 0.9,
      );
      break;
    }
    case "TOOL_FAILURE": {
      const changed = markToolFailure(
        state,
        "",
        "The first available tool invocation changed to an injected failure.",
        "A tool failed in this isolated simulation.",
      );
      addReasoning(
        state,
        baseline,
        condition.type,
        changed
          ? "The selected tool failed. Identify whether the operation is idempotent, then choose a bounded fallback or stop before external side effects."
          : "No tool invocation was present. Preserve the no-tool constraint and escalate the missing capability for review.",
        0.84,
      );
      break;
    }
    case "RATE_LIMIT": {
      markToolFailure(
        state,
        "",
        "A tool invocation changed to a rate-limited response.",
        "Provider returned 429; retry budget is simulated as exhausted.",
      );
      addReasoning(
        state,
        baseline,
        condition.type,
        "The provider rate limit is exhausted. Stop immediate retries, record retry-after guidance, and defer non-urgent work rather than increasing request pressure.",
        0.91,
      );
      break;
    }
    case "DIFFERENT_MODEL": {
      addReasoning(
        state,
        baseline,
        condition.type,
        `Model policy switched to ${condition.model ?? "the selected alternative"}. Re-evaluate evidence ordering and retain the same tool and approval constraints.`,
        0.86,
      );
      break;
    }
  }
}

/**
 * Produces a deterministic, fixture-backed execution path. It never invokes
 * a provider, source-run tool, production credential, or network destination.
 * A model-backed generator may consume this contract only after an explicit
 * project model and data-retention policy are configured.
 */
export function compileSimulationScenario(
  input: SimulationFixtureInput,
): SimulationExecutionResult {
  const { baseline, scenario, seed } = input;
  const state: MutableSimulation = {
    events: baseline.events.map(cloneEvent),
    differences: [],
    addedReasoningEventIds: [],
    offsetMs: Math.max(1, seed.length % 17),
    status: baseline.status,
  };

  for (const condition of scenario.conditions) {
    applyCondition(state, baseline, condition);
  }

  const hasBlockingCondition = scenario.conditions.some((condition) =>
    ["CRM_OFFLINE", "ERP_TIMEOUT", "MEMORY_MISSING", "TOOL_FAILURE"].includes(
      condition.type,
    ),
  );
  state.status = hasBlockingCondition ? "FAILED" : "SUCCEEDED";
  const completionAt = nextTimestamp(state, baseline);
  const completionId = `simulation:completion:${state.events.length}`;
  state.events.push({
    id: completionId,
    parentEventId: baseline.events.at(0)?.id ?? null,
    category: state.status === "SUCCEEDED" ? "COMPLETION" : "FAILURE",
    categoryProvenance: "EXPLICIT",
    confidence: state.status === "SUCCEEDED" ? 0.95 : 0.9,
    name: "simulation-outcome",
    observationType: "EVENT",
    level: state.status === "SUCCEEDED" ? "DEFAULT" : "ERROR",
    status: state.status === "SUCCEEDED" ? "COMPLETED" : "FAILED",
    statusMessage:
      state.status === "SUCCEEDED"
        ? "Simulation completed without executing external tools."
        : "Simulation stopped because required evidence or a tool was unavailable.",
    startedAt: completionAt,
    endedAt: completionAt,
    latencySeconds: 0,
    apiLatencyMs: null,
    toolUsed: null,
    reasoningSummary: null,
    agent: baseline.agent,
    metadata: {
      [`${SIMULATION_METADATA_PREFIX}is_simulated`]: true,
      [`${SIMULATION_METADATA_PREFIX}seed`]: seed,
      [`${SIMULATION_METADATA_PREFIX}reasoning_origin`]: "fixture_policy",
    },
  });
  state.differences.push({
    eventId: completionId,
    baselineEventId: null,
    kind: "ADDED",
    summary:
      state.status === "SUCCEEDED"
        ? "Simulated execution completed with the injected conditions."
        : "Simulated execution stopped after an injected condition removed required evidence or a tool.",
  });

  const endedAt = completionAt;
  const simulatedRun: AgentExecutionProjection = {
    ...baseline,
    id: `simulation:${baseline.id}:${seed}`,
    traceId: `simulation:${baseline.traceId}:${seed}`,
    name: `${baseline.name} — simulated`,
    status: state.status,
    endedAt,
    latencySeconds: Math.max(
      0,
      (endedAt.getTime() - baseline.startedAt.getTime()) / 1_000,
    ),
    events: state.events,
  };
  const comparison: SimulationComparison = {
    baselineStatus: baseline.status,
    simulatedStatus: simulatedRun.status,
    baselineDurationSeconds: baseline.latencySeconds,
    simulatedDurationSeconds: simulatedRun.latencySeconds,
    statusChanged: baseline.status !== simulatedRun.status,
    durationDeltaSeconds:
      (simulatedRun.latencySeconds ?? 0) - (baseline.latencySeconds ?? 0),
    changedEvents: state.differences,
    addedReasoningEventIds: state.addedReasoningEventIds,
  };
  return {
    reasoningOrigin: "FIXTURE_POLICY",
    simulatedRun,
    comparison,
  };
}
