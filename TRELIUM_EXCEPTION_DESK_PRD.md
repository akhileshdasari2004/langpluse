# Trelium Exception Desk

Status: IN PROGRESS

## Why this is the highest-signal feature

Trelium's agents act in customer systems. A safe production agent must stop on
ambiguous purchase-order data, policy conflicts, connector failures, and risky
customer-facing changes. A human operator needs an auditable decision surface,
not a decorative trace graph.

This feature turns the existing run workbench into a real control boundary:
operators can review a run-scoped exception and record an approval, rejection,
or escalation that a runtime may consume later.

## Product contract

### Users

- Operators review an exception with project read access.
- Engineers with project update access resolve an exception.
- Auditors inspect the immutable audit-log record through existing audit
  infrastructure.

### Supported exception types

- `PO_FIELD_AMBIGUITY`
- `CUSTOMER_POLICY_CONFLICT`
- `TOOL_FAILURE`
- `DATA_MISMATCH`
- `DEADLINE_RISK`

### State machine

```text
OPEN
 ├─ approve  → APPROVED
 ├─ reject   → REJECTED
 └─ escalate → ESCALATED
```

Terminal states cannot be changed through this feature. The expected version
must match the persisted version, so a stale browser cannot silently overwrite
another operator's resolution.

### Explicit non-goals

- No direct external-tool call.
- No generic agent resume claim.
- No new workflow runtime, connector, provider, queue, or global client store.
- No customer evidence in product analytics.

## Architecture

```text
Agent/runtime instrumentation or deterministic seed
             ↓
  AgentExecutionException (PostgreSQL control plane)
             ↓
project-scoped tRPC router and existing RBAC
             ↓
Run Workbench → Exception Desk
             ↓
existing immutable AuditLog record
             ↓
future runtime consumes approved/rejected/escalated decision
```

Raw execution data stays in ClickHouse. Mutable human control state belongs in
PostgreSQL because it must support authorization, optimistic concurrency,
auditing, retention and future runtime consumption.

## Database

`agent_execution_exceptions`

- `id`: opaque primary key.
- `project_id`: tenant boundary and FK to projects.
- `run_id`: trace/run correlation identifier; intentionally not a foreign key
  because telemetry is stored in ClickHouse and supports legacy/v4 readers.
- `event_id`: optional source event identifier.
- `dedupe_key`: stable producer key, unique per project/run for idempotent
  instrumentation writes.
- `type`, `severity`, `status`: constrained enums.
- `title`, `summary`, `proposed_action`: bounded operator-facing text.
- `evidence`: bounded structured JSON supplied by trusted instrumentation.
- `source_event_ids`: event correlation without a hot-path join.
- `resolution_reason`, `resolved_at`, `resolved_by_user_id`: terminal decision.
- `version`: optimistic concurrency version.

Indexes support run-local retrieval and operational queues by status/severity.

## API contracts

`agentExceptions.listForRun`

- Input: `projectId`, `runId`.
- Permission: `project:read`.
- Output: ordered exception records.

`agentExceptions.resolve`

- Input: `projectId`, `exceptionId`, `expectedVersion`, `decision`,
  `resolutionReason`.
- Permission: `project:update`.
- Enforces terminal-state and version checks atomically.
- Writes an existing audit-log entry using resource type
  `agentExecutionException`.

`agentExceptions.record`

- Server/control-plane producer contract for idempotently recording an open
  exception. It is not exposed as a customer-facing public API in this slice.

## Frontend

The run workbench gains an **Exceptions** tab:

- Loading skeleton, empty state, permission-safe error state.
- Severity and status badges.
- Event links, proposed action and evidence summary.
- Approve, reject and escalate controls.
- Reason is mandatory for rejection/escalation.
- Terminal decision history and version shown directly in the card.
- Keyboard-accessible controls and no motion dependency.

Client state is limited to the selected exception and decision dialog intent.
Server state remains in tRPC/React Query. No `useEffect` is needed.

## Security and privacy

- All reads/writes scope by `projectId` and existing RBAC.
- The mutation uses optimistic concurrency to prevent stale approvals.
- Full before/after records go to existing audit logs.
- UI and analytics never send raw evidence, customer text, run IDs or reasons
  to PostHog.
- Evidence is bounded at API validation and shown as data from trusted
  instrumentation; external execution is deliberately out of scope.

## Performance

- Run list capped at 100 records.
- Bounded text and JSON evidence at ingress.
- Query only project/run indexed columns plus a compact select.
- No ClickHouse query or polling loop is added.

## Acceptance criteria

- A seeded PO ambiguity is visible from its run.
- A project reader can view but cannot resolve it.
- A project updater can approve, reject, or escalate exactly once.
- A stale expected version fails safely.
- Every successful resolution creates an audit log record.
- Cross-project read and write attempts are denied.
- The feature has schema, repository, router, UI-model and regression tests.
- Typecheck, targeted tests and build checks pass under Node 24.

## Founder demo

1. Open the seeded Northstar Logistics customer-renewal run.
2. Select an ambiguity: a PO has conflicting delivery date and decoration
   specification.
3. Inspect affected event, proposed action and evidence.
4. Escalate it with an operator reason.
5. Show that the decision is durable and auditable.
6. Explain that an agent runtime consumes the recorded decision only when its
   own connector and policy contract permits it.

## Milestones

1. Add additive schema, repository and validated contracts.
2. Add tenant-scoped router and audit logging.
3. Add run-workbench Exception Desk.
4. Seed a deterministic branded-merchandise exception.
5. Run tests, typecheck, build, browser review and document rollback.

## Rollback

The additive schema remains harmless if the UI/router are disabled. Rollback
the feature by hiding the workbench tab and stopping new producers; existing
records and audit history remain readable.
