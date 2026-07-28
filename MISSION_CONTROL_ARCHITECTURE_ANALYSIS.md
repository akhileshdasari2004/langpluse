# Mission Control Architecture Analysis

## 1. Executive summary

Mission Control should be built as an evolution of Langfuse's observability
platform, not as a visual rebrand or a rewrite.

The repository already contains most of the difficult horizontal platform
capabilities an enterprise AI agent operating console needs:

- high-volume OpenTelemetry and Langfuse event ingestion;
- a ClickHouse analytical event store;
- PostgreSQL control-plane records;
- Redis/BullMQ asynchronous execution;
- S3-compatible object and media storage;
- multi-tenant organizations, projects, SSO, SCIM, RBAC, audit logs, API keys,
  entitlements, and data retention;
- trace, tree, log, graph, and Gantt/timeline views;
- agent graph inference, playback, comments, corrections, scores, monitors,
  automations, notifications, and webhooks;
- dashboards, widgets, charts, filters, tables, exports, and public APIs;
- MCP support and an in-app AI agent with sandboxed tool execution and approval
  persistence.

The recommended transformation is to retain the platform and observability
core, introduce an explicit agent control-plane domain, and gradually make
`Agent`, `Run`, `Task`, `Step`, `Tool Invocation`, `Approval`, `Policy`,
`Incident`, and `Deployment` first-class concepts. Existing traces and
observations become the telemetry projection of agent runs rather than being
discarded.

## 2. Baseline and verification

Analyzed checkout:

- repository: `https://github.com/langfuse/langfuse.git`
- branch: `main`
- commit: `1bb37478e9e27d0282027ba2b6d1b09120c27c37`
- declared version: `4.0.0-rc.3`
- required runtime: Node 24
- package manager: pnpm 11.10.0

Verification performed without application source changes:

- `pnpm install --frozen-lockfile`: completed, 2,092 packages installed.
- Prisma generation: completed with Prisma Client 6.19.3.
- shared package TypeScript build: completed successfully.
- Next.js development server: `✓ Ready in 396ms`.
- request check: `GET /` returned `HTTP/1.1 200 OK`.
- final source status before this document: clean.

The complete database-backed stack was not exercised. The host has no working
Docker installation, while the documented development stack requires
PostgreSQL, ClickHouse, Redis, and MinIO. This is an environment limitation,
not evidence of an application failure. A later full-stack signoff must run
`pnpm run dx`, authenticate as the seeded demo user, ingest a trace, open it,
and exercise queues and dashboards.

## 3. Repository and folder structure

```text
langfuse/
├── web/                         Next.js UI, tRPC backend, REST APIs
│   ├── src/pages/               Pages Router screens and API routes
│   ├── src/app/                 Small App Router compatibility surface
│   ├── src/features/            Product feature modules
│   ├── src/components/          Shared UI, tables, trace viewer, layouts
│   ├── src/server/              tRPC, auth, and server utilities
│   ├── src/ee/                  Enterprise web features
│   ├── src/hooks/               Cross-feature React hooks
│   ├── src/utils/               Client/server-neutral web utilities
│   ├── src/workers/             Browser workers
│   └── src/__tests__, __e2e__/  Test suites
├── worker/                      Express and BullMQ background worker
│   └── src/
│       ├── queues/              Queue registration and processors
│       ├── features/            Async domain processors
│       ├── services/            Ingestion and operational services
│       ├── api/                 Worker operational API
│       ├── backgroundMigrations/
│       ├── scripts/
│       └── ee/                  Cloud-only worker features
├── packages/
│   ├── shared/                  Shared domain and backend platform
│   │   ├── src/domain/          Trace, observation, score, prompt contracts
│   │   ├── src/features/        Cross-runtime feature contracts
│   │   ├── src/server/          Repositories, queues, services, storage
│   │   ├── prisma/              PostgreSQL schema and migrations
│   │   ├── clickhouse/          ClickHouse migrations and scripts
│   │   └── scripts/seeder/      Reproducible seed scenarios
│   ├── in-app-agent-sandbox-runtime/
│   ├── config-eslint/
│   ├── config-typescript/
│   └── eslint-plugin/
├── ee/                          Enterprise license package
├── fern/                        Public API definition sources
├── generated/                   Generated API clients; never hand-edit
├── scripts/                     Repository, eval runner, agent, CI scripts
├── specs/                       Product/technical specifications
├── patches/                     pnpm dependency patches
├── docker-compose.dev.yml       Local Postgres/ClickHouse/Redis/MinIO
├── docker-compose.yml           Self-hosted deployment
├── pnpm-workspace.yaml          Nine workspace projects
└── turbo.json                   Monorepo task graph
```

Approximate source inventory:

| Area | Files |
|---|---:|
| `web/src/features` | 1,272 |
| `web/src/components` | 525 |
| `web/src/pages` | 195 |
| `web/src/hooks` | 32 |
| `web/src/utils` | 58 |
| `packages/shared/src` | 536 |
| `worker/src` | 367 |
| `fern` | 46 |

Dependency direction is deliberate:

```text
web ──────▶ shared ◀────── worker
 │            ▲
 └──▶ ee ─────┘

shared must not import web, worker, or ee
```

