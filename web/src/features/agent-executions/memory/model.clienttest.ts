import type { AgentMemoryEvidence } from "@langfuse/shared";
import {
  filterAndSortMemories,
  formatMemoryFreshness,
  getMemoryFreshnessBand,
} from "./model";

const memory = (
  id: string,
  overrides: Partial<AgentMemoryEvidence> = {},
): AgentMemoryEvidence => ({
  id,
  memoryId: id,
  eventId: "retrieval",
  eventName: "retrieve-account-memory",
  eventStartedAt: new Date("2026-07-29T09:29:59.800Z"),
  disposition: "RETRIEVED",
  content: `Memory ${id}`,
  similarity: 0.8,
  confidence: 0.9,
  embeddingDistance: 0.2,
  source: "Customer success notes",
  createdAt: new Date("2026-07-28T09:30:00.000Z"),
  retrievedAt: new Date("2026-07-29T09:30:00.000Z"),
  freshnessSeconds: 86_400,
  retrievalTimeMs: 80,
  reasonUsed: "Supports the renewal objective",
  reasonIgnored: null,
  businessContext: "Northstar renewal",
  relationshipIds: [],
  provenance: "EXPLICIT",
  agent: {
    key: "memory-agent",
    name: "Memory Agent",
    version: "1.0",
    provenance: "EXPLICIT",
  },
  ...overrides,
});

describe("memory explorer model", () => {
  it("classifies and formats freshness without fabricating missing values", () => {
    expect(getMemoryFreshnessBand(6 * 86_400)).toBe("FRESH");
    expect(getMemoryFreshnessBand(30 * 86_400)).toBe("AGING");
    expect(getMemoryFreshnessBand(120 * 86_400)).toBe("STALE");
    expect(getMemoryFreshnessBand(null)).toBe("UNKNOWN");
    expect(formatMemoryFreshness(null)).toBe("Not emitted");
    expect(formatMemoryFreshness(11 * 3_600)).toBe("11h old");
  });

  it("filters by status, freshness, source, and local content search", () => {
    const memories = [
      memory("fresh"),
      memory("stale", {
        disposition: "REJECTED",
        source: "Archive",
        freshnessSeconds: 120 * 86_400,
        reasonIgnored: "Expired commercial approval",
      }),
    ];

    expect(
      filterAndSortMemories({
        memories,
        search: "expired",
        disposition: "REJECTED",
        freshness: "STALE",
        source: "Archive",
        sort: "RELEVANCE",
      }).map((item) => item.id),
    ).toEqual(["stale"]);
  });

  it("sorts deterministically with missing evidence last", () => {
    const memories = [
      memory("unknown", { similarity: null }),
      memory("high", { similarity: 0.96 }),
      memory("medium", { similarity: 0.84 }),
    ];

    expect(
      filterAndSortMemories({
        memories,
        search: "",
        disposition: "ALL",
        freshness: "ALL",
        source: "ALL",
        sort: "RELEVANCE",
      }).map((item) => item.id),
    ).toEqual(["high", "medium", "unknown"]);
  });
});
