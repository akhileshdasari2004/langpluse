# Mission Control Implementation Plan

Status: Active Development — Milestone 1 approved  
Source of truth: `PROJECT_PRD.md` version 1.0  
Baseline: Langfuse-derived monorepo on `main`

## 1. Executive architecture comparison

Mission Control should be implemented as an additive agent-operating layer over
the existing observability platform. The current system already solves the
expensive horizontal problems:

- Next.js 16/React 19 application shell, responsive layouts, Tailwind and
  shadcn-style UI primitives;
- tRPC application APIs and versioned REST/OTLP ingestion APIs;
- PostgreSQL/Prisma control-plane storage;
- ClickHouse wide-event analytical storage;
- Redis/BullMQ queues and an independently deployable worker;
- S3-compatible event, media, and export storage;
- trace tree, timeline, graph, playback, tables, filters, dashboards, charts,
  scores, evaluations, experiments, monitors, automations, comments, approvals,
  and an in-app agent runtime;
- enterprise tenancy, RBAC, SSO, SCIM, API keys, entitlements, billing, audit
  logs, retention, masking, and deployment workflows.

The primary gap is semantic rather than infrastructural. Langfuse exposes
traces, observations, generations, events, and scores. The PRD requires those
records to be projected into:

```text
Agent → Run → Task → Plan/Reasoning → Decision
      → Memory Access → Tool Invocation → Observation/Retry
      → Completion/Failure
```

The implementation therefore follows these rules:

1. Keep existing ingestion and raw telemetry contracts.
2. Derive immutable agent-execution concepts from ClickHouse wide events.
3. Add PostgreSQL records only for mutable control-plane state such as agent
   registry metadata, generated analyses, recommendations, approvals, and
   simulations.
4. Extend the trace viewer into a run workbench instead of creating a parallel
   detail architecture.
5. Preserve every existing feature and enterprise capability.
6. Introduce canonical Mission Control routes additively and retain legacy deep
   links.
7. Build each milestone behind an entitlement/capability flag until its data,
   performance, security, and browser acceptance gates pass.

### Current stack versus PRD

| PRD requirement | Current state | Plan |
|---|---|---|
| Next.js 16, React 19, TypeScript, Tailwind, shadcn/ui | Present | Keep |
| Zustand | Present; used by the playback engine | Extend with bounded per-run stores |
| Streaming | SSE dashboard query route and AI streaming exist | Add an authenticated resumable run-event stream |
| React Flow | Missing | Add `@xyflow/react` in Milestone 4 after approval |
| Framer Motion | Missing | Add `framer-motion` in Milestone 12 after approval |
| Server Actions | Small App Router surface; product is Pages Router/tRPC-centric | Do not replace tRPC. Use Server Actions only if a future App Router surface has a concrete need and the architecture documentation is updated |
| Dashboard/analytics | Mature generic system | Add Mission Control metrics and curated presets |
| Timeline | Mature virtualized Gantt timeline | Add semantic event rows and live updates |
| Agent graph | Mature read-only ELK/SVG graph | Retain builders/layout; add React Flow presentation adapter |
| Replay | Play/pause/seek playback exists | Add stepping, speed, deterministic ordering, and cross-view synchronization |
| Brain/memory/tool/decision explorers | Raw data exists; no complete semantic views | Build projections and workbench panels |
| Root cause/coach | Evals, scores, in-app agent, queues exist | Build evidence-first queued analysis and recommendation pipelines |
| Simulation | Datasets/experiments/sandbox exist | Build an isolated deterministic simulation layer |

## 2. Cross-cutting architecture

### Proposed feature boundaries

New work should be grouped under:

```text
packages/shared/src/features/agent-executions/
packages/shared/src/server/agent-executions/
web/src/features/agent-executions/
web/src/features/mission-control-dashboard/
web/src/features/execution-analysis/
web/src/features/execution-simulation/
worker/src/features/execution-analysis/
worker/src/features/execution-simulation/
```

Client-safe schemas and types belong in `packages/shared/src/features`. Database
and ClickHouse repositories belong in `packages/shared/src/server`. Web feature
routers and presentation stay in `web/src/features`. Queue processors stay in
`worker/src/features` and are registered through the existing worker lifecycle.

### Canonical data strategy

- ClickHouse remains the source for immutable execution telemetry.
- A `AgentExecutionProjection` is calculated from v3 observations or v4 events.
- Raw values remain available alongside semantic projections.
- Explicitly instrumented semantic metadata wins over inferred classifications.
- Inferred fields carry provenance and confidence.
- Private chain-of-thought is never fabricated. The UI displays application-
  supplied reasoning summaries or clearly labelled inference.
- PostgreSQL stores registry/configuration and generated artifacts, not copies of
  every tool, memory, or decision event.

### Proposed canonical routes

```text
/project/[projectId]/agents
/project/[projectId]/agents/[agentId]
/project/[projectId]/runs
/project/[projectId]/runs/[runId]
/project/[projectId]/analytics
/project/[projectId]/simulations
```

Existing trace, observation, session, dashboard, dataset, experiment, prompt,
evaluation, playground, settings, organization, and billing routes remain.

### Shared state model

- tRPC/TanStack Query: server state and cache invalidation.
- URL query parameters: selected event, workbench tab, filters, graph mode,
  replay position when explicitly shared, and date range.
- Per-run vanilla Zustand store: replay clock, speed, active event set,
  auto-follow, and synchronized selection requiring high-frequency updates.
- React context: composition-scoped access to immutable run projection and
  workbench adapters.
- Local storage: user preferences only, never authoritative execution state.

### Required dependency approvals

The following PRD dependencies are not installed:

- `@xyflow/react` for Workflow Graph and Multi-Agent Graph.
- `framer-motion` for final interaction polish.