## 4. Tech stack

### Frontend

- Next.js 16.2, primarily Pages Router
- React 19.2 and TypeScript
- Tailwind CSS 4
- Radix UI and shadcn-style primitives
- TanStack Query through tRPC React Query
- TanStack Table and TanStack Virtual
- Zustand for bounded high-frequency/local feature stores
- React Context for composition-scoped state
- URL/query-param state for shareable filters and selections
- Recharts for charts
- `react-grid-layout` for dashboards
- ELK.js plus D3 zoom for agent graphs
- CodeMirror for structured editors
- React Hook Form and Zod
- Storybook, Vitest, Testing Library, and Playwright

### Backend and data plane

- Next.js API routes and tRPC 11
- NextAuth 4
- Express 5 worker health/operations API
- Prisma 6 with PostgreSQL
- ClickHouse 25.12 minimum for analytical event data
- Redis and BullMQ 5 for queues, scheduling, cache, and rate limits
- S3/MinIO, Azure Blob, GCS, and OCI storage adapters
- OpenTelemetry ingestion and internal instrumentation
- Zod contracts and SuperJSON transport
- Fern API specifications and generated clients
- Sentry, Datadog, PostHog, and optional AppSignal instrumentation

### AI/agent integrations already present

- Langfuse SDK and OpenTelemetry ingestion
- AI SDK providers for OpenAI, Anthropic, Azure, Google, Bedrock, and compatible
  endpoints
- Mastra and AG-UI
- Model Context Protocol SDK
- sandbox runtime for in-app agent tools
- evaluators, LLM-as-judge, code evaluators, experiments, prompts, and models

## 5. Runtime topology

```text
SDKs / OTLP / Public API
          │
          ▼
 Next.js web/API process ────────────────┐
  ├─ Pages + React UI                    │
  ├─ tRPC application API                │
  ├─ REST/public ingestion APIs          │
  └─ auth, RBAC, rate limits             │
          │                              │
          ├────────▶ PostgreSQL          │ control-plane state
          ├────────▶ ClickHouse          │ event/query plane
          ├────────▶ Redis/BullMQ ───────┼──▶ Worker process
          └────────▶ Object storage      │     ├─ ingestion
                                         │     ├─ evals/experiments
                                         │     ├─ automations/monitors
                                         │     ├─ exports/retention
                                         │     └─ notifications/webhooks
                                         └──────────────────────────────
```

PostgreSQL owns mutable, relational control-plane records. ClickHouse owns
wide, high-cardinality, append-oriented observability events and analytical
projections. Redis decouples ingestion and slow work. Object storage holds
large media, exports, and blobs. This split should be retained for Mission
Control.

## 6. Routing architecture

### UI routes

The UI is Pages Router-centric. Important route families are:

- `/auth/*`: sign-in, sign-up, password, SSO, errors;
- `/onboarding`, `/setup`: instance/user setup;
- `/organization/[organizationId]/*`: organization overview and settings;
- `/project/[projectId]/*`: the main product shell;
- `/project/[projectId]/traces/*`, `/observations`, `/sessions`, `/users`;
- `/project/[projectId]/dashboards/*`, `/widgets/*`;
- `/project/[projectId]/datasets/*`, `/experiments/*`, `/evals/*`;
- `/project/[projectId]/prompts/*`, `/playground`;
- `/project/[projectId]/monitors/*`, `/automations`;
- `/project/[projectId]/annotation-queues/*`;
- `/project/[projectId]/settings/*`;
- `/public/traces/[traceId]` and compatibility trace routes;
- `/project/~/[[...path]]`: project-aware route indirection.

The Mission Control information architecture should introduce canonical route
families under `/project/[projectId]`:

```text
/overview
/agents
/agents/[agentId]
/runs
/runs/[runId]
/tasks
/approvals
/incidents
/deployments
/policies
/tools
/operations/queues
/operations/services
/analytics
/audit
/settings
```

Legacy trace/observation/session URLs should remain as redirects or advanced
telemetry views during migration.

### App shell

`web/src/pages/_app.tsx` wraps every page with:

```text
QueryParamProvider
└─ TooltipProvider
   └─ CommandMenuProvider
      └─ PostHogProvider
         └─ SessionProvider
            └─ DetailPageListsProvider
               └─ MarkdownContextProvider
                  └─ ThemeProvider
                     └─ ScoreCacheProvider
                        └─ CorrectionCacheProvider
                           └─ SupportDrawerProvider
                              └─ V4MigrationPanelProvider
                                 └─ InAppAiAgentProvider
                                    └─ AppLayout
                                       └─ Page
```

`AppLayout` selects authenticated, unauthenticated, minimal, loading, and
right-drawer variants. `_document.tsx` declares ordered portal layers for
panel, agent, modal, popover, tooltip, and toast surfaces.

### API routes

There are four parallel API surfaces:

1. `api/trpc/[trpc]`: typed internal application API.
2. `api/public/*`: authenticated public REST API and ingestion.
3. `api/admin/*`: instance administration.
4. focused internal endpoints for auth, streaming dashboard queries, trace
   downloads, feedback, and support uploads.

