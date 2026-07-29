import type { AgentDecisionEvidence } from "@langfuse/shared";
import { describe, expect, it } from "vitest";
import { filterDecisions, riskPresentation } from "./model";

const decision = (
  id: string,
  overrides: Partial<AgentDecisionEvidence> = {},
): AgentDecisionEvidence => ({
  id,
  eventId: id,
  eventName: "select-outreach-strategy",
  startedAt: new Date("2026-07-29T09:30:00.000Z"),
  selectedDecision: "Value-led renewal",
  reason: "Verified CRM evidence supports a relevant renewal outreach path.",
  confidence: 0.91,
  risk: "LOW",
  executionImpact: "POSITIVE",
  dependencyIds: ["crm"],
  dependencyProvenance: "EXPLICIT",
  alternatives: [
    {
      id: `${id}:selected`,
      decisionId: id,
      title: "Value-led renewal",
      disposition: "SELECTED",
      reason: "Verified account priorities are current.",
      confidence: 0.91,
      risk: "LOW",
      executionImpact: "POSITIVE",
      dependencyIds: ["crm"],
      provenance: "EXPLICIT",
    },
    {
      id: `${id}:rejected`,
      decisionId: id,
      title: "Discount-led outreach",
      disposition: "REJECTED",
      reason: "No approved concession exists.",
      confidence: 0.94,
      risk: "HIGH",
      executionImpact: "NEGATIVE",
      dependencyIds: ["crm"],
      provenance: "EXPLICIT",
    },
  ],
  provenance: "EXPLICIT",
  agent: {
    key: "planner-agent",
    name: "Planner Agent",
    version: "1.0.0",
    provenance: "EXPLICIT",
  },
  ...overrides,
});

describe("decision explorer model", () => {
  it("filters decision evidence by local search, branch state, and decision risk", () => {
    const decisions = [
      decision("strategy"),
      decision("delivery", {
        selectedDecision: "Manager-approved email",
        risk: "MEDIUM",
        alternatives: [],
      }),
    ];

    expect(
      filterDecisions({
        decisions,
        search: "concession",
        branch: "REJECTED",
        risk: "LOW",
      }).map((item) => item.id),
    ).toEqual(["strategy"]);
    expect(
      filterDecisions({
        decisions,
        search: "",
        branch: "SELECTED",
        risk: "MEDIUM",
      }),
    ).toEqual([]);
  });

  it("keeps risk presentation aligned with the evidence level", () => {
    expect(riskPresentation("LOW")).toContain("emerald");
    expect(riskPresentation("MEDIUM")).toContain("amber");
    expect(riskPresentation("CRITICAL")).toContain("red");
    expect(riskPresentation("UNKNOWN")).toContain("muted");
  });
});
