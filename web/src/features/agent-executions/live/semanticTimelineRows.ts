import type { AgentExecutionEvent } from "@langfuse/shared";

export type SemanticTimelineFilters = {
  search: string;
  category: AgentExecutionEvent["category"] | "ALL";
  status: AgentExecutionEvent["status"] | "ALL";
};

export function filterSemanticTimelineEvents(
  events: AgentExecutionEvent[],
  filters: SemanticTimelineFilters,
): AgentExecutionEvent[] {
  const query = filters.search.trim().toLocaleLowerCase();

  return events.filter((event) => {
    if (filters.category !== "ALL" && event.category !== filters.category) {
      return false;
    }
    if (filters.status !== "ALL" && event.status !== filters.status) {
      return false;
    }
    if (!query) return true;

    const searchableText = [
      event.name,
      event.category,
      event.status,
      event.toolUsed,
      event.reasoningSummary,
      event.statusMessage,
      JSON.stringify(event.metadata),
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    return searchableText.includes(query);
  });
}

export function getAvailableTimelineCategories(
  events: AgentExecutionEvent[],
): AgentExecutionEvent["category"][] {
  return [...new Set(events.map((event) => event.category))].sort();
}
