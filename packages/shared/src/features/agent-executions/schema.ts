import { z } from "zod";
import { jsonSchema } from "../../utils/zod";

export const AgentExecutionEventCategory = z.enum([
  "TASK_RECEIVED",
  "PLANNING",
  "REASONING",
  "MEMORY_RETRIEVAL",
  "DECISION",
  "TOOL_CALL",
  "OBSERVATION",
  "RETRY",
  "HANDOFF",
  "APPROVAL",
  "COMPLETION",
  "FAILURE",
  "UNKNOWN",
]);

export type AgentExecutionEventCategory = z.infer<
  typeof AgentExecutionEventCategory
>;

export const AgentExecutionProvenance = z.enum(["EXPLICIT", "INFERRED", "RAW"]);

export type AgentExecutionProvenance = z.infer<typeof AgentExecutionProvenance>;

export const AgentExecutionStatus = z.enum([
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "UNKNOWN",
]);

export type AgentExecutionStatus = z.infer<typeof AgentExecutionStatus>;

export const AgentIdentitySchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  version: z.string().nullable(),
  provenance: AgentExecutionProvenance,
});

export type AgentIdentity = z.infer<typeof AgentIdentitySchema>;

export const AgentExecutionEventSchema = z.object({
  id: z.string().min(1),
  parentEventId: z.string().nullable(),
  category: AgentExecutionEventCategory,
  categoryProvenance: AgentExecutionProvenance,
  confidence: z.number().min(0).max(1),
  name: z.string().min(1),
  observationType: z.string().min(1),
  level: z.string().min(1),
  statusMessage: z.string().nullable(),
  startedAt: z.date(),
  endedAt: z.date().nullable(),
  latencySeconds: z.number().nonnegative().nullable(),
  agent: AgentIdentitySchema.nullable(),
  metadata: z.record(z.string(), jsonSchema.nullable().or(z.undefined())),
});

export type AgentExecutionEvent = z.infer<typeof AgentExecutionEventSchema>;

export const AgentExecutionProjectionSchema = z.object({
  id: z.string().min(1),
  traceId: z.string().min(1),
  projectId: z.string().min(1),
  name: z.string().min(1),
  status: AgentExecutionStatus,
  startedAt: z.date(),
  endedAt: z.date().nullable(),
  latencySeconds: z.number().nonnegative().nullable(),
  agent: AgentIdentitySchema,
  events: z.array(AgentExecutionEventSchema),
});

export type AgentExecutionProjection = z.infer<
  typeof AgentExecutionProjectionSchema
>;

export const AgentRegistryMetadataSchema = z.record(z.string(), jsonSchema);

export const AgentRegistryUpsertSchema = z.object({
  projectId: z.string().min(1),
  stableKey: z.string().trim().min(1).max(200),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2_000).nullable().optional(),
  version: z.string().trim().max(200).nullable().optional(),
  owner: z.string().trim().max(200).nullable().optional(),
  team: z.string().trim().max(200).nullable().optional(),
  metadata: AgentRegistryMetadataSchema.nullable().optional(),
  firstSeenAt: z.date().nullable().optional(),
  lastSeenAt: z.date().nullable().optional(),
});

export type AgentRegistryUpsert = z.infer<typeof AgentRegistryUpsertSchema>;