Public REST includes traces, observations, sessions, scores, datasets,
experiments, prompts, models, media, comments, annotation queues,
organizations/projects/memberships, LLM connections, MCP, OTLP, SCIM, metrics,
dashboards, widgets, and evaluators.

## 7. API architecture

### tRPC

`web/src/server/api/root.ts` registers roughly 60 domain routers. Routers live
both in `src/server/api/routers` and feature-local `src/features/*/server`.

The tRPC context supplies:

- authenticated session;
- request headers;
- Prisma;
- OpenTelemetry baggage and tracing.

Procedure tiers enforce:

- public access;
- authenticated access;
- project membership and role;
- organization membership and role;
- admin access;
- entitlements and feature flags.

Errors flow through shared `BaseError` types, are mapped to tRPC codes, redact
unsafe 5xx details, and specially handle ClickHouse resource errors.

### Public REST

Public routes use middleware composition for:

- API key authentication and scopes;
- rate limiting;
- request/response validation;
- deprecation/version headers;
- OpenTelemetry context;
- consistent errors.

Fern is the source of truth for generated client contracts. Mission Control
should preserve this split: tRPC for the first-party console and versioned REST
plus event streams for external automation.

### Ingestion

Langfuse accepts native ingestion events and OTLP protobuf traces/metrics.
High-volume work is queued to BullMQ and processed by worker services into
ClickHouse. The v4 direction favors wide `events_core` and `events_full`
records, while compatibility repositories still expose traces and
observations.

For Mission Control, extend—not fork—the envelope with agent semantics:

```text
agent_id, agent_version, deployment_id, run_id, task_id, step_id,
parent_step_id, tool_id, tool_call_id, approval_id, policy_decision_id,
environment, tenant, service, status, retry, failure_class
```

## 8. State management

State is intentionally layered:

- **Server state:** tRPC + TanStack Query; cache invalidation after mutations.
- **Shareable navigation state:** Next router and query params for filters,
  pagination, selected observation, trace view, chart state, date ranges.
- **High-frequency feature state:** Zustand stores for trace playback, search
  composer, virtual JSON rows, peek panels, session detail, table stores, and
  global time range.
- **Composition-local state:** React Context for trace data/preferences/search,
  comments, theme, drawers, scoring caches, dashboard scheduling, and layout.
- **Ephemeral state:** component `useState` for dialogs, drafts, pending
  dashboard layout, and selections.
- **Persisted browser preferences:** localStorage/sessionStorage hooks.

Mission Control should keep this pattern. Do not introduce a single global
store. Add bounded stores only for live run streams, incident workspaces, and
operator selection where high-frequency updates would make React Context too
expensive.

## 9. Database architecture and schema

### PostgreSQL control plane

The Prisma schema is 1,752 lines with 427 historical migration directories.
Its models group into:

- identity: `Account`, `Session`, `User`, `VerificationToken`;
- tenancy/access: `Organization`, `Project`, memberships, invitations,
  `ApiKey`, `SsoConfig`, `VerifiedDomain`;
- in-app agent: `InAppAgentConversation`, `InAppAgentEvent`,
  `InAppAgentRun`, `InAppAgentPendingToolApproval`;
- trace metadata: `TraceSession`;
- evaluation: score configs, annotation queues, datasets/items/runs, eval
  templates, job configurations/executions, default model;
- prompt/model control: `Prompt`, dependencies/labels, `Model`, `Price`,
  `PricingTier`, LLM keys/schemas/tools;
- collaboration/governance: comments, reactions, audit logs, notification
  preferences;
- integrations: PostHog, Mixpanel, Slack, blob storage, web callouts;
- operations: cron jobs, background migrations, batch actions/exports,
  pending deletion, media references;
- dashboards: dashboards, widgets, table view presets, default views;
- automation: action, trigger, automation, automation execution, monitor;
- cloud/commercial: billing backup, spend alerts, surveys.

### ClickHouse event plane

There are 184 SQL migrations across clustered and unclustered variants.
Principal physical/logical objects include:

- `events_core`: compact query-optimized event attributes;
- `events_full`: large input/output payload projection;
- legacy `traces`, `observations`, and `scores`;
- `dataset_run_items` and replacing-merge-tree variants;
- project environment projections;
- blob storage file logs;
- time-bounded trace aggregate materialized tables/views.

Repositories in `packages/shared/src/server/repositories` provide the storage
boundary. V4 repositories already switch reads between legacy tables and
events tables.

### Mission Control schema additions

Add PostgreSQL models for:

- `Agent`, `AgentVersion`, `AgentDeployment`;
- `AgentCapability`, `ToolDefinition`, `ToolCredentialBinding`;
- `RunControl`, `Task`, `TaskDependency`;
- `ApprovalRequest`, `ApprovalDecision`;
- `Policy`, `PolicyVersion`, `PolicyBinding`, `PolicyDecision`;
- `Incident`, `IncidentEvent`, `IncidentAssignment`, `Runbook`;
- `Service`, `Environment`, `Resource`, `ResourceHealthSnapshot`;
- `Budget`, `BudgetWindow`, `CostAllocationRule`;
- `OperatorSavedView` only if current table presets cannot express the view.

