# Mission Control Founder Demo

Mission Control is an enterprise AI-agent execution control plane built on
Langfuse open-source infrastructure. It follows a Northstar Logistics customer
request from planner reasoning through policy enforcement and human approval to
a durable, idempotent business-action outbox. It never fabricates an external
delivery.

## Five-minute click path

1. Open the Northstar Logistics renewal run from Mission Control.
2. In **Live timeline**, show the customer request, planner, reasoning, CRM/ERP checks, and policy gate.
3. Open **Agent Brain** to show the selected customer-email action and rejected alternatives.
4. Open **Exceptions** and review why sensitive commercial claims were blocked.
5. Approve the action as the authorized operator.
6. Open **Outbox** to show the durable action and stable idempotency key.
7. Explain that a worker claims the action once and reaches the Gmail connector boundary. Without credentials it fails closed; no email or provider ID is invented.
8. Use **Replay** to step through the same evidence.
9. Close on the audit trail: every human decision and action state is attributable.

## Loom narration

“A customer renewal request arrives. The planner turns it into a proposed
customer email, but policy blocks the sensitive claim. An operator reviews the
evidence and approves the action. The action becomes a durable outbox request
with an idempotency key. A configured connector could deliver it once; this
demo has no Gmail credentials, so it stops honestly at the connector boundary.
The complete execution remains inspectable, replayable, and auditable.”

## Screenshots to capture

1. Live Timeline: customer request through policy gate.
2. Agent Brain: action selection and alternatives.
3. Exception Desk: evidence and approval.
4. Outbox: queued action and idempotency key.
5. Replay toolbar beside the completed run.