They must be added project-locally to `web/package.json` and `pnpm-lock.yaml`
only after explicit approval. No other new dependency is currently justified.

### Standard milestone validation

Every implementation milestone must run:

```text
pnpm run agents:check
pnpm run lint
pnpm run typecheck
targeted web/shared/worker tests
pnpm run build:check
pnpm run build
pnpm run scan:client-bundle
```

User-visible milestones also require deterministic seeded data, Storybook where
appropriate, and desktop/mobile browser review. Schema milestones additionally
require Prisma generation, migration tests, ClickHouse compatibility review, and
rolling web/worker deployment analysis.

## Milestone 1 — Foundation

**Status: IN PROGRESS**

**Features enabled:** agent/run semantic layer, run workbench shell, agent
registry, Mission Control navigation, instrumentation contract.

**Independent outcome:** existing telemetry can be opened as a Mission Control
run through a stable projection API while all legacy trace behavior remains
available.

**Estimated effort:** 5–7 engineer-weeks.

### Existing components to reuse

- `web/src/components/trace/Trace.tsx` provider composition.
- `web/src/components/trace/TraceDetailBody.tsx`.
- `web/src/components/trace/useTraceDetailData.ts`.
- Trace data, selection, search, preference, graph, and playhead contexts.
- `web/src/components/trace/lib/tree-building.ts`.
- `web/src/features/events/server/eventsRouter.ts`.
- `web/src/server/api/routers/traces.ts`.
- ClickHouse event/trace/observation repositories.
- Project-aware layouts and `AppSidebar`.
- RBAC procedures in `web/src/server/api/trpc.ts`.
- Existing audit-log, entitlement, telemetry, and API-key patterns.
- `support-agent` and `agent-timeline` seeder scenarios.

### Files to modify

- `PROJECT_PRD.md` — mark Foundation-related implementation state only when
  implementation begins; do not change product requirements.
- `web/src/components/nav/AppSidebar/AppSidebar.tsx`.
- `web/src/components/nav/AppSidebar/utils.ts`.
- `web/src/components/trace/Trace.tsx`.
- `web/src/components/trace/TraceDetailBody.tsx`.
- `web/src/server/api/root.ts`.
- `packages/shared/src/index.ts`.
- `packages/shared/src/server/index.ts`.
- `packages/shared/src/server/queues.ts` only if a projection/background job is
  proven necessary.
- `packages/shared/prisma/schema.prisma`.
- `packages/shared/scripts/seeder/scenarios/index.ts`.
- Root and package `AGENTS.md` files if entry points or validation commands
  materially change.

### New files to create

- `packages/shared/src/features/agent-executions/schema.ts`.
- `packages/shared/src/features/agent-executions/types.ts`.
- `packages/shared/src/features/agent-executions/classification.ts`.
- `packages/shared/src/features/agent-executions/index.ts`.
- `packages/shared/src/server/agent-executions/projectExecution.ts`.
- `packages/shared/src/server/agent-executions/agentRegistryRepository.ts`.
- `packages/shared/src/server/agent-executions/index.ts`.
- `web/src/features/agent-executions/server/router.ts`.
- `web/src/features/agent-executions/components/RunWorkbench.tsx`.
- `web/src/features/agent-executions/components/RunWorkbenchHeader.tsx`.
- `web/src/features/agent-executions/components/RunWorkbenchTabs.tsx`.
- `web/src/features/agent-executions/contexts/RunProjectionContext.tsx`.
- `web/src/pages/project/[projectId]/runs/index.tsx`.
- `web/src/pages/project/[projectId]/runs/[runId].tsx`.
- `web/src/pages/project/[projectId]/agents/index.tsx`.
- `web/src/pages/project/[projectId]/agents/[agentId].tsx`.
- `packages/shared/scripts/seeder/scenarios/mission-control-enterprise.ts`.
- Matching shared, server, client, route, and authorization tests.

### Database/schema changes

Add a PostgreSQL `Agent` model with:

- project-scoped stable key and display name;
- description, version-selection metadata, owner/team metadata;
- first/last seen timestamps;
- optional configuration metadata;
- created/updated actor and timestamps;
- project cascade and project/key uniqueness indexes.

Do not store derived runs, steps, tools, memories, or decisions in PostgreSQL.
Project those from ClickHouse. Create a Prisma migration such as
`packages/shared/prisma/migrations/<timestamp>_add_agent_registry/migration.sql`.

No ClickHouse schema change is required initially. Establish instrumentation
metadata keys first and evaluate query plans against `events_full`.

### API changes

- Register `agentExecutions` tRPC router.
- Add `getRun`, `listRuns`, `listAgents`, `getAgent`, and `upsertAgentMetadata`.
- Use protected project procedures and explicit rights for metadata mutation.
- Return projection provenance and confidence.
- Preserve `traces` and `events` routers as raw/compatibility APIs.
- Do not add public REST endpoints until an external consumer is approved; if
  required, update Fern sources rather than hand-editing generated clients.

### State management changes

- Introduce `RunProjectionContext` for immutable projection data.
- Continue using `SelectionContext` URL parameters for selected raw observation.
- Add URL parameters for run workbench tab and semantic event selection.
- Do not introduce a global Zustand store in this milestone.

### Dependencies required

None.

### Implementation sequence and exit criteria

- [x] Define instrumentation and projection contracts.
- [x] Add agent registry migration/repository.
- [x] Add projection API and compatibility tests.
- [x] Add run/agent routes and workbench shell using existing trace detail.
- [x] Add enterprise seed scenario.
- [ ] Validate RBAC, tenant isolation, legacy routes, ingestion, and production
      build.
  - [x] Full monorepo typecheck and production web build.
  - [x] Prisma schema validation, changed-file lint, projection compatibility,
        and repository tenant-boundary tests.
  - [ ] Run the enterprise seed against a configured PostgreSQL/ClickHouse
        stack and verify both run and legacy trace URLs with authenticated RBAC
        cases. The current workspace has no `.env` or local service
        credentials.

