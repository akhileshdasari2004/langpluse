import { describe, expect, it } from "vitest";
import type { AgentExecutionSourceEvent } from "./types";
import { projectAgentExecution } from "./classification";
import { buildAgentMemoryProjection } from "./memory";

const startedAt = new Date("2026-07-29T09:30:00.000Z");

const event = (
  id: string,
  metadata: AgentExecutionSourceEvent["metadata"],
): AgentExecutionSourceEvent => ({
  id,
  parentObservationId: "root",
  name: "retrieve-account-memory",
  type: "RETRIEVER",
  level: "DEFAULT",
  statusMessage: null,
  startTime: startedAt,
  endTime: new Date(startedAt.getTime() + 790),
  version: "1.0",
  metadata: {
    "mission_control.event.category": "memory_retrieval",
    "mission_control.event.confidence": 0.92,
    "mission_control.agent.key": "memory-agent",
    "mission_control.agent.name": "Memory Agent",
    ...metadata,
  },
});

const projection = (memoryEvent: AgentExecutionSourceEvent) =>
  projectAgentExecution({
    trace: {
      id: "run-1",
      projectId: "project-1",
      name: "Enterprise sales email",
      timestamp: startedAt,
      version: "1.0",
      metadata: {
        "mission_control.agent.key": "orchestrator",
        "mission_control.agent.name": "Execution Orchestrator",
      },
    },
    events: [memoryEvent],
  });

describe("buildAgentMemoryProjection", () => {
  it("projects retrieved and rejected memories with auditable evidence", () => {
    const memories = [
      {
        id: "eu-residency",
        content: "Customer requested EU data residency at renewal.",
        disposition: "retrieved",
        similarity: 0.94,
        confidence: 0.97,
        embeddingDistance: 0.06,
        source: "Customer success notes",
        createdAt: "2026-07-26T09:30:00.000Z",
        retrievedAt: "2026-07-29T09:30:00.180Z",
        retrievalTimeMs: 84,
        reasonUsed: "Directly supports the renewal value proposition.",
        businessContext: "Northstar Logistics renewal",
        relationships: [{ memoryId: "stale-discount", type: "CONTRADICTS" }],
      },
      {
        id: "stale-discount",
        content: "A 2024 discount exception was approved.",
        disposition: "rejected",
        similarity: 0.86,
        confidence: 0.99,
        embeddingDistance: 0.14,
        source: "Commercial approvals archive",
        createdAt: "2024-05-12T10:00:00.000Z",
        retrievedAt: "2026-07-29T09:30:00.300Z",
        retrievalTimeMs: 93,
        reasonIgnored: "The approval expired and does not apply to this term.",
      },
    ];
    const result = buildAgentMemoryProjection(
      projection(
        event("memory", {
          "mission_control.memory.items": JSON.stringify(memories),
        }),
      ),
    );

    expect(result).toMatchObject({
      retrievedCount: 1,
      rejectedCount: 1,
      averageRetrievalTimeMs: 88.5,
    });
    expect(result.averageSimilarity).toBeCloseTo(0.9);
    expect(result.memories[0]).toMatchObject({
      id: "memory:eu-residency",
      disposition: "RETRIEVED",
      confidence: 0.97,
      freshnessSeconds: 259_200.18,
      reasonUsed: "Directly supports the renewal value proposition.",
      relationshipIds: ["memory:stale-discount"],
      provenance: "EXPLICIT",
      agent: { key: "memory-agent", name: "Memory Agent" },
    });
    expect(result.memories[1]).toMatchObject({
      disposition: "REJECTED",
      reasonIgnored: "The approval expired and does not apply to this term.",
      relationshipIds: ["memory:eu-residency"],
    });
    expect(result.relationships).toEqual([
      {
        id: "memory:eu-residency->memory:stale-discount:CONTRADICTS",
        source: "memory:eu-residency",
        target: "memory:stale-discount",
        type: "CONTRADICTS",
        provenance: "EXPLICIT",
      },
    ]);
  });

  it("keeps legacy retrieval evidence without inventing memory content", () => {
    const result = buildAgentMemoryProjection(
      projection(
        event("legacy-memory", {
          "mission_control.memory.source": "Vector store",
          "mission_control.reasoning.summary":
            "The retrieval result informed the plan.",
        }),
      ),
    );

    expect(result.memories).toEqual([
      expect.objectContaining({
        id: "legacy-memory:retrieval",
        content: null,
        similarity: null,
        embeddingDistance: null,
        source: "Vector store",
        reasonUsed: "The retrieval result informed the plan.",
        provenance: "EXPLICIT",
      }),
    ]);
  });

  it("ignores malformed instrumented entries and unresolved relationships", () => {
    const result = buildAgentMemoryProjection(
      projection(
        event("memory", {
          "mission_control.memory.items": JSON.stringify([
            {
              id: "valid",
              content: "Verified account preference",
              similarity: 0.88,
              relationships: [
                { memoryId: "missing", type: "SUPPORTS" },
                { memoryId: "valid", type: "SAME_ENTITY" },
              ],
            },
            { id: "", similarity: 2 },
          ]),
        }),
      ),
    );

    expect(result.memories).toHaveLength(1);
    expect(result.memories[0].memoryId).toBe("valid");
    expect(result.relationships).toEqual([]);
  });

  it("projects 5,000 memory records with stable counts", () => {
    const items = Array.from({ length: 5_000 }, (_, index) => ({
      id: `memory-${index}`,
      content: `Memory evidence ${index}`,
      disposition: index % 5 === 0 ? "rejected" : "retrieved",
      similarity: 0.8,
      confidence: 0.9,
      embeddingDistance: 0.2,
      source: `source-${index % 4}`,
      retrievalTimeMs: 25 + (index % 10),
    }));
    const result = buildAgentMemoryProjection(
      projection(
        event("memory", {
          "mission_control.memory.items": items,
        }),
      ),
    );

    expect(result.memories).toHaveLength(5_000);
    expect(result.retrievedCount).toBe(4_000);
    expect(result.rejectedCount).toBe(1_000);
    expect(result.averageSimilarity).toBeCloseTo(0.8);
  });
});