Keep high-volume steps, tool calls, messages, state transitions, logs, costs,
and policy outcomes in ClickHouse wide events. PostgreSQL should store only
current control state, durable relationships, and workflows needing
transactions.

## 10. Dashboard architecture

Dashboards consist of:

- PostgreSQL `Dashboard` and `DashboardWidget` definitions;
- a tRPC dashboard router and service layer;
- 12-column `react-grid-layout` placement;
- saved filters, date ranges, environment filters, and entitlements;
- a query scheduler that limits concurrent widget execution;
- SSE streaming for long dashboard queries;
- local optimistic layout followed by debounced persistence;
- locked Langfuse presets with clone-first editing;
- import/export and clipboard formats;
- widget forms, tables, inline widgets, presets, and reusable grid components.

The query path is:

```text
Dashboard page
  → DashboardGrid
    → DashboardWidget / PresetDashboardWidget
      → useWidgetQuery + query scheduler
        → tRPC or SSE dashboard query
          → shared query service/repository
            → ClickHouse
      → normalized chart props
        → chart-library Chart dispatcher
```

For Mission Control, retain the dashboard engine and add preset operational
dashboards:

- fleet health;
- live run throughput and failure rate;
- stuck/long-running runs;
- approval backlog and SLA;
- tool failure/latency;
- agent/version regressions;
- cost and token budgets;
- policy denials;
- incidents and recovery time;
- queue saturation and ingestion lag.

## 11. Charts

The main chart library supports:

- line and area time series;
- vertical time-series bars;
- vertical and horizontal bars;
- histograms;
- pie charts;
- big numbers;
- pivot tables;
- synchronized crosshairs, legends, tooltips, loading, and CSV download.

Its intended one-way architecture is:

```text
raw query data
  → normalized model
  → pure preparer
     (units, time, nulls, colors, ordering, top-N, scale)
  → presentational visualizer
  → pixels
```

Existing preparers cover time axes, dense series, and visible-series caps.
Some color, unit, axis, and legend decisions remain in visualizers and should
be refactored before adding many Mission Control charts.

The older dashboard/score analytics charts overlap with the newer widget chart
library. Consolidation should precede broad visual redesign.

## 12. Trace viewer architecture

The trace viewer is one of the strongest reusable assets.

### Data flow

`useTraceDetailData` chooses v4 event-based or legacy tRPC data. The result
enters `Trace`, which composes:

```text
ViewPreferencesProvider
└─ TraceDataProvider
   └─ TraceGraphDataProvider
      └─ SelectionProvider
         └─ SearchProvider
            └─ JsonExpansionProvider
               └─ PlayheadProvider
                  └─ responsive TraceContent
```

`TraceDataProvider`:

- deduplicates corrupt/colliding observation IDs;
- builds a trace tree, node map, and search index;
- applies observation-level filtering;
- merges optimistic scores;
- derives a single timeline origin and duration.

Desktop uses resizable navigation/detail panels. Mobile uses Tree, Timeline,
Graph, and Info tabs. Navigation can switch between tree, timeline, log/search,
and graph surfaces.

### Detail rendering

The detail panel supports:

- trace and observation metadata;
- input/output as formatted messages, JSON, raw JSON, or table;
- lazy/size-gated JSON rendering;
- media and tool definitions;
- model parameters, token/cost data, scores, comments, and corrections;
- optimistic updates, download, share, bookmark, and delete;
- virtualized trees and lists for large traces.

### Agent graph

The graph view is read-only and purpose-built:

- timing-based step inference or LangGraph metadata conversion;
- aggregated and expanded modes;
- hierarchy plus happened-before sibling edges;
- ELK asynchronous layout;
- HTML nodes over SVG edges;
- D3 zoom/pan/pinch;
- URL-backed selection;
- playback glow;
- size limits of 500 nodes and 250 layout edges.

Planned seams already exist for Web Worker layout and node virtualization.

### Mission Control evolution

Rename the product surface to Run Inspector while preserving trace IDs as the
telemetry correlation ID. Add:

- explicit run/task/step status and state transition lanes;
- live streaming and auto-follow;
- tool-call request/response and credential scope;
- human approval markers and decision detail;
- policy evaluations;
- retries, checkpoints, handoffs, and agent-to-agent messages;
- resource usage and sandbox lifecycle;
- operator actions: pause, resume, cancel, retry from checkpoint, quarantine;
- incident linking and audit trail.

## 13. Timeline components

`TraceTimeline` is a virtualized Gantt waterfall with:

- a fixed resizable name gutter;
- a single scroll-owning chart pane;
- transform-synchronized vertical gutter and horizontal time scale;
- flattened collapsible tree rows;
- score, comment, duration, cost, and token annotations;
- level filtering and color-coded metrics;
- prefetch on hover;
- selection reveal on both axes;
- a shared playhead with keyboard and pointer scrubbing;
- requestAnimationFrame playback without 60fps React state updates;
- bounded tick calculation from sub-second to multi-day traces;
- defensive support for extremely deep trees.

Reusable pieces include `TimelineBar`, `TimelineRows`, `TimelineScale`,
`TimelineGutterRow`, pure timeline calculations, fixtures, stories, and tests.

