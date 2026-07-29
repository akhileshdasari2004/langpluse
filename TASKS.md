# Mission Control Migration Tasks

Status: IN PROGRESS — founder-facing information architecture refinement

Source of truth: `PROJECT_PRD.md`

This plan transforms the Langfuse-derived platform into Mission Control, an
enterprise AI agent operating console. It is additive: existing product
capabilities, enterprise controls, public contracts, and architectural
boundaries remain functional throughout the migration.

## Operating rules

- [ ] Read `PROJECT_PRD.md` completely before every implementation session.
- [ ] Read the relevant PRD module before starting its implementation.
- [ ] Change the selected PRD module and its tasks to `IN PROGRESS` before code
      changes.
- [ ] Implement production behavior; do not ship placeholders or incomplete
      screens.
- [ ] Preserve authentication, authorization, tenancy, licensing, billing,
      auditability, integrations, observability, and data lifecycle controls.
- [ ] Preserve backwards compatibility for public APIs, SDK ingestion, queue
      payloads, stored data, exports, and deep links unless a versioned migration
      is explicitly approved.
- [ ] Add deterministic enterprise seed scenarios for each user-visible module.
- [ ] Add unit, integration, and browser coverage appropriate to each change.
- [ ] Run the package-specific validation commands and a production build.
- [ ] Mark a PRD module `DONE` only after its implementation and validations
      pass.
- [ ] Commit each completed vertical slice with a descriptive commit message.
- [ ] Never combine schema deletion, feature deletion, or destructive data
      migration with an unrelated feature commit.

## Architecture classification

### KEEP

These modules remain architectural foundations or complete product
capabilities. They may receive Mission Control terminology and navigation
integration, but their contracts must remain intact.

- [ ] Monorepo and build foundation:
      `package.json`, `pnpm-workspace.yaml`, `turbo.json`, shared TypeScript,
      ESLint, Prettier, Vitest, Playwright, Storybook, Husky, and CI workflows.
- [ ] Runtime boundaries: `web/`, `worker/`, `packages/shared/`, `ee/`,
      `fern/`, and generated-client workflows.
- [ ] Next.js Pages Router shell, `_app.tsx`, `_document.tsx`, provider tree,
      project-aware routing, responsive layouts, overlay layer system, command
      menu, and theme infrastructure.
- [ ] UI primitives and design system in `web/src/components/ui`,
      `web/src/components/design-system`, layouts, navigation primitives,
      tables, editors, schemas, image/media components, and loading/error/empty
      states.
- [ ] Trace detail foundation in `web/src/components/trace`, including desktop
      and mobile layouts, navigation panels, selection, search, JSON expansion,
      IO rendering, comments, corrections, media, metadata, and download.
- [ ] Trace tree, log view, Gantt/timeline calculations, playback controls,
      playhead store, virtualized tree/list, prefetching, and large-payload
      safeguards.
- [ ] Trace graph inference, ELK layout, graph mode switching, graph nodes, and
      canvas data builders in `web/src/features/trace-graph-view`.
- [ ] Dashboard, widget, query streaming, date range, filters, query scheduling,
      grid layout, import/export, and chart library architecture.
- [ ] Recharts visualizations: time series, area, vertical/horizontal bar,
      histogram, pie, pivot table, big number, legends, probes, loading states,
      CSV export, and chart data preparers.
- [ ] TanStack tables/virtualization, saved views, column visibility,
      pagination, ordering, global filters, natural-language filters, and search
      grammar.
- [ ] State patterns: TanStack Query/tRPC server state, URL query state, scoped
      React contexts, bounded Zustand stores, and persisted view preferences.
- [ ] PostgreSQL/Prisma control plane, migrations, repositories, encryption,
      cache abstractions, and transactional services.
- [ ] ClickHouse event/trace/observation/score schemas, migrations, analytical
      repositories, timeline queries, materialized views, and query tagging.
- [ ] Redis/BullMQ queue contracts, sharding, worker lifecycle, retries,
      dead-letter behavior, metrics, ingestion processing, and idempotency.
- [ ] S3-compatible media/event/export storage, Azure/GCS/OCI adapters, signing,
      retention, deletion, and diagnostic services.
- [ ] OTLP and Langfuse ingestion endpoints, event normalization, v4 event
      transition, public traces/observations/sessions/scores APIs, rate limiting,
      CORS, and API-key authentication.