The milestone is complete only when a seeded sales-email run opens through both
the new run URL and the existing trace URL with equivalent raw telemetry.

## Milestone 2 — Dashboard

**PRD feature:** Dashboard.

**Independent outcome:** the project landing page communicates agent health,
success, latency, quality, failures, live agents, cost, and history with
filterable drill-downs.

**Estimated effort:** 3–4 engineer-weeks.

### Existing components to reuse

- `web/src/pages/project/[projectId]/index.tsx`.
- Dashboard grid, widgets, query scheduler, date range, environment filters,
  home-dashboard selection, and import/export.
- `web/src/features/dashboard/components/home-preset-registry.tsx`.
- Existing latency, cost, usage, score, trace-volume, and time-series cards.
- `web/src/features/widgets/chart-library/*`.
- `packages/shared/src/features/query/*`.
- `packages/shared/src/domain/home-dashboard.ts`.
- SSE query progress route and `useSSEDashboardQuery`.

### Files to modify

- `packages/shared/src/domain/home-dashboard.ts`.
- `packages/shared/src/domain/home-dashboard.test.ts`.
- `web/src/pages/project/[projectId]/index.tsx`.
- `web/src/features/dashboard/components/home-preset-registry.tsx`.
- `web/src/features/widgets/components/SelectWidgetDialog.tsx`.
- `packages/shared/src/features/query/dataModel.ts`.
- `packages/shared/src/features/query/server/queryBuilder.ts`.
- Dashboard import/export and public-service tests when new presets become
  exportable.

### New files to create

- `web/src/features/mission-control-dashboard/components/AgentHealthCard.tsx`.
- `web/src/features/mission-control-dashboard/components/ExecutionQualityCard.tsx`.
- `web/src/features/mission-control-dashboard/components/LiveAgentsCard.tsx`.
- `web/src/features/mission-control-dashboard/components/FailureSummary.tsx`.
- `web/src/features/mission-control-dashboard/components/ExecutionHistory.tsx`.
- `web/src/features/mission-control-dashboard/lib/metricDefinitions.ts`.
- `web/src/features/mission-control-dashboard/lib/drilldownUrls.ts`.
- `packages/shared/src/features/agent-executions/dashboard.ts`.
- Associated preparer, query, component, and browser tests.

### Database/schema changes

None initially. Dashboard definitions already support curated preset widgets.
Use ClickHouse projections and existing dashboard JSON definitions.

Add a materialized view only if measured queries cannot meet the dashboard
latency budget; this requires paired clustered/unclustered migrations and a
separate deployment plan.

### API changes

- Extend dashboard query views/metrics with agent identity, run status,
  execution quality, and live-window aggregations.
- Add a small `agentExecutions.getDashboardSummary` tRPC query only for metrics
  that cannot be represented by the generic query grammar.
- Require bounded time ranges and return data freshness.

### State management changes

- Reuse dashboard URL filters, date range, environment state, and query
  scheduler.
- No new global state.

### Dependencies required

None.

### Exit criteria

- Every metric has a documented formula, window, null behavior, and drill-down.
- Empty, loading, partial-error, stale, and no-permission states are complete.
- Existing custom dashboards remain editable and exportable.
- A founder can understand current operational health in under 30 seconds.

## Milestone 3 — Live Timeline

**PRD feature:** Live Agent Timeline.

**Independent outcome:** a running execution streams task, planning, reasoning,
memory, tools, observations, retries, and completion into the existing
virtualized timeline without refresh.

**Estimated effort:** 4–6 engineer-weeks.

### Existing components to reuse

- Entire `TraceTimeline` component family and timeline calculation tests.
- `TraceDataContext`, `SelectionContext`, and virtualized tree/list primitives.
- v4 events repositories and ClickHouse query utilities.
- Existing SSE response/auth/error patterns from
  `web/src/pages/api/dashboard/execute-query-stream.ts`.
- Existing event-ingestion timestamps and trace bounds.

### Files to modify

- `web/src/components/trace/Trace.tsx`.
- `web/src/components/trace/contexts/TraceDataContext.tsx`.
- `web/src/components/trace/components/TraceTimeline/index.tsx`.
- `web/src/components/trace/components/TraceTimeline/TimelineRows.tsx`.
- Timeline types, flattening, calculations, fixtures, and stories.
- `packages/shared/src/server/repositories/events.ts`.
- `packages/shared/src/server/queues.ts` only if Redis fan-out is selected.
- `worker/src/queues/workerManager.ts` only if a new fan-out consumer is needed.
- Environment schemas/examples if stream heartbeat or retention is configurable.

### New files to create

- `web/src/pages/api/project/[projectId]/runs/[runId]/stream.ts`.
- `web/src/features/agent-executions/live/schema.ts`.
- `web/src/features/agent-executions/live/useRunEventStream.ts`.
- `web/src/features/agent-executions/live/LiveRunStatus.tsx`.
- `web/src/features/agent-executions/live/semanticTimelineRows.ts`.
- `web/src/features/agent-executions/live/runEventBuffer.ts`.
- Optional `packages/shared/src/server/agent-executions/runEventCursor.ts`.
- Stream authorization, cursor, ordering, reconnect, and component tests.

### Database/schema changes

No PostgreSQL change.

Prefer cursoring from ClickHouse using `(start_time, event_id)` and a bounded
trace/run filter. If polling ClickHouse cannot meet the freshness/load target,
add a Redis pub/sub or stream fan-out from the ingestion pipeline without
changing the durable source of truth.

