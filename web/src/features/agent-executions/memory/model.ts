import type {
  AgentMemoryDisposition,
  AgentMemoryEvidence,
} from "@langfuse/shared";

export type MemoryFreshnessFilter = "ALL" | "FRESH" | "AGING" | "STALE";
export type MemoryDispositionFilter = "ALL" | AgentMemoryDisposition;
export type MemorySort = "RELEVANCE" | "RECENT" | "RETRIEVAL_TIME";

export function getMemoryFreshnessBand(
  freshnessSeconds: number | null,
): Exclude<MemoryFreshnessFilter, "ALL"> | "UNKNOWN" {
  if (freshnessSeconds === null) return "UNKNOWN";
  const days = freshnessSeconds / 86_400;
  if (days <= 7) return "FRESH";
  if (days <= 90) return "AGING";
  return "STALE";
}

export function formatMemoryFreshness(freshnessSeconds: number | null) {
  if (freshnessSeconds === null) return "Not emitted";
  const minutes = freshnessSeconds / 60;
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m old`;
  const hours = minutes / 60;
  if (hours < 48) return `${Math.round(hours)}h old`;
  const days = hours / 24;
  if (days < 60) return `${Math.round(days)}d old`;
  return `${Math.round(days / 30)}mo old`;
}

function searchableMemoryText(memory: AgentMemoryEvidence) {
  return [
    memory.content,
    memory.source,
    memory.reasonUsed,
    memory.reasonIgnored,
    memory.businessContext,
    memory.eventName,
    memory.agent.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

export function filterAndSortMemories({
  memories,
  search,
  disposition,
  freshness,
  source,
  sort,
}: {
  memories: AgentMemoryEvidence[];
  search: string;
  disposition: MemoryDispositionFilter;
  freshness: MemoryFreshnessFilter;
  source: string;
  sort: MemorySort;
}) {
  const query = search.trim().toLocaleLowerCase();
  const filtered = memories.filter(
    (memory) =>
      (disposition === "ALL" || memory.disposition === disposition) &&
      (freshness === "ALL" ||
        getMemoryFreshnessBand(memory.freshnessSeconds) === freshness) &&
      (source === "ALL" || memory.source === source) &&
      (!query || searchableMemoryText(memory).includes(query)),
  );

  return filtered.toSorted((left, right) => {
    if (sort === "RECENT") {
      return (
        right.retrievedAt.getTime() - left.retrievedAt.getTime() ||
        left.id.localeCompare(right.id)
      );
    }
    if (sort === "RETRIEVAL_TIME") {
      return (
        (right.retrievalTimeMs ?? -1) - (left.retrievalTimeMs ?? -1) ||
        left.id.localeCompare(right.id)
      );
    }
    return (
      (right.similarity ?? -1) - (left.similarity ?? -1) ||
      right.confidence - left.confidence ||
      left.id.localeCompare(right.id)
    );
  });
}