- [ ] Authentication and enterprise identity: NextAuth, credentials, SSO, SCIM,
      verified domains, organization/project membership, invitations, RBAC,
      API-key scopes, and session handling.
- [ ] Enterprise controls: organizations, projects, entitlements, licensing,
      billing, spend alerts, audit logs, UI customization, data retention,
      metering, and deployment configuration.
- [ ] Operational features: monitors, automations, notifications, Slack,
      webhooks/web callouts, batch actions, batch exports, background migrations,
      queue administration, health/readiness, telemetry, Sentry, Datadog, and
      PostHog instrumentation.
- [ ] Existing product capabilities: prompts, datasets, experiments,
      evaluations, annotation queues, feedback, playground, model configuration,
      score configuration/analytics, comments, corrections, folders, tags,
      media, integrations, and MCP.
- [ ] In-app agent contracts, sandbox runtime, approval persistence, MCP tools,
      conversations, events, and runs.
- [ ] Fern source definitions, public API tests, generated SDK workflow, API
      deprecation policy, and backward-compatible legacy routes.
- [ ] Seeder framework, deterministic scenarios, write verification, deep links,
      and existing support-agent/agent-timeline scenarios.
- [ ] Docker/self-hosted deployment, development compose files, container
      entrypoints, environment schemas/examples, previews, release workflows,
      security scanners, and license checks.

### REFACTOR

Refactors adapt presentation and domain semantics while preserving behavior and
contracts.

- [ ] Refactor product terminology from trace-centric presentation toward
      Agent, Run, Task, Step, Decision, Tool Invocation, Memory Access,
      Approval, Incident, Deployment, and Policy terminology.
- [ ] Refactor project navigation into Mission Control operational sections
      while retaining discoverable access to every existing feature.
- [ ] Refactor the current project home dashboard into the PRD Dashboard and
      Enterprise Dashboard presets using existing widgets and query contracts.
- [ ] Refactor trace detail into a run workbench that composes Summary, Live
      Timeline, Brain, Memory, Tools, Decisions, Graph, Replay, Root Cause, and
      Coach views without duplicating trace fetching or selection state.
- [ ] Refactor observation interpretation into typed agent-event projections;
      retain raw trace/observation/event access as an advanced telemetry view.
- [ ] Refactor the ELK-based trace graph renderer behind a graph adapter so the
      PRD-required React Flow workflow and multi-agent renderers can coexist
      without discarding proven graph-building logic.
- [ ] Refactor playback state into a reusable execution replay controller with
      deterministic event ordering, step navigation, speed, buffering, and
      URL-shareable position.
- [ ] Refactor timeline components to support streaming inserts, semantic event
      categories, retries, dependency edges, current-event focus, and
      accessibility announcements.
- [ ] Refactor dashboard query vocabulary to expose agent health, execution
      quality, reasoning score, memory accuracy, tool health, automation score,
      success/failure, latency, and cost while retaining generic widgets.
- [ ] Refactor scores and evaluations into reusable quality-signal providers for
      execution quality, reasoning, memory, tool choice, and coach evidence.
- [ ] Refactor datasets/experiments/simulation capabilities behind reusable
      scenario, fixture, replay, and comparison services.
- [ ] Refactor prompts/playground/model connections into supporting diagnostic
      tools reachable from executions, recommendations, and simulations.
- [ ] Refactor automations/monitors/notifications into incident detection,
      escalation, remediation, and operational policy surfaces.
- [ ] Refactor comments, corrections, annotation queues, and feedback into an
      enterprise review and human-oversight workflow.
- [ ] Refactor in-app agent UI and runtime boundaries so the AI Execution Coach
      is evidence-based, approval-aware, auditable, and isolated from primary
      production execution data.
- [ ] Refactor routes additively: introduce Mission Control canonical URLs and
      preserve old URLs through redirects or compatibility pages.
- [ ] Refactor branding across runtime metadata, emails, auth, navigation,
      manifests, examples, and user-facing copy without changing public protocol
      identifiers prematurely.
- [ ] Refactor seed data around realistic multi-agent enterprise executions,
      failures, decisions, memories, fallbacks, and improvements.
- [ ] Refactor analytics instrumentation around the new operational workflows
      while preserving privacy controls and existing event contracts.

### DELETE