### API changes

- Add authenticated SSE endpoint with project/run authorization.
- Support `Last-Event-ID` or explicit cursor resume.
- Emit heartbeat, snapshot, append, correction, completion, and error events.
- Enforce connection limits, timeouts, rate limits, payload limits, and server
  cleanup.
- Keep tRPC for initial snapshots and SSE for deltas.

### State management changes

- Add a bounded per-run live buffer owned by the workbench.
- Batch stream inserts into TanStack Query cache.
- Add auto-follow, paused-follow, unread count, reconnect state, and stream
  freshness to a scoped Zustand store or existing run store.
- Never push 60fps or high-rate event updates through broad React context.

### Dependencies required

None; use native `EventSource` unless authenticated header requirements force a
small existing fetch-stream abstraction.

### Exit criteria

Reconnect, duplicate, late, out-of-order, malformed, high-rate, authorization,
and terminal-state tests pass. The timeline remains responsive for at least
5,000 events and announces meaningful updates accessibly.

## Milestone 4 — Agent Brain

**PRD features:** Agent Brain, Workflow Graph, Multi-Agent Graph.

**Independent outcome:** a run can be inspected as a goal-to-completion brain
graph and as a multi-agent communication graph, with confidence, latency,
reasoning summaries, alternatives, animation, zoom, and MiniMap.

**Estimated effort:** 6–8 engineer-weeks.

### Existing components to reuse

- `web/src/features/trace-graph-view/buildStepData.ts`.
- Aggregated/expanded graph builders and graph mode.
- ELK layout and node measurement.
- `TraceGraphDataContext`.
- URL-synchronized observation selection.
- Playback active-node projection.
- Existing `GraphNode` visual language and trace detail IO panels.
- AG-UI reasoning/activity/tool event schemas where compatible.

### Files to modify

- `web/src/components/trace/Trace.tsx`.
- `web/src/components/trace/contexts/TraceGraphDataContext.tsx`.
- `web/src/features/trace-graph-view/types.ts`.
- `web/src/features/trace-graph-view/buildStepData.ts`.
- `web/src/features/trace-graph-view/components/TraceGraphView.tsx`.
- `web/src/features/trace-graph-view/README.md`.
- `web/package.json` and `pnpm-lock.yaml` after dependency approval.

### New files to create

- `packages/shared/src/features/agent-executions/brain.ts`.
- `packages/shared/src/features/agent-executions/graph.ts`.
- `web/src/features/agent-executions/brain/buildBrainGraph.ts`.
- `web/src/features/agent-executions/brain/AgentBrainView.tsx`.
- `web/src/features/agent-executions/brain/BrainNode.tsx`.
- `web/src/features/agent-executions/graph/ExecutionFlow.tsx`.
- `web/src/features/agent-executions/graph/MultiAgentFlow.tsx`.
- `web/src/features/agent-executions/graph/nodes/*`.
- `web/src/features/agent-executions/graph/edges/*`.
- `web/src/features/agent-executions/graph/useRunGraphSelection.ts`.
- `web/src/features/agent-executions/graph/toReactFlowModel.ts`.
- Brain/graph fixture, projection, layout, accessibility, and stress tests.

### Database/schema changes

None. Brain, workflow, and communication graphs are derived from immutable
events. Add instrumentation metadata contracts for goal, plan, reasoning
summary, agent identity, confidence, alternatives, message direction, and
handoff.

### API changes

- Extend `agentExecutions.getRun` or add `getRunGraph` with field selection.
- Return explicit versus inferred provenance.
- Use the existing graph-data query as a fallback for legacy traces.
- Do not expose or manufacture hidden chain-of-thought.

### State management changes

- Reuse URL-selected semantic event/observation.
- Add scoped graph mode, viewport, expanded groups, and selected agent.
- Keep high-frequency viewport state inside React Flow; persist only stable user
  preferences.
- Subscribe to replay active IDs through narrow Zustand selectors.

### Dependencies required

- Add `@xyflow/react` project-locally after approval.

### Exit criteria

The graph supports animated nodes/edges, execution order, zoom, MiniMap,
keyboard navigation, reduced motion, aggregated/expanded modes, loops,
parallelism, handoffs, and multi-agent messages. Stress fixtures cover deep,
wide, cyclic, partial, and multi-thousand-node executions.

## Milestone 5 — Memory Explorer

**PRD feature:** Memory Explorer.

**Independent outcome:** retrieved and rejected memories are searchable and
inspectable with confidence, source, similarity, latency, freshness, business
context, provenance, and security controls.

**Estimated effort:** 3–5 engineer-weeks.

### Existing components to reuse

- Trace IO preview, JSON table, media, chat, large-payload, and copy/download
  components.
- Shared tables, filters, saved views, column visibility, ordering, and
  pagination.
- ClickHouse metadata and IO field selection.
- Data masking, retention, S3 media, comments, corrections, and scores.

### Files to modify

- `packages/shared/src/features/agent-executions/schema.ts`.
- `packages/shared/src/server/agent-executions/projectExecution.ts`.
- `web/src/features/agent-executions/components/RunWorkbenchTabs.tsx`.
- `web/src/components/trace/components/IOPreview/*` only for reusable
  memory-specific renderers.
- Search/filter table definitions if memory becomes a first-class filter view.

### New files to create

- `packages/shared/src/features/agent-executions/memory.ts`.
- `packages/shared/src/server/agent-executions/memoryProjection.ts`.
- `web/src/features/agent-executions/memory/MemoryExplorer.tsx`.
- `web/src/features/agent-executions/memory/MemoryTable.tsx`.
- `web/src/features/agent-executions/memory/MemoryDetail.tsx`.
- `web/src/features/agent-executions/memory/MemoryRelevanceBadge.tsx`.
- `web/src/features/agent-executions/memory/memoryColumns.tsx`.
- Projection, redaction, table, detail, and browser tests.

