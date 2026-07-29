import { z } from "zod";
import {
  AgentExecutionProjectionSchema,
  AgentExecutionStatus,
} from "../agent-executions/schema";

export const SimulationConditionType = z.enum([
  "CRM_OFFLINE",
  "SLACK_FAILURE",
  "ERP_TIMEOUT",
  "MEMORY_MISSING",
  "CUSTOMER_REPLY",
  "TOOL_FAILURE",
  "RATE_LIMIT",
  "DIFFERENT_MODEL",
]);

export type SimulationConditionType = z.infer<typeof SimulationConditionType>;

export const CustomerReplyIntent = z.enum([
  "POSITIVE",
  "NEGOTIATION",
  "UNSUBSCRIBE",
]);

export type CustomerReplyIntent = z.infer<typeof CustomerReplyIntent>;

export const SimulationConditionSchema = z.object({
  type: SimulationConditionType,
  customerReplyIntent: CustomerReplyIntent.optional(),
  model: z.string().trim().min(1).max(160).optional(),
});

export type SimulationCondition = z.infer<typeof SimulationConditionSchema>;

export const SimulationScenarioDefinitionSchema = z
  .object({
    sourceRunId: z.string().min(1),
    conditions: z
      .array(SimulationConditionSchema)
      .min(1)
      .max(8)
      .superRefine((conditions, ctx) => {
        const encountered = new Set<SimulationConditionType>();
        for (const [index, condition] of conditions.entries()) {
          if (encountered.has(condition.type)) {
            ctx.addIssue({
              code: "custom",
              message: "Each simulation condition can be selected once.",
              path: [index, "type"],
            });
          }
          encountered.add(condition.type);

          if (
            condition.type === "CUSTOMER_REPLY" &&
            !condition.customerReplyIntent
          ) {
            ctx.addIssue({
              code: "custom",
              message: "Customer reply simulations require a reply intent.",
              path: [index, "customerReplyIntent"],
            });
          }
          if (condition.type === "DIFFERENT_MODEL" && !condition.model) {
            ctx.addIssue({
              code: "custom",
              message: "Different model simulations require a model label.",
              path: [index, "model"],
            });
          }
        }
      }),
  })
  .strict();

export type SimulationScenarioDefinition = z.infer<
  typeof SimulationScenarioDefinitionSchema
>;

export const SimulationRunStatus = z.enum([
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
]);

export type SimulationRunStatus = z.infer<typeof SimulationRunStatus>;

export const SimulationReasoningOrigin = z.enum(["FIXTURE_POLICY"]);

export type SimulationReasoningOrigin = z.infer<
  typeof SimulationReasoningOrigin
>;

export const SimulationEventDifferenceSchema = z.object({
  eventId: z.string().min(1),
  baselineEventId: z.string().min(1).nullable(),
  kind: z.enum(["ADDED", "CHANGED", "REMOVED"]),
  summary: z.string().min(1),
});

export type SimulationEventDifference = z.infer<
  typeof SimulationEventDifferenceSchema
>;

export const SimulationComparisonSchema = z.object({
  baselineStatus: AgentExecutionStatus,
  simulatedStatus: AgentExecutionStatus,
  baselineDurationSeconds: z.number().nonnegative().nullable(),
  simulatedDurationSeconds: z.number().nonnegative().nullable(),
  statusChanged: z.boolean(),
  durationDeltaSeconds: z.number(),
  changedEvents: z.array(SimulationEventDifferenceSchema),
  addedReasoningEventIds: z.array(z.string().min(1)),
});

export type SimulationComparison = z.infer<typeof SimulationComparisonSchema>;

export const SimulationExecutionResultSchema = z.object({
  reasoningOrigin: SimulationReasoningOrigin,
  simulatedRun: AgentExecutionProjectionSchema,
  comparison: SimulationComparisonSchema,
});

export type SimulationExecutionResult = z.infer<
  typeof SimulationExecutionResultSchema
>;

export const SimulationFixtureInputSchema = z.object({
  baseline: AgentExecutionProjectionSchema,
  scenario: SimulationScenarioDefinitionSchema,
  seed: z.string().min(1).max(160),
});

export type SimulationFixtureInput = z.infer<
  typeof SimulationFixtureInputSchema
>;