For Mission Control, generalize the row model rather than forking the
component. A lane type should determine bar style and detail projection:
agent, task, step, tool, approval wait, queue wait, retry, handoff, resource,
and incident marker.

## 14. Shared UI components

The reusable UI foundation includes:

- Radix-backed accordion, dialogs, drawer, dropdown, hover card, popover,
  select, tabs, tooltip, toggles, slider, scroll area, and sheet;
- buttons, inputs, labels, text areas, forms, cards, badges, alerts,
  breadcrumbs, skeletons, tables, calendars, and time pickers;
- a formal overlay layer system;
- responsive sidebar, navigation, page, header, and resizable layouts;
- side panels and table peek panels;
- DataTable controls, pagination, visibility, row density, saved views,
  selection, filters, and full-text search;
- JSON, Markdown, media, prompt reference, IO, and large-string viewers;
- CodeMirror editors;
- command menu, organization/project switchers, toasts, and empty/error states;
- trace-specific virtualized tree/list primitives.

Keep these as the design-system base. Rebrand tokens and navigation before
rewriting primitives.

## 15. Hooks

Cross-cutting hooks cover:

- project/environment/date-range resolution;
- pagination, order, filters, and column visibility;
- dashboard scheduling, SSE, and query options;
- responsive sizing, scroll preservation, and gradients;
- debounce, clipboard, watched promises, and form persistence;
- parsed trace/observation IO in browser workers;
- auth, RBAC, entitlements, feature flags, and project access;
- score, dataset, experiment, eval, prompt, and widget workflows;
- PostHog/Sentry-safe error reporting.

Mission Control should add feature-local hooks for live fleet/run streams,
operator commands, approval queues, incidents, policies, deployment health,
and budgets. Do not put domain-specific hooks in the root `hooks` directory.

## 16. Utilities and reusable modules

High-value reusable modules include:

- shared Zod domain contracts;
- ClickHouse query builders and repositories;
- ingestion processors and queue contracts;
- auth, RBAC, entitlement, encryption, and API-key utilities;
- storage adapters and media services;
- table definitions and filters;
- date, number, string, JSON, Markdown, ChatML, URL, and error utilities;
- dashboard widget/query adapters;
- tree, graph, timeline, and virtualization algorithms;
- seeded scenarios and test factories;
- public API middleware and Fern definitions.

The largest architectural risk is duplicated transition logic across legacy
trace/observation repositories and v4 event repositories. Mission Control
should build new features on the v4 events path only while keeping compatibility
adapters at the boundary.

## 17. Module classification

Classification is at the repository module/feature-directory level. Files
inside a module inherit its classification unless explicitly noted.

Definitions:

- **KEEP:** reusable with naming/theming or minor integration work.
- **REFACTOR:** strategically useful but its domain/API/UI must change.
- **REMOVE:** exclude from the Mission Control product surface after dependency
  and data-migration review; do not immediately delete shared dependencies.
- **NEW:** missing first-class Mission Control capability.

### Root and workspace modules

| Module | Class | Mission Control decision |
|---|---|---|
| `web` | REFACTOR | Keep runtime; replace information architecture and domain routes. |
| `worker` | REFACTOR | Keep queue plane; add command, policy, incident, and deployment processors. |
| `packages/shared` | REFACTOR | Keep platform contracts; add agent domain and converge on v4 events. |
| `packages/config-*`, `eslint-plugin` | KEEP | Tooling remains valid. |
| `packages/in-app-agent-sandbox-runtime` | REFACTOR | Generalize into governed agent/tool sandbox runtime. |
| `ee` and `web/src/ee` | REFACTOR | Preserve SSO/SCIM/audit/security; reassess Langfuse commercial coupling. |
| `fern` | REFACTOR | Retain API source of truth; publish Mission Control resources. |
| `generated` | KEEP | Regenerate only from Fern. |
| `scripts` | REFACTOR | Retain CI/eval runner utilities; add Mission Control seed/ops scripts. |
| `specs`, tests, Storybook | KEEP | Update alongside product migration. |
| Docker and deployment files | REFACTOR | Rebrand images/envs and add operational dependencies only if earned. |

### Web feature modules