No product feature, enterprise capability, public API, database model, queue, or
integration is approved for deletion. The following are deletion candidates
only after explicit evidence and separate approval.

- [ ] Identify unreachable duplicate UI implementations with `knip`, route
      inventory, import analysis, tests, and production-build evidence.
- [ ] Identify superseded prototypes such as experimental chart-view code only
      after the production replacement has full behavior and test parity.
- [ ] Identify obsolete Langfuse-only visual assets or copy only after all
      runtime, email, auth, social metadata, self-hosted, and white-label
      consumers are mapped.
- [ ] Identify obsolete compatibility shims only after supported upgrade paths
      and public-client usage are documented.
- [ ] Produce a deletion proposal listing references, stored-data impact,
      API/SDK compatibility, migration strategy, rollback, and validation.
- [ ] Obtain explicit approval for each deletion proposal.
- [ ] Perform approved deletions in isolated commits with complete regression
      coverage and rollback instructions.

### BUILD

- [ ] Agent/run/task/step/tool/memory/decision domain projection.
- [ ] Agent registry and agent health model.
- [ ] Mission Control operational dashboard preset.
- [ ] Enterprise dashboard preset.
- [ ] Live Agent Timeline with authenticated streaming updates.
- [ ] Agent Brain visualization.
- [ ] Memory Explorer.
- [ ] Tool Explorer.
- [ ] Decision Explorer.
- [ ] React Flow Workflow Graph.
- [ ] React Flow Multi-Agent Graph.
- [ ] Execution Replay engine and controls.
- [ ] Root Cause Analysis pipeline and evidence UI.
- [ ] AI Execution Coach pipeline, recommendation UI, estimated impact, and
      approval/audit lifecycle.
- [ ] Simulation Engine with failure injection and before/after comparison.
- [ ] Cross-module run workbench and deep-linking model.
- [ ] Enterprise policy, approval, incident, and deployment projections where
      required to make recommendations and simulations operationally safe.

## Milestone 0 — Baseline, governance, and safety

Exit criteria: the existing product has a reproducible full-stack baseline,
classification is approved, and every migration can be measured and rolled
back.

- [ ] Confirm `PROJECT_PRD.md` module statuses and checklist are the release
      authority.
- [ ] Record the current branch, commit, dirty files, runtime versions, and
      environment limitations.
- [ ] Preserve the untracked `PROJECT_PRD.md` until it is intentionally added in
      an approved documentation commit.
- [ ] Establish a route/API/schema/queue inventory artifact and owners.
- [ ] Establish compatibility guarantees for public REST, tRPC, OTLP, SDKs,
      exports, webhooks, and deep links.
- [ ] Establish enterprise invariants for tenancy, RBAC, SSO/SCIM, audit logs,
      billing, entitlements, retention, encryption, and secret handling.
- [ ] Establish performance budgets for ingestion, trace/run detail, streaming,
      graph layout, dashboards, and large payloads.
- [ ] Establish accessibility targets and browser/device test matrix.
- [ ] Establish visual-quality acceptance using Storybook and browser snapshots.
- [ ] Start working Docker infrastructure or document an approved equivalent.
- [ ] Run the seed doctor and bring PostgreSQL, ClickHouse, Redis, and MinIO to a
      healthy migrated state.
- [ ] Capture baseline evidence for install, agents check, generation, lint,
      typecheck, targeted tests, production build, client-bundle scan, and a
      full-stack smoke test.
- [ ] Commit baseline documentation separately.

## Milestone 1 — Mission Control information architecture

Current slice: **IN PROGRESS** — refine the founder-facing shell and navigation
without removing compatibility-critical capabilities.

Exit criteria: users understand the product in under 30 seconds, every existing
capability remains accessible, and canonical operational routes are stable.

- [ ] Mark Dashboard `IN PROGRESS` in `PROJECT_PRD.md`.
- [ ] Define canonical routes for overview, agents, runs, tasks, approvals,
      incidents, deployments, policies, tools, operations, analytics, audit, and
      settings.
- [ ] Map every existing route to a canonical destination, retained advanced
      route, or compatibility redirect.
- [ ] Rework project navigation into Observe, Diagnose, Improve, Operate, Build,
      and Admin groupings without removing entries.
- [ ] Add capability-aware navigation using existing entitlements and RBAC.
- [ ] Preserve organization/project switching and all account/setup flows.
- [ ] Add Mission Control page titles, breadcrumbs, command-menu actions, empty
      states, skeletons, and error states.