### Database/schema changes

None. Memory accesses remain event data. Persisting the source system’s memory
objects would create an unnecessary second system of record.

### API changes

- Add `getRunMemories` with pagination/field selection for large payloads.
- Support retrieved/rejected status and source/similarity/freshness filters.
- Apply project authorization, masking, and media-access policies.
- Return payload references separately so list queries remain compact.

### State management changes

- URL state for selected memory, filters, sort, and comparison mode.
- TanStack Query for list/detail payloads.
- Local context only for side-by-side comparison selection.

### Dependencies required

None.

### Exit criteria

Large payloads load on demand; secrets and masked fields cannot leak through
copy/export; memory entries link back to decisions, tools, scores, and replay
position.

## Milestone 6 — Tool Explorer

**PRD feature:** Tool Explorer.

**Independent outcome:** every tool call exposes request, response, latency,
retries, errors, fallback, dependencies, approval, and execution linkage.

**Estimated effort:** 3–4 engineer-weeks.

### Existing components to reuse

- `ToolCallInvocationsView`.
- `ToolCallDefinitionCard`.
- IO previews, JSON views, media, thinking blocks, error badges, and metadata.
- LLM tool registry and MCP tool contracts.
- In-app-agent tool-call card, encrypted payload handling, and human approval.
- Web-callout outbound URL validation and webhook secret-display patterns.

### Files to modify

- `web/src/components/trace/components/ToolCallInvocationsView.tsx`.
- `web/src/components/trace/components/IOPreview/components/ToolCallDefinitionCard.tsx`.
- `packages/shared/src/features/agent-executions/schema.ts`.
- `packages/shared/src/server/agent-executions/projectExecution.ts`.
- `web/src/features/agent-executions/components/RunWorkbenchTabs.tsx`.

### New files to create

- `packages/shared/src/features/agent-executions/tools.ts`.
- `packages/shared/src/server/agent-executions/toolProjection.ts`.
- `web/src/features/agent-executions/tools/ToolExplorer.tsx`.
- `web/src/features/agent-executions/tools/ToolInvocationTable.tsx`.
- `web/src/features/agent-executions/tools/ToolInvocationDetail.tsx`.
- `web/src/features/agent-executions/tools/ToolDependencyView.tsx`.
- `web/src/features/agent-executions/tools/toolColumns.tsx`.
- Projection, redaction, dependency, retry, and browser tests.

### Database/schema changes

None for observed invocations. Existing `LlmTool` and in-app-agent approval
models remain authoritative for configured tools and coach tool approvals.

### API changes

- Add `getRunToolInvocations`.
- Support deferred request/response fields and dependency traversal.
- Apply credential/header/cookie/signed-URL redaction.
- Tool replay is explicitly out of scope for this milestone; adding execution
  would require separate approvals and SSRF/MCP security review.

### State management changes

- URL state for selected invocation and filters.
- TanStack Query for list and deferred payloads.
- Reuse replay active-event selectors for highlighting.

### Dependencies required

None.

### Exit criteria

Success, retry, timeout, fallback, dependency, approval, large-payload, and
masked-secret scenarios are production-complete and accessible.

## Milestone 7 — Decision Explorer

**PRD feature:** Decision Explorer.

**Independent outcome:** every recorded decision displays considered options,
selection/rejection, reason, confidence, evidence, and downstream outcome.

**Estimated effort:** 3–5 engineer-weeks.

### Existing components to reuse

- Agent Brain projection and selection.
- Scores, comments, corrections, annotation queues, and badge components.
- Timeline and graph deep-linking.
- Shared tables, expandable rows, and detail panels.

### Files to modify

- `packages/shared/src/features/agent-executions/schema.ts`.
- `packages/shared/src/server/agent-executions/projectExecution.ts`.
- Agent Brain nodes and workbench tabs.
- Run seed scenario.

### New files to create

- `packages/shared/src/features/agent-executions/decisions.ts`.
- `packages/shared/src/server/agent-executions/decisionProjection.ts`.
- `web/src/features/agent-executions/decisions/DecisionExplorer.tsx`.
- `web/src/features/agent-executions/decisions/DecisionCard.tsx`.
- `web/src/features/agent-executions/decisions/AlternativeList.tsx`.
- `web/src/features/agent-executions/decisions/DecisionEvidence.tsx`.
- Decision projection, provenance, component, and browser tests.

### Database/schema changes

None. Decisions and alternatives are immutable execution evidence.

### API changes

- Add `getRunDecisions`.
- Return selected/rejected alternatives, explicit reason, confidence,
  provenance, linked event IDs, and outcome scores.
- Legacy inference must be labelled and must never invent rejection reasons.

### State management changes

- URL state for selected decision and selected alternative.
- Reuse run selection and replay state.
- TanStack Query for deferred evidence payloads.

### Dependencies required

None.

### Exit criteria

The CRM rejected → ERP rejected → Gmail selected example can be represented
from realistic seed data, including missing/conflicting evidence states.

## Milestone 8 — Replay Engine

**PRD feature:** Execution Replay.

**Independent outcome:** every execution supports deterministic play, pause,
step forward, step back, timeline seeking, and speed control synchronized across
all explorers and graphs.

**Estimated effort:** 3–4 engineer-weeks.

### Existing components to reuse

- `PlaybackControls.tsx`.
- `playheadStore.ts` and `PlayheadContext.tsx`.
- Timeline playhead and graph active-node glow.
- Existing deterministic tree/timeline calculations.

### Files to modify

