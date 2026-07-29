import { z } from "zod";
import {
  AgentExecutionProvenance,
  AgentExecutionStatus,
  AgentIdentitySchema,
  type AgentExecutionEvent,
  type AgentExecutionProjection,
} from "./schema";

export const MISSION_CONTROL_MEMORY_METADATA_KEYS = {
  items: "mission_control.memory.items",
  source: "mission_control.memory.source",
  businessContext: "mission_control.memory.business_context",
} as const;

export const AgentMemoryDisposition = z.enum(["RETRIEVED", "REJECTED"]);
export type AgentMemoryDisposition = z.infer<typeof AgentMemoryDisposition>;

export const AgentMemoryRelationshipType = z.enum([
  "SUPPORTS",
  "CONTRADICTS",
  "SUPERSEDES",
  "SAME_ENTITY",
  "SAME_SOURCE",
]);
export type AgentMemoryRelationshipType = z.infer<
  typeof AgentMemoryRelationshipType
>;

const InstrumentedMemoryRelationshipSchema = z.object({
  memoryId: z.string().trim().min(1),
  type: AgentMemoryRelationshipType,
});

export const InstrumentedMemoryItemSchema = z.object({
  id: z.string().trim().min(1),
  content: z.string().nullable().optional(),
  disposition: z.enum(["retrieved", "rejected", "used", "ignored"]).optional(),
  similarity: z.number().min(0).max(1).nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  embeddingDistance: z.number().nonnegative().nullable().optional(),
  source: z.string().trim().min(1).nullable().optional(),
  createdAt: z.iso.datetime().nullable().optional(),
  retrievedAt: z.iso.datetime().nullable().optional(),
  freshnessSeconds: z.number().nonnegative().nullable().optional(),
  retrievalTimeMs: z.number().nonnegative().nullable().optional(),
  reasonUsed: z.string().trim().min(1).nullable().optional(),
  reasonIgnored: z.string().trim().min(1).nullable().optional(),
  businessContext: z.string().trim().min(1).nullable().optional(),
  relationships: z.array(InstrumentedMemoryRelationshipSchema).optional(),
});

export type InstrumentedMemoryItem = z.infer<
  typeof InstrumentedMemoryItemSchema
>;

export const AgentMemoryEvidenceSchema = z.object({
  id: z.string().min(1),
  memoryId: z.string().min(1),
  eventId: z.string().min(1),
  eventName: z.string().min(1),
  disposition: AgentMemoryDisposition,
  content: z.string().nullable(),
  similarity: z.number().min(0).max(1).nullable(),
  confidence: z.number().min(0).max(1),
  embeddingDistance: z.number().nonnegative().nullable(),
  source: z.string().nullable(),
  createdAt: z.date().nullable(),
  retrievedAt: z.date(),
  freshnessSeconds: z.number().nonnegative().nullable(),
  retrievalTimeMs: z.number().nonnegative().nullable(),
  reasonUsed: z.string().nullable(),
  reasonIgnored: z.string().nullable(),
  businessContext: z.string().nullable(),
  relationshipIds: z.array(z.string()),
  provenance: AgentExecutionProvenance,
  agent: AgentIdentitySchema,
});

export type AgentMemoryEvidence = z.infer<typeof AgentMemoryEvidenceSchema>;

export const AgentMemoryRelationshipSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  type: AgentMemoryRelationshipType,
  provenance: AgentExecutionProvenance,
});

export type AgentMemoryRelationship = z.infer<
  typeof AgentMemoryRelationshipSchema
>;

export const AgentMemoryProjectionSchema = z.object({
  runId: z.string().min(1),
  status: AgentExecutionStatus,
  memories: z.array(AgentMemoryEvidenceSchema),
  relationships: z.array(AgentMemoryRelationshipSchema),
  retrievedCount: z.number().int().nonnegative(),
  rejectedCount: z.number().int().nonnegative(),
  averageSimilarity: z.number().min(0).max(1).nullable(),
  averageRetrievalTimeMs: z.number().nonnegative().nullable(),
});

export type AgentMemoryProjection = z.infer<typeof AgentMemoryProjectionSchema>;

function parseInstrumentedItems(event: AgentExecutionEvent) {
  const value = event.metadata[MISSION_CONTROL_MEMORY_METADATA_KEYS.items];
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((item): InstrumentedMemoryItem[] => {
    const result = InstrumentedMemoryItemSchema.safeParse(item);
    return result.success ? [result.data] : [];
  });
}