- [ ] Audit responsive behavior and overlay-layer compliance.
- [ ] Add navigation and route-compatibility client tests.
- [ ] Run real-browser desktop and mobile reviews.
- [ ] Mark Dashboard `DONE` only when the dashboard slice in Milestone 3 passes.
- [ ] Commit the information architecture slice.

## Milestone 2 — Agent execution semantic layer

Exit criteria: existing telemetry can be queried as stable Mission Control
agent executions without changing or duplicating ingestion.

- [ ] Define Zod/TypeScript contracts for Agent, Run, Task, Step, Tool
      Invocation, Memory Access, Decision, Alternative, Retry, Approval,
      Incident, Deployment, Policy, and Execution Quality.
- [ ] Define mappings from v3 traces/observations and v4 events into the new
      contracts.
- [ ] Define canonical event categories: task received, planning, reasoning,
      memory retrieval, decision, tool call, observation, retry, handoff,
      approval, completion, and failure.
- [ ] Define stable identity, parent/child, dependency, agent ownership, clock,
      sequence, and causality rules.
- [ ] Define metadata conventions for confidence, alternatives, memory
      relevance/freshness, tool dependencies, retry/fallback, and failure
      evidence.
- [ ] Define compatibility behavior for incomplete or legacy instrumentation.
- [ ] Implement client-safe domain contracts in `packages/shared/src/domain` or
      an approved feature namespace.
- [ ] Implement server-only projection/query services in
      `packages/shared/src/server`.
- [ ] Reuse ClickHouse wide events; add columns or projections only when query
      evidence justifies them.
- [ ] Add Prisma control-plane models only for mutable configuration or workflow
      state that cannot be derived from telemetry.
- [ ] Add indexed, time-bounded, project-scoped repository queries.
- [ ] Add authorization and entitlement checks to every new server surface.
- [ ] Add public API contracts only if an external consumer is required; update
      Fern sources and regenerate clients.
- [ ] Add deterministic mapping, ordering, legacy-compatibility, authorization,
      and query-performance tests.
- [ ] Validate ingestion and existing trace pages remain unchanged.
- [ ] Commit contracts, storage changes, and projection services as separate
      reversible slices.

## Milestone 3 — Dashboard and Enterprise Dashboard

Exit criteria: the landing experience shows the complete operational state and
supports drill-down into filtered runs.

- [ ] Mark Dashboard and Enterprise Dashboard `IN PROGRESS`.
- [ ] Define metrics and formulas for agent health, success rate, latency,
      execution quality, failures, live agents, cost, and history.
- [ ] Define enterprise metrics for reasoning score, memory accuracy, tool
      health, automation score, failure rate, and service-level trends.
- [ ] Specify aggregation level, time window, freshness, null behavior, and
      quality caveats for every metric.
- [ ] Extend the existing dashboard query vocabulary and widget presets.
- [ ] Build a Mission Control home preset using the existing dashboard grid.
- [ ] Build an Enterprise Dashboard preset with role-appropriate detail.
- [ ] Add health cards, live activity, failure clusters, latency/cost trends,
      quality breakdowns, tool health, and recent executions.
- [ ] Make every chart/card drill down through compatible filter URLs.
- [ ] Preserve custom dashboards, widget editing, import/export, and public
      dashboard APIs.
- [ ] Add streaming progress, skeleton, empty, partial-error, and stale-data
      states.
- [ ] Follow the chart preparer/visualizer architecture and accessibility rules.
- [ ] Add query, formatter, widget, route, and browser tests.
- [ ] Validate large projects and bounded time-window query behavior.
- [ ] Mark Dashboard and Enterprise Dashboard `DONE`.
- [ ] Commit each dashboard vertical slice separately.

## Milestone 4 — Live Agent Timeline

Exit criteria: an authenticated user can watch a running agent update in order
without refreshing and can inspect every event.

- [ ] Mark Live Agent Timeline `IN PROGRESS`.
- [ ] Define the streaming transport, reconnect semantics, cursor/resume token,
      authorization, rate limits, heartbeat, and terminal states.
- [ ] Prefer the existing query/streaming infrastructure where it satisfies
      delivery and scale requirements.
- [ ] Extend timeline flattening and calculations for semantic event categories,
      open spans, retries, handoffs, and dependency indicators.
