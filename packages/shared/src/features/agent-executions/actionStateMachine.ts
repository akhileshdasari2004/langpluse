export type ExecutionActionStatus =
  | "BLOCKED" | "APPROVED" | "QUEUED" | "DISPATCHING" | "SUCCEEDED"
  | "FAILED" | "REQUIRES_RECONCILIATION" | "CANCELLED";

const transitions: Record<ExecutionActionStatus, readonly ExecutionActionStatus[]> = {
  BLOCKED: ["APPROVED", "CANCELLED"], APPROVED: ["QUEUED", "CANCELLED"],
  QUEUED: ["DISPATCHING", "CANCELLED"], DISPATCHING: ["SUCCEEDED", "FAILED", "QUEUED", "REQUIRES_RECONCILIATION"],
  SUCCEEDED: [], FAILED: ["QUEUED", "CANCELLED"], REQUIRES_RECONCILIATION: ["SUCCEEDED", "FAILED", "CANCELLED"], CANCELLED: [],
};
export function canTransitionAction(from: ExecutionActionStatus, to: ExecutionActionStatus) { return transitions[from].includes(to); }
export function retryDelayMs(retryCount: number) { return Math.min(60_000, 1_000 * 2 ** Math.min(retryCount, 6)); }
export function classifyActionFailure(error: { status?: number; code?: string } | undefined) {
  if (error?.status === 429 || (error?.status ?? 0) >= 500 || error?.code === "ECONNRESET") return "RETRYABLE" as const;
  if (error?.code === "ETIMEDOUT") return "RECONCILE" as const;
  return "PERMANENT" as const;
}
