import type {
  AgentDecisionEvidence,
  AgentDecisionRisk,
} from "@langfuse/shared";

export type DecisionBranchFilter = "ALL" | "SELECTED" | "REJECTED";
export type DecisionRiskFilter = "ALL" | AgentDecisionRisk;

function searchableDecisionText(decision: AgentDecisionEvidence) {
  return [
    decision.eventName,
    decision.selectedDecision,
    decision.reason,
    decision.agent.name,
    decision.risk,
    decision.executionImpact,
    ...decision.alternatives.flatMap((alternative) => [
      alternative.title,
      alternative.reason,
      alternative.risk,
      alternative.executionImpact,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

export function filterDecisions({
  decisions,
  search,
  branch,
  risk,
}: {
  decisions: AgentDecisionEvidence[];
  search: string;
  branch: DecisionBranchFilter;
  risk: DecisionRiskFilter;
}) {
  const query = search.trim().toLocaleLowerCase();
  return decisions.filter(
    (decision) =>
      (branch === "ALL" ||
        decision.alternatives.some(
          (alternative) => alternative.disposition === branch,
        )) &&
      (risk === "ALL" || decision.risk === risk) &&
      (!query || searchableDecisionText(decision).includes(query)),
  );
}

export function riskPresentation(risk: AgentDecisionRisk) {
  switch (risk) {
    case "LOW":
      return "text-emerald-700 dark:text-emerald-300";
    case "MEDIUM":
      return "text-amber-700 dark:text-amber-300";
    case "HIGH":
    case "CRITICAL":
      return "text-red-700 dark:text-red-300";
    default:
      return "text-muted-foreground";
  }
}