- [ ] Add live insertion without playhead jumps or lost selection.
- [ ] Add filters for agent, event category, status, tool, and severity.
- [ ] Add current-event focus, auto-follow, pause-following, and unread counts.
- [ ] Add expandable task, planning, reasoning, memory, tool, observation,
      retry, completion, and failure rows.
- [ ] Preserve the existing Gantt view and raw observation access.
- [ ] Add keyboard navigation and accessible live-region announcements.
- [ ] Add reconnection, duplicate-event, out-of-order, late-event, and high-rate
      tests.
- [ ] Add deterministic live-agent seed data.
- [ ] Mark Live Agent Timeline `DONE`.
- [ ] Commit transport, projection, and UI slices separately.

## Milestone 5 — Agent Brain and Decision Explorer

Exit criteria: engineers can follow the goal-to-completion reasoning chain and
inspect selected and rejected alternatives with evidence.

- [ ] Mark Agent Brain and Decision Explorer `IN PROGRESS`.
- [ ] Define safe reasoning display rules that avoid inventing or exposing
      unavailable private chain-of-thought.
- [ ] Treat explicit application-supplied reasoning summaries, decisions,
      confidence, and alternatives as evidence; clearly label inferred data.
- [ ] Build the Goal → Plan → Thought/Summary → Decision → Tool → Observation →
      Next Plan → Complete projection.
- [ ] Display confidence, latency, reasoning summary, provenance, and
      alternatives per node.
- [ ] Build selected/rejected alternative comparisons with reason, error,
      timeout, and confidence.
- [ ] Link every decision to source events, memories, tools, outputs, and scores.
- [ ] Add search, filtering, collapse/expand, keyboard navigation, and stable
      deep links.
- [ ] Add missing-data, conflicting-evidence, partial-trace, and large-graph
      behavior.
- [ ] Add projection and component tests plus browser review.
- [ ] Mark Agent Brain and Decision Explorer `DONE`.
- [ ] Commit each explorer independently.

## Milestone 6 — Memory Explorer

Exit criteria: every recorded memory retrieval and rejection is inspectable,
comparable, access-controlled, and tied to execution outcomes.

- [ ] Mark Memory Explorer `IN PROGRESS`.
- [ ] Define memory event contracts for query, result, rejection, source,
      similarity, confidence, latency, freshness, business context, and usage.
- [ ] Define redaction, retention, and access rules for sensitive memory
      contents.
- [ ] Build retrieved/rejected memory tables and detail panels.
- [ ] Add relevance, freshness, source, latency, and outcome comparisons.
- [ ] Link memories to decisions, tool calls, agent steps, scores, and failures.
- [ ] Support large payload deferral, media references, JSON/text/chat views,
      copy/download permissions, and masked values.
- [ ] Add filters, sorting, saved views, pagination, and deep links.
- [ ] Add realistic enterprise memory seed scenarios.
- [ ] Add authorization, redaction, repository, component, and browser tests.
- [ ] Mark Memory Explorer `DONE`.
- [ ] Commit the memory slice.

## Milestone 7 — Tool Explorer

Exit criteria: every tool invocation exposes its complete operational lifecycle
without leaking secrets.

- [ ] Mark Tool Explorer `IN PROGRESS`.
- [ ] Define invocation contracts for request, response, latency, retries,
      errors, fallback, dependencies, approval, and status.
- [ ] Reuse existing tool-definition cards, IO previews, media rendering, JSON
      virtualization, and error presentation.
- [ ] Build invocation list, detail, dependency, retry, and fallback views.
- [ ] Add tool health summaries and execution-to-tool drill-down.
- [ ] Redact credentials, authorization headers, cookies, signed URLs, and
      configured secret fields.
- [ ] Apply outbound URL, SSRF, webhook, and MCP security controls where tools
      can be invoked or replayed.
- [ ] Add filters, saved views, export controls, and stable deep links.
- [ ] Add realistic success, timeout, retry, fallback, and approval seed data.
- [ ] Add authorization, redaction, large-payload, component, and browser tests.
- [ ] Mark Tool Explorer `DONE`.
- [ ] Commit the tool explorer slice.

## Milestone 8 — Workflow Graph and Multi-Agent Graph

Exit criteria: users can understand execution order, dependencies, loops,
handoffs, and agent communication at production scale.

