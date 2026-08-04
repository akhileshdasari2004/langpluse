import { describe, expect, it } from "vitest";
import { canTransitionAction, classifyActionFailure, retryDelayMs } from "./actionStateMachine";
describe("agent action state machine", () => {
  it("allows only safe transitions", () => { expect(canTransitionAction("BLOCKED", "APPROVED")).toBe(true); expect(canTransitionAction("SUCCEEDED", "QUEUED")).toBe(false); });
  it("classifies timeout for reconciliation", () => { expect(classifyActionFailure({ code: "ETIMEDOUT" })).toBe("RECONCILE"); expect(classifyActionFailure({ status: 429 })).toBe("RETRYABLE"); });
  it("bounds backoff", () => expect(retryDelayMs(99)).toBe(60_000));
});