| Feature | Class | Decision |
|---|---|---|
| analytics-integrations | REFACTOR | Convert to event/export integrations for agents and incidents. |
| annotation-queues | REFACTOR | Evolve into review, triage, and approval work queues. |
| audit-logs | KEEP | Core enterprise governance. |
| auth | KEEP | Preserve. |
| auth-credentials | REFACTOR | Expand to scoped tool/service credentials and vault references. |
| automations | REFACTOR | Become runbook/response automation with policy gates. |
| background-migrations | KEEP | Preserve operationally. |
| batch-actions | REFACTOR | Add run/task/operator bulk operations. |
| batch-exports | KEEP | Preserve with agent entities. |
| blobstorage-integration | KEEP | Preserve. |
| chart-view | REFACTOR | Rebase on agent/run dimensions. |
| chart-view-prototype | REMOVE | Fold proven work into chart-view; remove prototype surface. |
| cloud-status-notification | REFACTOR | Generalize to platform/service status. |
| column-visibility | KEEP | Preserve. |
| command-k-menu | REFACTOR | Agent/run/action command palette. |
| comments | KEEP | Preserve for incidents, runs, approvals. |
| corrections | REFACTOR | Generalize to operator annotations and expected outcomes. |
| dashboard | REFACTOR | Preserve engine; replace default dashboards and vocabulary. |
| datasets | REFACTOR | Recast as test suites/scenarios and regression corpora. |
| developer-tools | REFACTOR | Operational integration/dev tools. |
| entitlements | REFACTOR | Replace plan vocabulary if product packaging differs. |
| evals | REFACTOR | Keep quality/risk evaluation, attach to agents and versions. |
| events | KEEP | V4 event core is the preferred telemetry path. |
| experiments | REFACTOR | Agent/version canaries and comparative runs. |
| feature-flags | KEEP | Preserve. |
| feature-previews | KEEP | Preserve. |
| feedback | REFACTOR | Operator/user feedback on runs and agent versions. |
| filters | KEEP | Preserve and extend fields. |
| folders | REFACTOR | Apply to agents, policies, runbooks, and views. |
| global-time-range | KEEP | Preserve. |
| in-app-agent | REFACTOR | Become Mission Control copilot with governed actions. |
| llm-api-key | REFACTOR | Merge into scoped credential management. |
| llm-schemas | REFACTOR | Generalize to message/tool/data contracts. |
| llm-tools | REFACTOR | Become first-class tool registry. |
| mcp | KEEP | Key agent/tool integration surface. |
| media | KEEP | Preserve. |
| mixpanel-integration | REMOVE | Optional adapter; remove from core distribution if unused. |
| models | REFACTOR | Keep provider/model catalog under agent configuration. |
| monitors | REFACTOR | Become SLO, anomaly, and stuck-run monitors. |
| natural-language-filters | KEEP | Strong operator workflow. |
| navigate-detail-pages | KEEP | Preserve. |
| navigation | REFACTOR | Replace Langfuse IA with Mission Control IA. |
| notifications | REFACTOR | Incidents, approvals, budgets, deployment alerts. |
| onboarding | REFACTOR | Agent/source connection workflow. |
| orderBy | KEEP | Preserve. |
| organizations | KEEP | Preserve tenant boundary. |
| payment-banner | REMOVE | Remove from enterprise console core; retain only if SaaS packaging requires. |
| playground | REFACTOR | Convert to controlled agent simulation/replay lab. |
| posthog-analytics | REFACTOR | Rename product events and review data policy. |
| posthog-integration | REMOVE | Optional export adapter, not core. |
| projects | REFACTOR | Rename/display as workspaces while retaining tenant key compatibility. |
| prompts | REFACTOR | Agent configuration artifact, not top-level product pillar. |
| public-api | REFACTOR | Add agent/run/task/command/policy endpoints; version contracts. |
| rbac | KEEP | Extend scopes for operator commands and policies. |
| score-analytics | REFACTOR | Quality, risk, reliability, and compliance analytics. |
| score-configs | REFACTOR | Metric/policy/evaluator definitions. |
| scores | REFACTOR | Keep generic measure model; clarify level taxonomy. |
| sdk-version | REFACTOR | Agent runtime/instrumentation compatibility. |
| search-bar | KEEP | Extend grammar to all Mission Control entities. |
| setup | REFACTOR | Mission Control instance and source setup. |
| slack | KEEP | Preserve notification and approval integration. |
| support-chat | REMOVE | Product-specific support surface; replace with operator copilot/help. |
| table | KEEP | Core reusable data surface. |
| tag | KEEP | Preserve. |
| telemetry | REFACTOR | Product telemetry policy and naming. |
| theming | KEEP | Rebrand tokens. |
| top-banner | KEEP | Preserve. |
| trace-graph-view | REFACTOR | Agent topology/run graph, then add virtualization. |
| traces | REFACTOR | Present as runs while retaining trace compatibility. |
| tracing-tables | REFACTOR | Run/step tables over v4 events. |
| v4 | KEEP | Preferred storage/query direction. |
| v4-migration | REMOVE | Retire after the new baseline is complete. |
| version-update | REFACTOR | Mission Control release/update flow. |
| web-callouts | REFACTOR | Governed webhooks/actions with policy/audit. |
| widgets | REFACTOR | Preserve engine; add operational widgets. |

### Component modules

| Component area | Class | Decision |
|---|---|---|
| `components/ui` | KEEP | Design-system foundation; rebrand tokens only. |
| `components/design-system` | KEEP | Consolidate naming with UI primitives over time. |
| `components/layouts`, `components/nav` | REFACTOR | Preserve mechanics, replace IA and product chrome. |
| `components/table` | KEEP | Extend entity adapters. |
| `components/trace` | REFACTOR | Become Run Inspector; preserve internals. |
| `components/session` | REFACTOR | Agent/user session explorer. |
| `components/editor`, `schemas`, `ModelParameters` | REFACTOR | Agent/tool/policy configuration editors. |
| organization/project dropdowns | REFACTOR | Tenant/workspace switchers. |
| onboarding | REFACTOR | Connect sources and deploy agents. |
| ChatMessages | KEEP | Reuse for run IO and operator copilot. |
| magic/motion components | KEEP | Use selectively under Mission Control design system. |
| image/media components | KEEP | Preserve. |