- `web/src/components/trace/contexts/playheadStore.ts`.
- `web/src/components/trace/contexts/PlayheadContext.tsx`.
- `web/src/components/trace/components/PlaybackControls.tsx`.
- Trace timeline bars/rows and graph adapters.
- Workbench explorer components for active-item synchronization.
- Existing playhead and timeline tests/stories.

### New files to create

- `web/src/features/agent-executions/replay/replayOrdering.ts`.
- `web/src/features/agent-executions/replay/ReplayToolbar.tsx`.
- `web/src/features/agent-executions/replay/ReplaySpeedControl.tsx`.
- `web/src/features/agent-executions/replay/useReplayDeepLink.ts`.
- Ordering, stepping, speed, synchronization, and accessibility tests.

### Database/schema changes

None.

### API changes

No new API. Replay consumes the immutable run projection. For long runs, extend
the existing run API with time-window pagination rather than creating replay-
specific persisted state.

### State management changes

Extend the per-mount vanilla Zustand store with:

- ordered event boundaries;
- `stepForward` and `stepBack`;
- explicit speed options;
- current semantic event ID;
- buffered range;
- deterministic seek behavior.

Continue imperative 60fps DOM updates and narrow selectors to prevent global
rerenders.

### Dependencies required

None.

### Exit criteria

Replay position remains synchronized across timeline, brain, workflow graph,
multi-agent graph, memory, tools, and decisions. Boundary, equal-timestamp,
late-event, background-tab, speed, and long-run tests pass.

## Milestone 9 — AI Execution Coach

**PRD features:** Root Cause Analysis and AI Execution Coach.

**Independent outcome:** failed and successful executions receive auditable,
evidence-linked diagnoses and improvement recommendations with estimated impact.
Nothing changes production configuration without explicit approval.

**Estimated effort:** 8–12 engineer-weeks.

### Existing components to reuse

- Evaluations, LLM-as-judge, code-eval worker, scores, score configs, prompts,
  model connections, datasets, experiments, comments, corrections, and
  annotation queues.
- In-app-agent runtime, AG-UI streaming, sandbox, skills, MCP tools, event
  persistence, and human-in-the-loop approval.
- BullMQ worker lifecycle, retries, dead-letter queues, notifications,
  automations, Slack, and webhooks.
- Audit logs, encryption, masking, rate limits, cost calculation, and
  entitlements.

### Files to modify

- `packages/shared/prisma/schema.prisma`.
- `packages/shared/src/server/queues.ts`.
- `packages/shared/src/env.ts` and environment examples for feature/model/budget
  configuration.
- `packages/shared/src/server/redis/*` for queue accessors.
- `worker/src/queues/workerManager.ts`.
- `worker/src/app.ts`.
- `web/src/server/api/root.ts`.
- `web/src/features/in-app-agent/*` only for reusable streaming/approval
  adapters.
- Audit-log resource mappings and retention/deletion/export code.

### New files to create

- `packages/shared/src/features/execution-analysis/schema.ts`.
- `packages/shared/src/features/execution-analysis/types.ts`.
- `packages/shared/src/server/execution-analysis/repository.ts`.
- `packages/shared/src/server/execution-analysis/evidenceBundle.ts`.
- `packages/shared/src/server/execution-analysis/prompts.ts`.
- `worker/src/features/execution-analysis/rootCauseProcessor.ts`.
- `worker/src/features/execution-analysis/coachProcessor.ts`.
- `worker/src/features/execution-analysis/modelGateway.ts`.
- `worker/src/queues/executionAnalysisQueue.ts`.
- `web/src/features/execution-analysis/server/router.ts`.
- `web/src/features/execution-analysis/components/RootCauseAnalysis.tsx`.
- `web/src/features/execution-analysis/components/CoachPanel.tsx`.
- `web/src/features/execution-analysis/components/RecommendationCard.tsx`.
- `web/src/features/execution-analysis/components/EstimatedImpact.tsx`.
- `web/src/features/execution-analysis/components/RecommendationApproval.tsx`.
- Security, queue, repository, model, authorization, audit, UI, and browser
  tests.

### Database/schema changes

Add PostgreSQL models:

- `ExecutionAnalysis`: project/run, type, status, evidence version, model and
  prompt version, confidence, result JSON, cost, error, timestamps, and
  supersession.
- `ExecutionRecommendation`: analysis, category, recommendation, estimated
  impact, confidence, status, reviewer, approval timestamps, and immutable
  history.
- Optional `ExecutionAnalysisFeedback` if existing comments/corrections cannot
  express structured coach feedback.

Use project/run/status and analysis timestamps indexes. Store large raw model
artifacts in encrypted object storage when necessary, with references in
PostgreSQL. Add project-deletion, retention, audit, and export behavior.

### API changes

- Add tRPC queries/mutations for list/get/generate/cancel analysis, feedback,
  dismiss, request approval, approve, and reject.
- All mutations require project RBAC, entitlement, rate limit, budget, and audit
  checks.
- Generation is idempotent by run/evidence/prompt/model version.
- Stream progress/results using existing AG-UI/SSE patterns.
- Do not expose provider secrets or unmasked source payloads.

### State management changes

- TanStack Query owns persisted analysis/recommendation state.
- A scoped streaming reducer handles transient generation events.
- Approval dialogs use server-authoritative status and optimistic updates only
  where rollback is unambiguous.
- No global coach store.

### Dependencies required

None initially. Reuse installed AI SDK providers and the in-app-agent runtime.

### Exit criteria

- Root cause covers affected tools, memory issues, reasoning errors, latency
  problems, evidence, uncertainty, and suggested fix.
- Coach covers better plan/tool/memory/retry/prompt, cost, latency, and
  reliability with estimated improvement.
- Prompt injection, cross-tenant access, secret leakage, budget exhaustion,
  timeouts, retries, dead letters, stale analysis, approval, and audit tests
  pass.