- [ ] Mark Workflow Graph and Multi-Agent Graph `IN PROGRESS`.
- [ ] Define a renderer-neutral graph model from existing trace graph builders.
- [ ] Preserve aggregated and expanded execution modes.
- [ ] Introduce React Flow as required by the PRD only after dependency approval.
- [ ] Implement typed workflow and multi-agent nodes using shared design-system
      primitives.
- [ ] Implement animated edges/nodes, execution-order highlighting, zoom, fit,
      MiniMap, selection, keyboard navigation, and reduced-motion behavior.
- [ ] Represent loops, retries, fan-out/fan-in, tool dependencies, handoffs, and
      inter-agent messages.
- [ ] Synchronize graph selection with timeline, detail, brain, memory, tools,
      decisions, and replay.
- [ ] Preserve ELK layout as a proven layout engine behind the adapter where
      useful.
- [ ] Move expensive graph construction/layout off the critical UI path where
      profiling requires it.
- [ ] Add 1-node, deep-chain, wide-fanout, cyclic, multi-agent, partial, and
      5,000-node stress fixtures.
- [ ] Add graph-model, layout, interaction, accessibility, and browser tests.
- [ ] Mark Workflow Graph and Multi-Agent Graph `DONE`.
- [ ] Commit graph foundation, workflow graph, and multi-agent graph separately.

## Milestone 9 — Execution Replay

Exit criteria: every completed execution can be replayed deterministically with
play, pause, forward, back, timeline, and speed controls.

- [ ] Mark Replay Engine `IN PROGRESS`.
- [ ] Define deterministic ordering for equal timestamps, late events, retries,
      and nested spans.
- [ ] Extend the existing playhead store and playback controls into a reusable
      replay controller.
- [ ] Implement play, pause, step forward, step back, seek, restart, end, and
      speed controls.
- [ ] Synchronize the replay cursor across timeline, graph, agent brain, memory,
      tools, and decisions.
- [ ] Preserve selection and inspection while playback is paused.
- [ ] Add shareable replay position and view state without exposing sensitive
      filters.
- [ ] Add accessible keyboard controls and reduced-motion behavior.
- [ ] Add buffering/progressive-load behavior for long executions.
- [ ] Add ordering, boundary, speed, synchronization, and browser tests.
- [ ] Mark Replay Engine `DONE`.
- [ ] Commit replay controller and integrated UI separately.

## Milestone 10 — Root Cause Analysis

Exit criteria: failed executions receive an evidence-linked diagnosis covering
root cause, affected tools, memory, reasoning, latency, and suggested fixes.

- [ ] Mark Root Cause Analysis `IN PROGRESS`.
- [ ] Define a deterministic failure evidence bundle from events, errors,
      retries, dependencies, memory, decisions, scores, and latency anomalies.
- [ ] Define root-cause categories, confidence, evidence links, uncertainty, and
      unsupported-analysis behavior.
- [ ] Separate deterministic findings from model-generated interpretation.
- [ ] Build an idempotent queued analysis pipeline with versioned prompts/models,
      retries, timeouts, budgets, and dead-letter behavior.
- [ ] Encrypt provider credentials and prevent sensitive payloads from entering
      prompts without configured masking.
- [ ] Persist analysis version, evidence references, model, timestamps, status,
      cost, and audit metadata.
- [ ] Build root cause, affected tools, memory issues, reasoning errors, latency
      problems, and suggested-fix UI.
- [ ] Support regeneration, stale-analysis indicators, feedback, and reviewer
      correction without overwriting history.
- [ ] Add authorization, prompt-injection, data-exfiltration, timeout,
      hallucination-labeling, queue, and browser tests.
- [ ] Mark Root Cause Analysis `DONE`.
- [ ] Commit evidence pipeline, analysis worker, and UI separately.

## Milestone 11 — AI Execution Coach

Exit criteria: the coach produces auditable, evidence-based improvements with
estimated impact and never mutates production configuration without approval.

- [ ] Mark AI Execution Coach `IN PROGRESS`.
- [ ] Define recommendation categories: plan, tool, memory, retry policy,
      prompt, cost, latency, and reliability.
- [ ] Define evidence, confidence, estimated impact, uncertainty, applicability,
      model/version, and lifecycle contracts.
- [ ] Reuse evaluation, scoring, prompt, model, dataset, experiment, comment,
      correction, and in-app-agent capabilities as supporting systems.
