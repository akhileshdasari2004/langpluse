import { z } from "zod";

const boundedEvidenceValue = z.union([
  z.string().max(1_000),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const ExecutionExceptionType = z.enum([
  "PO_FIELD_AMBIGUITY",
  "CUSTOMER_POLICY_CONFLICT",
  "TOOL_FAILURE",
  "DATA_MISMATCH",
  "DEADLINE_RISK",
]);

export type ExecutionExceptionType = z.infer<typeof ExecutionExceptionType>;

export const ExecutionExceptionSeverity = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export type ExecutionExceptionSeverity = z.infer<
  typeof ExecutionExceptionSeverity
>;

export const ExecutionExceptionStatus = z.enum([
  "OPEN",
  "APPROVED",
  "REJECTED",
  "ESCALATED",
]);

export type ExecutionExceptionStatus = z.infer<typeof ExecutionExceptionStatus>;

export const AgentExecutionExceptionDecision = z.enum([
  "APPROVE",
  "REJECT",
  "ESCALATE",
]);

export type AgentExecutionExceptionDecision = z.infer<
  typeof AgentExecutionExceptionDecision
>;

export const AgentExecutionExceptionRecordSchema = z
  .object({
    projectId: z.string().min(1),
    runId: z.string().min(1).max(255),
    eventId: z.string().min(1).max(255).nullable().optional(),
    dedupeKey: z.string().trim().min(1).max(160),
    type: ExecutionExceptionType,
    severity: ExecutionExceptionSeverity,
    title: z.string().trim().min(1).max(160),
    summary: z.string().trim().min(1).max(2_000),
    proposedAction: z.string().trim().min(1).max(2_000).nullable().optional(),
    evidence: z
      .record(z.string().min(1).max(96), boundedEvidenceValue)
      .superRefine((evidence, ctx) => {
        if (Object.keys(evidence).length > 24) {
          ctx.addIssue({
            code: "custom",
            message: "Exception evidence supports at most 24 fields.",
          });
        }
      })
      .nullable()
      .optional(),
    sourceEventIds: z.array(z.string().min(1).max(255)).max(24).default([]),
  })
  .strict();

export type AgentExecutionExceptionRecordInput = z.infer<
  typeof AgentExecutionExceptionRecordSchema
>;

export const AgentExecutionExceptionResolveSchema = z
  .object({
    projectId: z.string().min(1),
    exceptionId: z.string().min(1),
    expectedVersion: z.number().int().positive(),
    decision: AgentExecutionExceptionDecision,
    resolutionReason: z.string().trim().max(1_000).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      (value.decision === "REJECT" || value.decision === "ESCALATE") &&
      (!value.resolutionReason || value.resolutionReason.length < 4)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["resolutionReason"],
        message: "Rejecting or escalating requires an operator reason.",
      });
    }
  });

export type AgentExecutionExceptionResolveInput = z.infer<
  typeof AgentExecutionExceptionResolveSchema
>;

export function exceptionDecisionToStatus(
  decision: AgentExecutionExceptionDecision,
): Exclude<ExecutionExceptionStatus, "OPEN"> {
  switch (decision) {
    case "APPROVE":
      return "APPROVED";
    case "REJECT":
      return "REJECTED";
    case "ESCALATE":
      return "ESCALATED";
  }
}