- Recommendations never directly mutate production prompts, tools, policies,
  automations, or deployments.

## Milestone 10 — Simulation

**PRD feature:** Simulation Engine.

**Independent outcome:** users can rerun an execution under CRM offline, Slack
failure, missing memory, API timeout, and changed customer conditions and
compare new reasoning safely.

**Estimated effort:** 7–10 engineer-weeks.

### Existing components to reuse

- Datasets, dataset items, experiments, experiment runs, comparisons, scores,
  and analytics.
- In-app-agent sandbox providers and tool approval contracts.
- Code/evaluation worker isolation patterns.
- Replay Engine and all run workbench explorers.
- Batch queues, progress, cancellation, object storage, and audit logs.

### Files to modify

- `packages/shared/prisma/schema.prisma`.
- `packages/shared/src/server/queues.ts`.
- Queue accessors, worker manager, and worker app registration.
- `web/src/server/api/root.ts`.
- Project deletion, retention, export, entitlements, audit logs, and environment
  schemas/examples.
- Dataset/experiment code only through shared abstractions; existing behavior
  remains unchanged.

### New files to create

- `packages/shared/src/features/execution-simulation/schema.ts`.
- `packages/shared/src/server/execution-simulation/repository.ts`.
- `packages/shared/src/server/execution-simulation/scenarioCompiler.ts`.
- `worker/src/features/execution-simulation/simulationProcessor.ts`.
- `worker/src/features/execution-simulation/toolFixtureRuntime.ts`.
- `worker/src/queues/executionSimulationQueue.ts`.
- `web/src/features/execution-simulation/server/router.ts`.
- `web/src/features/execution-simulation/components/SimulationBuilder.tsx`.
- `web/src/features/execution-simulation/components/FailureInjectionEditor.tsx`.
- `web/src/features/execution-simulation/components/SimulationProgress.tsx`.
- `web/src/features/execution-simulation/components/SimulationComparison.tsx`.
- `web/src/pages/project/[projectId]/simulations/index.tsx`.
- `web/src/pages/project/[projectId]/simulations/[simulationId].tsx`.
- Isolation, determinism, queue, comparison, authorization, and browser tests.

### Database/schema changes

Add PostgreSQL models:

- `SimulationScenario`: project, source run, name, immutable scenario
  definition/version, created actor/timestamps.
- `SimulationRun`: scenario, status, deterministic seed, model/provider
  versions, result trace/run reference, cost, error, timestamps, and
  cancellation.

Large fixtures/results belong in object storage or existing dataset/event
storage. Add project cascade, retention, audit, and indexes for project/status/
created time.

### API changes

- Add CRUD for scenarios and start/cancel/get/list simulation runs.
- Add streamed progress and result comparison.
- Enforce project RBAC, entitlement, budgets, concurrency, and audit logs.
- Simulation tool execution is deny-by-default and fixture-backed; no production
  credentials or unrestricted network access.

### State management changes

- React Hook Form for scenario definition.
- TanStack Query for persisted scenarios/runs.
- Scoped streaming state for progress.
- URL state for comparison tab and selected event.
- Replay store mounts independently for baseline and simulated execution.

### Dependencies required

None.

### Exit criteria

All five PRD scenarios are deterministic, isolated, cancellable, clearly marked
as simulated, and inspectable through timeline, brain, memory, tools, decisions,
graphs, replay, root cause, and coach.

## Milestone 11 — Analytics

**PRD feature:** Enterprise Dashboard.

**Independent outcome:** enterprise teams can track execution quality, reasoning
score, memory accuracy, latency, success/failure, cost, tool health, and
automation score across agents and time.

**Estimated effort:** 4–6 engineer-weeks.

### Existing components to reuse

- Dashboard and widget infrastructure from Milestone 2.
- Score analytics, monitors, automations, model costs, query grammar, chart
  preparers, table views, filters, CSV exports, and public dashboards.
- Existing score configuration and evaluation pipelines.

### Files to modify

- `packages/shared/src/features/query/dataModel.ts`.
- `packages/shared/src/features/query/server/queryBuilder.ts`.
- `packages/shared/src/domain/home-dashboard.ts` or a new curated dashboard
  registry if multiple system dashboards are supported.
- `web/src/features/dashboard/components/home-preset-registry.tsx`.
- Widget form/filter vocabularies.
- Dashboard import/export and public dashboard validation.
- Monitor views if enterprise agent metrics become monitorable.

### New files to create

- `packages/shared/src/features/agent-executions/analytics.ts`.
- `packages/shared/src/server/agent-executions/analyticsRepository.ts`.
- `web/src/features/mission-control-dashboard/enterprise/EnterpriseDashboard.tsx`.
- `web/src/features/mission-control-dashboard/enterprise/ReasoningScoreWidget.tsx`.
- `web/src/features/mission-control-dashboard/enterprise/MemoryAccuracyWidget.tsx`.
- `web/src/features/mission-control-dashboard/enterprise/ToolHealthWidget.tsx`.
- `web/src/features/mission-control-dashboard/enterprise/AutomationScoreWidget.tsx`.
- `web/src/features/mission-control-dashboard/enterprise/AgentComparisonTable.tsx`.
- `web/src/pages/project/[projectId]/analytics.tsx`.
- Query, formula, drill-down, export, component, and browser tests.

### Database/schema changes

None initially.

If measured query costs require precomputation, create paired ClickHouse
clustered/unclustered migrations for an append-oriented `agent_run_metrics`
table/materialized view. The projection must remain reproducible from source
events and version every derived formula.

### API changes

- Extend generic query views with agent-run dimensions and metrics.
- Add `getEnterpriseSummary` only for cross-metric calculations that cannot use
  the generic query engine.