function metadataString(event: AgentExecutionEvent, key: string) {
  const value = event.metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dispositionOf(
  value: InstrumentedMemoryItem["disposition"],
): AgentMemoryDisposition {
  return value === "rejected" || value === "ignored" ? "REJECTED" : "RETRIEVED";
}

function average(values: Array<number | null>) {
  const present = values.filter((value): value is number => value !== null);
  return present.length === 0
    ? null
    : present.reduce((sum, value) => sum + value, 0) / present.length;
}

export function buildAgentMemoryProjection(
  projection: AgentExecutionProjection,
): AgentMemoryProjection {
  const memoryEvents = projection.events.filter(
    (event) => event.category === "MEMORY_RETRIEVAL",
  );
  const pendingRelationships: Array<{
    sourceId: string;
    targetMemoryId: string;
    type: AgentMemoryRelationshipType;
  }> = [];

  const memories = memoryEvents.flatMap((event): AgentMemoryEvidence[] => {
    const items = parseInstrumentedItems(event);
    const agent = event.agent ?? projection.agent;
    const eventSource = metadataString(
      event,
      MISSION_CONTROL_MEMORY_METADATA_KEYS.source,
    );
    const eventBusinessContext = metadataString(
      event,
      MISSION_CONTROL_MEMORY_METADATA_KEYS.businessContext,
    );

    if (items.length === 0) {
      return [
        {
          id: `${event.id}:retrieval`,
          memoryId: event.id,
          eventId: event.id,
          eventName: event.name,
          disposition: "RETRIEVED",
          content: null,
          similarity: null,
          confidence: event.confidence,
          embeddingDistance: null,
          source: eventSource,
          createdAt: null,
          retrievedAt: event.startedAt,
          freshnessSeconds: null,
          retrievalTimeMs:
            event.latencySeconds === null ? null : event.latencySeconds * 1_000,
          reasonUsed: event.reasoningSummary,
          reasonIgnored: null,
          businessContext: eventBusinessContext,
          relationshipIds: [],
          provenance: event.categoryProvenance,
          agent,
        },
      ];
    }

    return items.map((item): AgentMemoryEvidence => {
      const id = `${event.id}:${item.id}`;
      const retrievedAt = toDate(item.retrievedAt) ?? event.startedAt;
      const createdAt = toDate(item.createdAt);
      const freshnessSeconds =
        item.freshnessSeconds ??
        (createdAt
          ? Math.max(0, (retrievedAt.getTime() - createdAt.getTime()) / 1_000)
          : null);
      const relationships = item.relationships ?? [];
      for (const relationship of relationships) {
        pendingRelationships.push({
          sourceId: id,
          targetMemoryId: relationship.memoryId,
          type: relationship.type,
        });
      }

      return {
        id,
        memoryId: item.id,
        eventId: event.id,
        eventName: event.name,
        disposition: dispositionOf(item.disposition),
        content: item.content ?? null,
        similarity: item.similarity ?? null,
        confidence: item.confidence ?? event.confidence,
        embeddingDistance: item.embeddingDistance ?? null,
        source: item.source ?? eventSource,
        createdAt,
        retrievedAt,
        freshnessSeconds,
        retrievalTimeMs:
          item.retrievalTimeMs ??
          (event.latencySeconds === null ? null : event.latencySeconds * 1_000),
        reasonUsed: item.reasonUsed ?? null,
        reasonIgnored: item.reasonIgnored ?? null,
        businessContext: item.businessContext ?? eventBusinessContext,
        relationshipIds: [],
        provenance: "EXPLICIT",
        agent,
      };
    });
  });

  const idByMemoryId = new Map(
    memories.map((memory) => [memory.memoryId, memory.id]),
  );
  const relationships = pendingRelationships.flatMap(
    (relationship): AgentMemoryRelationship[] => {
      const target = idByMemoryId.get(relationship.targetMemoryId);
      if (!target || target === relationship.sourceId) return [];
      return [
        {
          id: `${relationship.sourceId}->${target}:${relationship.type}`,
          source: relationship.sourceId,
          target,
          type: relationship.type,
          provenance: "EXPLICIT",
        },
      ];
    },
  );
  const relationshipIdsByMemory = new Map<string, string[]>();
  for (const relationship of relationships) {
    const sourceRelationships =
      relationshipIdsByMemory.get(relationship.source) ?? [];
    sourceRelationships.push(relationship.target);
    relationshipIdsByMemory.set(relationship.source, sourceRelationships);

    const targetRelationships =
      relationshipIdsByMemory.get(relationship.target) ?? [];
    targetRelationships.push(relationship.source);
    relationshipIdsByMemory.set(relationship.target, targetRelationships);
  }
  const linkedMemories = memories.map((memory) => ({
    ...memory,
    relationshipIds: [...new Set(relationshipIdsByMemory.get(memory.id) ?? [])],
  }));

  return {
    runId: projection.id,
    status: projection.status,
    memories: linkedMemories,
    relationships,
    retrievedCount: linkedMemories.filter(
      (memory) => memory.disposition === "RETRIEVED",
    ).length,
    rejectedCount: linkedMemories.filter(
      (memory) => memory.disposition === "REJECTED",
    ).length,
    averageSimilarity: average(
      linkedMemories.map((memory) => memory.similarity),
    ),
    averageRetrievalTimeMs: average(
      linkedMemories.map((memory) => memory.retrievalTimeMs),
    ),
  };
}