- [ ] Build an idempotent queued recommendation pipeline with budgets, rate
      limits, retries, cancellation, observability, and dead-letter handling.
- [ ] Add safeguards against prompt injection, cross-tenant retrieval, tool
      misuse, secret leakage, and unapproved production changes.
- [ ] Build recommendation list/detail, evidence links, before/after estimate,
      reviewer feedback, dismissal, approval, and audit history.
- [ ] Require explicit approval before converting a recommendation into prompt,
      policy, tool, retry, deployment, or automation changes.
- [ ] Preserve immutable recommendation history and explain supersession.
- [ ] Add offline evaluation datasets and regression thresholds for
      recommendation quality.
- [ ] Add deterministic and adversarial seed scenarios.
- [ ] Add pipeline, authorization, approval, audit, UI, and browser tests.
- [ ] Mark AI Execution Coach `DONE`.
- [ ] Commit contracts, pipeline, UI, and approval lifecycle separately.

## Milestone 12 — Simulation Engine

Exit criteria: users can replay an execution under CRM offline, Slack failure,
missing memory, API timeout, and changed-customer scenarios and compare the new
reasoning safely.

- [ ] Mark Simulation `IN PROGRESS`.
- [ ] Define immutable simulation scenario, failure injection, input override,
      dependency stub, result, comparison, and provenance contracts.
- [ ] Reuse datasets/experiments for fixtures, runs, comparisons, and
      reproducibility where their contracts fit.
- [ ] Reuse sandbox and evaluation infrastructure without granting production
      credentials or network access by default.
- [ ] Implement CRM offline, Slack failure, memory missing, API timeout, and
      customer changed scenarios.
- [ ] Add deterministic clocks, random seeds, provider/model versions, tool
      fixtures, and execution budgets.
- [ ] Isolate simulation queues, storage, API keys, rate limits, and audit logs
      from production execution.
- [ ] Build scenario configuration, run progress, replay, before/after graph,
      reasoning, quality, cost, latency, and reliability comparison.
- [ ] Prevent simulated output from being confused with production telemetry.
- [ ] Add cancellation, retries, partial results, cleanup, retention, and export.
- [ ] Add security, isolation, determinism, worker, comparison, and browser
      tests.
- [ ] Mark Simulation `DONE`.
- [ ] Commit simulation contracts, execution engine, and UI separately.

## Milestone 13 — Enterprise operations integration

Exit criteria: Mission Control features respect and strengthen all existing
enterprise controls.

- [ ] Map each new entity and action to organization/project tenancy and RBAC.
- [ ] Add audit-log resource/action types for viewing sensitive evidence,
      generating analyses, approvals, simulations, exports, and policy changes.
- [ ] Add entitlement and usage-metering decisions without degrading
      self-hosted behavior.
- [ ] Add SSO/SCIM and verified-domain regression coverage.
- [ ] Add configurable retention and deletion handling for new mutable records
      and generated analysis artifacts.
- [ ] Add masking/encryption rules for memory, tool IO, reasoning summaries,
      provider payloads, and simulation fixtures.
- [ ] Integrate incidents and recommendations with monitors, automations,
      notifications, Slack, and webhooks.
- [ ] Add approval policies for risky recommendations, replays, simulations, and
      external actions.
- [ ] Add operational visibility for queues, failures, retries, analysis costs,
      and model/provider health.
- [ ] Add blob-storage export mappings and documentation review if new exported
      fields are introduced.
- [ ] Add organization/project deletion coverage for all new records.
- [ ] Run the repository security-review skill and raw security checks.
- [ ] Commit enterprise integration slices independently.

## Milestone 14 — Design polish, performance, and accessibility

Exit criteria: every PRD module is production-ready, responsive, accessible,
fast, animated appropriately, and visually coherent.

- [ ] Apply the Mission Control dark/glass visual language through existing
      tokens and component variants.
- [ ] Preserve white-label and UI-customization behavior.
- [ ] Add polished empty, loading, skeleton, streaming, partial-data, error, and
      permission-denied states to every new surface.
- [ ] Use Framer Motion only after dependency approval and only where motion
      conveys state, causality, or focus.
- [ ] Respect reduced-motion, contrast, focus visibility, screen readers, and
      keyboard-only operation.