### Shared modules

| Shared area | Class | Decision |
|---|---|---|
| `domain/observations`, `domain/traces` | REFACTOR | Compatibility projection for Run/Step. |
| `domain/scores` | REFACTOR | Generic metrics/risk/policy results. |
| `domain/dataset-*`, prompts, automations | REFACTOR | Map to test suites/config/runbooks. |
| errors, encryption, constants, interfaces | KEEP | Extend carefully. |
| feature contracts: filters, folders, RBAC, entitlements | KEEP/REFACTOR | Keep mechanics; update domain vocabulary. |
| `in-app-agent` | REFACTOR | General tool/action runtime contracts. |
| server auth, cache, instrumentation, Redis, S3, media | KEEP | Platform foundation. |
| server ClickHouse and repositories | REFACTOR | New code uses events; isolate legacy tables. |
| ingestion and OTEL | REFACTOR | Add agent semantic conventions. |
| queues | REFACTOR | Add control-plane command queues. |
| services and table mappings | REFACTOR | Add Mission Control entities. |
| model pricing and LLM services | KEEP | Important for cost governance. |
| test utilities and seeder | REFACTOR | Add fleet/run/incident scenarios. |

### Worker modules

| Worker area | Class | Decision |
|---|---|---|
| ingestion, OTEL, event propagation | KEEP | Extend agent semantics. |
| evaluation, experiments, scores, tokenisation | REFACTOR | Agent quality/risk execution. |
| monitors, notifications, Slack, webhooks | REFACTOR | Incident/approval/SLO workflows. |
| batch actions/exports | KEEP | Extend entity types. |
| retention/deletion/cleanup | KEEP | Required enterprise operations. |
| blob storage and media | KEEP | Preserve. |
| Mixpanel/PostHog processors | REMOVE | Optional adapters outside core worker. |
| cloud billing/metering | REFACTOR | Cost allocation/budgeting if SaaS; otherwise isolate. |
| queue metrics and worker manager | KEEP | Expose in Operations UI. |
| background migrations and health API | KEEP | Preserve. |

### New modules

| New module | Responsibility |
|---|---|
| `agents` | Registry, ownership, capabilities, status, versions. |
| `deployments` | Environment rollout, canary, rollback, health. |
| `runs` | First-class run control and telemetry projection. |
| `tasks` | Work queue, dependencies, assignment, SLA. |
| `tool-registry` | Tools, schemas, credentials, health, permissions. |
| `approvals` | Human-in-the-loop inbox and durable decisions. |
| `policies` | Versioned guardrails, bindings, decisions, simulation. |
| `incidents` | Detection, timeline, assignment, resolution, postmortem. |
| `fleet` | Live agent/service health and topology. |
| `operator-commands` | Pause, resume, cancel, retry, quarantine, replay. |
| `checkpoints` | Durable replay/recovery metadata. |
| `budgets` | Token, spend, latency, and resource budgets. |
| `service-catalog` | Services, environments, resources, ownership. |
| `runbooks` | Governed operational automations. |
| `live-stream` | SSE/WebSocket run and fleet updates with backpressure. |
| `mission-control-api` | Versioned external control API and event stream. |

## 18. Target Mission Control architecture

```text
                         MISSION CONTROL CONSOLE
 ┌──────────────────────────────────────────────────────────────────┐
 │ Fleet │ Runs │ Tasks │ Approvals │ Incidents │ Policies │ Cost │
 └──────────────────────────────┬───────────────────────────────────┘
                                │ tRPC
                       Control-plane services
        ┌───────────────┬───────┴────────┬──────────────────┐
        │ Agent registry│ Run commander  │ Policy/approval  │
        │ Deployments   │ Incident svc   │ Tool/credential  │
        └───────┬───────┴───────┬────────┴──────────┬───────┘
                │ PostgreSQL     │ Redis/BullMQ      │ Vault refs
                │                ▼                    │
                │          Async worker plane         │
                │     commands, evals, alerts, hooks  │
                │                                     │
 SDK/OTLP/events┴──────────▶ ClickHouse ◀─────────────┘
                    wide agent events
            core fields + deferred full payloads
```

Key rule: control commands and durable workflow state are transactional in
PostgreSQL; telemetry and state-transition history are append-oriented in
ClickHouse. A command must emit an audit event and converge through an
idempotent worker/agent-runtime protocol.

## 19. Migration roadmap

### Phase 0 — Baseline and product contract

Exit criteria:

- working full local stack in Docker;
- seed scenario and screenshots for current trace/dashboard workflows;
- agreed Mission Control vocabulary and route map;
- license review of MIT versus `ee` directories;
- baseline performance, ingestion, query, and bundle metrics;
- decision on SaaS billing/support integrations.

No product code should be removed in this phase.

### Phase 1 — Foundation and rebrand

