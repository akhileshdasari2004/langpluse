import {
  AgentExecutionEventSchema,
  AgentExecutionProjectionSchema,
  AgentExecutionStatus,
} from "@langfuse/shared";
import { z } from "zod";

export const StreamAgentExecutionEventSchema = AgentExecutionEventSchema.extend(
  {
    startedAt: z.coerce.date(),
    endedAt: z.coerce.date().nullable(),
  },
);

export const StreamAgentExecutionProjectionSchema =
  AgentExecutionProjectionSchema.extend({
    startedAt: z.coerce.date(),
    endedAt: z.coerce.date().nullable(),
    events: z.array(StreamAgentExecutionEventSchema),
  });

const cursorSchema = z.string().min(1).max(500);

export const RunStreamMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("snapshot"),
    cursor: cursorSchema.nullable(),
    replace: z.boolean(),
    projection: StreamAgentExecutionProjectionSchema,
  }),
  z.object({
    type: z.literal("append"),
    cursor: cursorSchema,
    event: StreamAgentExecutionEventSchema,
  }),
  z.object({
    type: z.literal("correction"),
    cursor: cursorSchema,
    event: StreamAgentExecutionEventSchema,
  }),
  z.object({
    type: z.literal("heartbeat"),
    cursor: cursorSchema.nullable(),
    serverTime: z.coerce.date(),
    queryLatencyMs: z.number().nonnegative(),
  }),
  z.object({
    type: z.literal("completion"),
    cursor: cursorSchema.nullable(),
    status: AgentExecutionStatus.extract(["SUCCEEDED", "FAILED"]),
    endedAt: z.coerce.date(),
  }),
  z.object({
    type: z.literal("error"),
    message: z.string().min(1).max(500),
    retryable: z.boolean(),
  }),
]);

export type RunStreamMessage = z.infer<typeof RunStreamMessageSchema>;

export const RunStreamQuerySchema = z.object({
  projectId: z.string().min(1).max(200),
  runId: z.string().min(1).max(200),
  timestamp: z.coerce.date().optional(),
  demo: z
    .enum(["0", "1"])
    .optional()
    .transform((value) => value === "1"),
});
