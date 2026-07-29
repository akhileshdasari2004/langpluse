import { describe, expect, it } from "vitest";
import type { AgentExecutionEvent } from "@langfuse/shared";
import { filterSemanticTimelineEvents } from "./semanticTimelineRows";

const baseEvent: AgentExecutionEvent = {
  id: "event-1",
  parentEventId: null,
  category: "TOOL_CALL",
  categoryProvenance: "EXPLICIT",
  confidence: 0.97,
  name: "Enrich account in Salesforce",
  observationType: "SPAN",
  level: "DEFAULT",
  status: "COMPLETED",
  statusMessage: null,
  startedAt: new Date("2026-07-29T00:00:00.000Z"),
  endedAt: new Date("2026-07-29T00:00:00.300Z"),
  latencySeconds: 0.3,
  apiLatencyMs: 284,
  toolUsed: "salesforce.lookup_account",
  reasoningSummary: "Validated the account tier before drafting outreach.",
  agent: null,
  metadata: { account: "Acme Industries" },
};

describe("filterSemanticTimelineEvents", () => {
  it("searches names, tools, reasoning summaries, and metadata", () => {
    for (const search of ["enrich", "salesforce", "validated", "acme"]) {
      expect(
        filterSemanticTimelineEvents([baseEvent], {
          search,
          category: "ALL",
          status: "ALL",
        }),
      ).toEqual([baseEvent]);
    }
  });

  it("combines category and status filters", () => {
    expect(
      filterSemanticTimelineEvents([baseEvent], {
        search: "",
        category: "TOOL_CALL",
        status: "FAILED",
      }),
    ).toEqual([]);
  });
});
