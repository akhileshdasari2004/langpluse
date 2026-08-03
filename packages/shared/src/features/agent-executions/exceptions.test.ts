import { describe, expect, it } from "vitest";

import {
  AgentExecutionExceptionRecordSchema,
  AgentExecutionExceptionResolveSchema,
  exceptionDecisionToStatus,
} from "./exceptions";

const baseRecord = {
  projectId: "project-1",
  runId: "run-1",
  dedupeKey: "customer-policy-conflict",
  type: "CUSTOMER_POLICY_CONFLICT" as const,
  severity: "HIGH" as const,
  title: "Approval required",
  summary: "The customer policy needs an operator decision.",
};

describe("agent execution exception contracts", () => {
  it("accepts bounded, structured evidence", () => {
    const parsed = AgentExecutionExceptionRecordSchema.safeParse({
      ...baseRecord,
      evidence: { approval_policy: "manager_required", claims_checked: 3 },
      sourceEventIds: ["decision", "approval"],
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects oversized evidence payloads", () => {
    const parsed = AgentExecutionExceptionRecordSchema.safeParse({
      ...baseRecord,
      evidence: Object.fromEntries(
        Array.from({ length: 25 }, (_, index) => [`field_${index}`, index]),
      ),
    });

    expect(parsed.success).toBe(false);
  });

  it("requires an operator reason for reject and escalate decisions", () => {
    for (const decision of ["REJECT", "ESCALATE"] as const) {
      expect(
        AgentExecutionExceptionResolveSchema.safeParse({
          projectId: "project-1",
          exceptionId: "exception-1",
          expectedVersion: 1,
          decision,
        }).success,
      ).toBe(false);
    }
  });

  it("maps terminal decisions to their persisted statuses", () => {
    expect(exceptionDecisionToStatus("APPROVE")).toBe("APPROVED");
    expect(exceptionDecisionToStatus("REJECT")).toBe("REJECTED");
    expect(exceptionDecisionToStatus("ESCALATE")).toBe("ESCALATED");
  });
});
