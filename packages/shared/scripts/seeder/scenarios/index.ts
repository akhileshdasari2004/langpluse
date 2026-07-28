import { agentTimelineScenario } from "./agent-timeline";
import { annotationQueueScenario } from "./annotation-queue";
import { deepChainScenario } from "./deep-chain";
import { longSessionScenario } from "./long-session";
import { manyTracesScenario } from "./many-traces";
import { scoredTracesScenario } from "./scored-traces";
import { salesEmailAgentScenario } from "./sales-email-agent";
import { sessionShapesScenario } from "./session-shapes";
import { supportAgentScenario } from "./support-agent";
import { traceTreeScenario } from "./trace-tree";
import { ScenarioDefinition } from "./types";

/**
 * Scenario registry. Names are part of the CLI contract — additive only.
 */
export const scenarios: Record<string, ScenarioDefinition> = {
  "trace-tree": traceTreeScenario,
  "agent-timeline": agentTimelineScenario,
  "deep-chain": deepChainScenario,
  "long-session": longSessionScenario,
  "many-traces": manyTracesScenario,
  "scored-traces": scoredTracesScenario,
  "sales-email-agent": salesEmailAgentScenario,
  "session-shapes": sessionShapesScenario,
  "annotation-queue": annotationQueueScenario,
  "support-agent": supportAgentScenario,
};

export * from "./types";