- Expose formula version and data freshness.
- Extend monitors additively so tool health or execution-quality thresholds can
  trigger existing notifications and automations.

### State management changes

- Reuse dashboard scheduler, date range, URL filters, environment filters, and
  widget state.
- Add URL filters for agent, agent version, run status, tool, and quality band.
- No new global state.

### Dependencies required

None.

### Exit criteria

All PRD metrics have explicit formulas and data-quality behavior, support
drill-down to runs, render at enterprise volume within performance budgets, and
work with saved/custom dashboards without breaking existing widgets.

## Milestone 12 — Final Polish

**PRD requirements:** production quality, responsive, accessible, fast, smooth
animations, beautiful empty states, skeleton loaders, streaming updates, and
enterprise polish.

**Independent outcome:** all Mission Control modules form a cohesive,
production-ready console while every pre-existing feature remains functional.

**Estimated effort:** 4–6 engineer-weeks plus stabilization.

### Existing components to reuse

- Theme tokens, dark mode, UI primitives, layer system, skeletons, empty states,
  toasts, command menu, responsive trace layouts, Storybook, Playwright, and
  telemetry.
- Feature flags, entitlements, previews, CI security workflows, Sentry, Datadog,
  PostHog, and release tooling.

### Files to modify

- `web/src/styles/globals.css`.
- Shared Mission Control layout, navigation, top bar, workbench, dashboards,
  explorers, graph, replay, coach, simulation, and analytics components.
- Storybook configuration/stories.
- Feature flags, entitlements, PostHog events, Sentry error handling, and
  environment examples.
- Documentation, README/deployment branding, email/auth metadata, and public
  assets only after compatibility/white-label review.
- `PROJECT_PRD.md` checklist/status entries only after each feature satisfies
  its acceptance criteria.

### New files to create

- `web/src/features/agent-executions/components/RunWorkbench.stories.tsx`.
- Cross-feature visual-regression fixtures/stories.
- End-to-end Playwright specifications for the full enterprise scenario.
- Performance fixtures for deep, wide, large-payload, and live runs.
- Release migration and rollback documentation.

### Database/schema changes

No new product schema is expected. This milestone validates all prior
migrations, retention/deletion paths, and rolling-deployment compatibility.

### API changes

No new product API is expected. Harden errors, rate limits, observability,
deprecations, and compatibility based on test evidence.

### State management changes

- Audit every store/context/query for render scope, cleanup, persistence, and
  URL-shareability.
- Remove no state architecture merely for simplicity.
- Ensure feature transitions preserve selection, streaming, and replay state
  intentionally.

### Dependencies required

- Add `framer-motion` after approval.
- Use motion for state transitions, causality, focus, graph/replay feedback, and
  polished entry/exit behavior.
- Respect `prefers-reduced-motion`; animations must never block interaction.

### Exit criteria

- All PRD checklist items are `DONE`.
- The complete sales-email scenario is inspectable end-to-end.
- A founder understands the product in under 30 seconds.
- An engineer can diagnose a seeded failure in under one minute.
- Every recorded decision is observable, every execution replayable, and every
  recommendation evidence-linked.
- Desktop/mobile, keyboard, screen reader, reduced-motion, performance, full
  build, full test, client-bundle, tenant isolation, RBAC, SSO/SCIM, billing,
  audit, retention, export, webhook, API, SDK, and self-hosted checks pass.

## 3. Milestone independence and delivery order

Each milestone is independently releasable behind a capability flag:

| Milestone | Depends on | Independent rollback |
|---|---|---|
| 1 Foundation | Existing platform | Disable new routes/router; legacy trace UI remains |
| 2 Dashboard | Milestone 1 projection | Revert curated preset; custom dashboards remain |
| 3 Live Timeline | Milestone 1 | Disable SSE; initial snapshot and legacy timeline remain |
| 4 Agent Brain | Milestone 1; live enhancement optional | Disable React Flow views; existing ELK graph remains |
| 5 Memory Explorer | Milestone 1 | Hide workbench tab; raw events remain |
| 6 Tool Explorer | Milestone 1 | Hide workbench tab; existing tool cards remain |
| 7 Decision Explorer | Milestones 1 and 4 projection types | Hide tab; brain/raw events remain |
| 8 Replay Engine | Milestone 1 | Restore existing playback controls/store behavior |
| 9 Coach | Milestones 1, 5–7 improve evidence but are not required | Stop queue consumers and hide UI; stored analyses remain readable |
| 10 Simulation | Milestones 1 and 8; Milestone 9 optional | Stop isolated queue and hide routes; production execution unaffected |
| 11 Analytics | Milestones 1 and 2 | Disable enterprise preset/views; generic dashboards remain |
| 12 Final Polish | All completed modules | Revert per-module presentation commits without schema rollback |

Database changes must use expand-and-contract deployment:

1. deploy additive schema;
2. deploy backward-compatible readers/writers;
3. enable capability flag;
4. verify telemetry and performance;
5. make default only after acceptance;
6. never contract/delete without a separate approved migration.

## 4. Total effort and staffing

Estimated implementation effort is **53–77 engineer-weeks**, excluding external
security audit, production soak time, and provider procurement.

A practical team is:

- two frontend/product engineers;
- two backend/data engineers;
- one AI/evaluation engineer from Milestone 9 onward;
- shared design, security, and QA support.

With parallel work after Milestone 1, the expected elapsed delivery is roughly
six to nine months for production-grade implementation. Graph, live streaming,
coach, and simulation have the highest uncertainty and must not be reduced to
demo-only placeholders to compress the schedule.

## 5. Approval gate

No implementation, dependency installation, schema migration, PRD status
change, or source-code modification should begin until this plan and the target
milestone are explicitly approved.