- add Mission Control design tokens, name, metadata, navigation, and copy;
- introduce a translation layer from Project to Workspace in UI only;
- create new route shells and feature flags;
- preserve old routes with redirects;
- add new RBAC scopes and audit event types;
- create Mission Control seed scenarios.

Exit: a user can navigate the new shell without losing any existing capability.

### Phase 2 — Agent registry and semantic event model

- add Agent, AgentVersion, Deployment, Tool, and credential-binding models;
- define OpenTelemetry/Mission Control semantic conventions;
- extend ingestion validation and event columns;
- build agent inventory and detail pages;
- associate existing traces with agents using explicit fields, then safe
  inference only as a fallback.

Exit: every new run is attributable to an agent version, deployment,
environment, and workspace.

### Phase 3 — Run Explorer and Run Inspector

- expose Run as the primary UX entity;
- adapt trace/observation repositories behind Run/Step services;
- refactor Trace viewer into Run Inspector;
- generalize timeline lanes and graph nodes;
- add live updates, state transitions, retries, handoffs, tool calls, and
  checkpoint markers;
- preserve raw trace/observation advanced views.

Exit: operators can find, inspect, compare, and replay agent runs without using
legacy trace vocabulary.

### Phase 4 — Control plane and human approvals

- add Task, Approval, Policy, and Operator Command models;
- add command queues and idempotency keys;
- implement pause/resume/cancel/retry/quarantine adapters;
- turn annotation queues into operator/approval queues;
- require policy checks, RBAC, reason capture, and immutable audit records;
- add timeout, escalation, and notification rules.

Exit: authorized operators can safely intervene in supported agents, and every
intervention is auditable.

### Phase 5 — Fleet operations and incidents

- add service catalog, environment, resource, and health projections;
- add fleet overview and live run stream;
- evolve monitors into SLO/anomaly/stuck-run monitors;
- add incident lifecycle, assignments, comments, run links, and runbooks;
- expose BullMQ and ingestion health in an Operations surface.

Exit: Mission Control answers “what is broken, who owns it, what changed, and
what can I do now?”

### Phase 6 — Analytics, evaluation, cost, and release safety

- replace default dashboards with fleet/run/tool/policy/cost presets;
- reframe evals and experiments around agent versions and deployments;
- add budgets, allocation tags, and spend/latency/token alerts;
- support canary comparison and rollback recommendations;
- consolidate score analytics and chart implementations on the widget chart
  library.

Exit: teams can prove reliability, quality, compliance, and cost changes across
agent releases.

### Phase 7 — API, integrations, and ecosystem

- publish versioned Agent, Run, Task, Approval, Policy, Incident, Deployment,
  and Command APIs in Fern;
- add event streaming/webhooks for state changes;
- make MCP a first-class tool registry and operator integration;
- retain OTLP and Langfuse compatibility ingestion;
- ship runtime adapters for major agent frameworks.

Exit: external systems can observe and control agents without depending on
private tRPC contracts.

### Phase 8 — Legacy retirement

- measure route/API use and announce deprecations;
- stop writes to legacy-only storage paths;
- validate event-table parity and migrate retained metadata;
- remove chart-view prototype, v4 migration UI, obsolete support/payment
  surfaces, and optional product analytics exporters;
- collapse legacy traces/observations into compatibility APIs;
- delete code only after dependency, data, and customer migration gates pass.

Exit: no core Mission Control workflow depends on deprecated Langfuse product
surfaces or legacy write paths.

## 20. Delivery principles and risks

### Principles

- evolve via adapters and strangler routes, not a flag-day rewrite;
- append agent semantics to the v4 wide-event model;
- keep control-plane state transactional and event history append-oriented;
- make operator commands idempotent, authorized, policy-checked, and audited;
- defer large IO payloads until focused detail views;
- use time-bounded and token-paginated APIs;
- preserve tenant/project IDs during vocabulary changes;
- add seed scenarios and browser tests for every migration slice.

### Principal risks

1. **Dual data models:** legacy trace/observation and v4 event paths can diverge.
   New Mission Control features must target events only.
2. **Control safety:** observability code is read-heavy; active commands add
   security and correctness risk. Introduce a separate command boundary.
3. **Schema overload:** not every event deserves a PostgreSQL row. Keep
   high-volume step/tool history in ClickHouse.
4. **Provider nesting and page complexity:** current `_app` and dashboard pages
   are already dense. New global providers should be avoided.
5. **Chart duplication:** consolidate before adding operational chart variants.
6. **Enterprise licensing:** `ee` is not covered by the root MIT license in the
   same way as OSS directories; product/legal scope must be explicit.
7. **Operational dependency cost:** retain the existing four-service data
   topology unless a new database demonstrably earns its burden.

## 21. Immediate next actions

1. Provision Docker Desktop or a compatible Docker runtime and complete the
   full `pnpm run dx` verification.
2. Approve the Mission Control domain vocabulary, route map, and module
   classifications in this document.
3. Decide whether Mission Control is an OSS fork, an internal derivative, or a
   commercial product using Langfuse enterprise code.
4. Create an architecture decision record for Run/Step mapping and command
   safety.
5. Start Phase 1 only after those decisions; the first code change should be
   feature-flagged shell/domain scaffolding, not deletion or mass renaming.