- [ ] Profile run workbench render frequency, large JSON, virtual lists,
      timeline updates, graph layout, dashboard concurrency, and streaming.
- [ ] Enforce deferred large-field loading and bounded analytical queries.
- [ ] Test desktop, tablet, and mobile layouts in a real browser.
- [ ] Add/update Storybook stories for reusable and isolated components.
- [ ] Run client-bundle scanning and address Node-only or oversized dependencies.
- [ ] Conduct a consistency review across tables, filters, overlays, badges,
      dates, costs, scores, errors, and navigation.
- [ ] Commit polish changes by module rather than as a broad redesign.

## Milestone 15 — Release readiness and migration

Exit criteria: all PRD checklist items are `DONE`, existing capabilities remain
functional, and rollback is proven.

- [ ] Verify every PRD module and development-checklist item is `DONE`.
- [ ] Verify no existing feature, API, queue, schema, integration, or enterprise
      control was unintentionally removed.
- [ ] Run `pnpm install --frozen-lockfile`.
- [ ] Run `pnpm run agents:check`.
- [ ] Run `pnpm run db:generate`.
- [ ] Run all package lint and typecheck tasks.
- [ ] Run targeted unit/integration tests for every changed package.
- [ ] Run the full test suite.
- [ ] Run `pnpm run build:check`.
- [ ] Run `pnpm run build`.
- [ ] Run `pnpm run scan:client-bundle` against the production web build.
- [ ] Run Playwright end-to-end coverage for the complete enterprise scenario.
- [ ] Ingest and inspect a full Incoming Sales Email execution through Planner,
      Memory, CRM, ERP, Slack, Customer Email, and completion.
- [ ] Verify live streaming, brain, memory, tools, decisions, workflow graph,
      multi-agent graph, replay, root cause, coach, and simulation.
- [ ] Verify public APIs, OTLP ingestion, SDK compatibility, exports, webhooks,
      old deep links, and self-hosted deployment.
- [ ] Verify RBAC, SSO/SCIM, API keys, audit logs, billing, entitlements,
      retention, deletion, masking, and tenant isolation.
- [ ] Run CodeQL, Semgrep, Snyk, secret scanning, dependency review, and the
      repository security-review workflow.
- [ ] Validate performance budgets with realistic high-volume seed scenarios.
- [ ] Document schema expansion, deployment order, worker/web rolling
      compatibility, feature flags, observability, and rollback.
- [ ] Roll out additively behind approved capability flags.
- [ ] Validate production-like telemetry before enabling each module by default.
- [ ] Create the final release commit and tag only after explicit approval.

## Required test scenarios

- [ ] Happy-path enterprise sales-email execution.
- [ ] CRM unavailable with ERP fallback.
- [ ] Slack timeout and retry exhaustion.
- [ ] Missing, stale, low-confidence, rejected, and contradictory memories.
- [ ] Multiple rejected decisions before a successful selection.
- [ ] Tool approval accepted, rejected, expired, and revoked.
- [ ] Planner-to-specialist-to-reviewer multi-agent handoffs.
- [ ] Nested loops, parallel fan-out/fan-in, and repeated tool calls.
- [ ] Partial, malformed, duplicated, late, and out-of-order telemetry.
- [ ] Long-running live execution interrupted by reconnect.
- [ ] Large execution with thousands of steps and large IO payloads.
- [ ] Root cause with strong evidence, weak evidence, and no supported result.
- [ ] Coach recommendation approved, dismissed, superseded, and stale.
- [ ] Simulation cancellation, timeout, partial result, and deterministic rerun.
- [ ] Cross-project and cross-organization access denial.
- [ ] Masked secrets and sensitive business data in memory/tool/reasoning views.
- [ ] Organization/project deletion and retention expiry.
- [ ] Existing prompts, datasets, evaluations, playground, feedback, billing,
      organization, integration, and API workflows.

## Commit strategy

- [ ] Use one descriptive commit per complete, validated vertical slice.
- [ ] Separate contracts, database migrations, worker rollout, API rollout, and
      UI enablement when rolling-deployment compatibility requires it.
- [ ] Keep additive schema changes backward-compatible before deploying readers.
- [ ] Deploy readers before removing obsolete writes; removal requires separate
      approval and evidence.
- [ ] Never commit failing intermediate states.
- [ ] Include validation evidence and rollback notes in each milestone handoff.
