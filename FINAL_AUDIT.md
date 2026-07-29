# Mission Control Final Product Audit

**Audit date:** 2026-07-29
**Repository state:** `main`, 43 commits ahead of `origin/main`, clean before
this audit
**Scope:** founder-facing product surface, architecture, navigation, demo data,
quality gates, and production readiness.

## Executive decision

Mission Control is now the founder-facing operating-console direction of this
repository. Its reusable foundation is strong: project-scoped authentication,
RBAC, tenant isolation, tRPC/TanStack Query server state, ClickHouse execution
storage, Prisma control-plane data, background workers, dashboards, charts,
tables, timeline rendering, graph layout, replay state, and a deterministic
Northstar Logistics scenario.

The repository is **not yet safe to present as a fully independent replacement
for every legacy product capability**. The governing documents explicitly
require additive migration and preserve existing APIs, SDKs, ingestion, stored
data, queues, enterprise controls, and deep links. Consequently, this audit
does not approve a bulk rename or deletion of protocol-level terminology.
Those terms must be removed from the primary Mission Control experience while
remaining available as compatibility infrastructure or advanced operational
tools until a versioned retirement is approved.

## Architecture improvements

### What is already reusable

| Layer               | Current implementation                                                                            | Mission Control role                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Application shell   | Next.js 16 Pages Router, authenticated layout, project switcher, command menu, responsive sidebar | Retain as the Mission Control shell.                                                                         |
| Client state        | tRPC + TanStack Query, URL state, scoped contexts, small Zustand stores                           | Retain; the run workbench already shares replay, live-run, and projection state.                             |
| Execution data      | ClickHouse traces, observations, events, scores; PostgreSQL/Prisma control plane                  | Treat as the execution ledger and quality-signal store; keep legacy field names at the persistence boundary. |
| Operational UI      | Tables, virtual lists, detail drawers, JSON/media rendering, filters, dashboard grid, Recharts    | Reuse rather than create competing visual systems.                                                           |
| Run diagnosis       | `RunWorkbench`, Timeline, Agent Brain, Memory Explorer, Decision Explorer, Replay, Simulation     | This is the product’s core “inspect one execution” composition boundary.                                     |
| Enterprise platform | NextAuth, SSO/SCIM, RBAC, API keys, audit log, billing/entitlements, queues, object storage       | Preserve unchanged behind the Mission Control product surface.                                               |

### Recommended target boundary

```
Mission Control shell
  ├─ Dashboard and analytics
  ├─ Agent registry and live agents
  └─ Runs
      └─ Run Workbench
          ├─ Timeline
          ├─ Agent Brain
          ├─ Memory Explorer
          ├─ Tool Explorer       (not yet implemented)
          ├─ Decision Explorer
          ├─ Replay
          ├─ Simulation Lab
          └─ Execution Coach     (not yet implemented)

Compatibility and enterprise infrastructure
  ├─ Existing ingestion / SDK / OTLP / public APIs
  ├─ Existing schema, queues, exports, webhooks, storage
  └─ Advanced legacy feature routes, retained behind explicit access paths
```

This avoids duplicate data fetching, parallel playback stores, or a second
graph model. It also keeps tenant, audit, and authorization boundaries in the
existing proven layers.

## Terminology and product-surface audit

### Inventory

The tracked source and documentation tree contains the following occurrences.
These are inventory counts, not all founder-facing copy.

| Term              | Occurrences | Required treatment                                                                                                                       |
| ----------------- | ----------: | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Langfuse          |      10,918 | Replace visible branding; retain package names, SDK/API compatibility, migrations, and ingestion identifiers until versioned retirement. |
| Prompt            |      10,275 | Keep supporting capability and internal protocol; remove from primary Mission Control navigation.                                        |
| Dataset           |      11,179 | Keep as simulation/evaluation fixture infrastructure; do not delete schema or API.                                                       |
| Scores            |       6,700 | Present as execution-quality signals where appropriate; retain score contracts.                                                          |
| Experiment        |       5,767 | Keep as controlled scenario/comparison infrastructure.                                                                                   |
| LLM               |       4,597 | Preserve provider/model integration terminology in technical configuration only.                                                         |
| Evaluation        |       1,954 | Keep as quality evidence for the Execution Coach and simulation.                                                                         |
| Sessions          |       1,063 | Keep execution grouping and compatibility routes; do not make it a primary concept.                                                      |
| Tracing           |         520 | Present as runs/execution telemetry in primary UX; retain telemetry API vocabulary.                                                      |
| Playground        |         510 | Keep as a supporting diagnostic tool, not core navigation.                                                                               |
| Observability     |         187 | Use only for technical documentation and compatibility surfaces.                                                                         |
| Prompt Management |          33 | Keep capability access behind advanced tools until its replacement has parity.                                                           |
| Model Provider    |           7 | Keep technical configuration terminology.                                                                                                |

### Replacement rule

1. **Primary Mission Control UI:** use Agent, Run, Execution, Step, Decision,
   Tool Invocation, Memory Access, Approval, Incident, Policy, and Quality
   Signal.
2. **Advanced/compatibility UI:** retain precise legacy labels where changing
   them would make an existing workflow ambiguous or break support material.
3. **Contracts and data:** do not rename public API fields, SDK namespaces,
   database models, queue payloads, storage keys, OTLP attributes, or migration
   history without a separately approved, versioned migration.
4. **External branding:** replace visible logos, help links, metadata, auth
   copy, emails, and social assets only after their consumer list is mapped.

## Page audit

| Area                                                                   | Classification           | Decision                                                                                                                                                             |
| ---------------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project dashboard                                                      | **REFINE**               | Keep the Mission Control preset as the landing view; retain custom dashboards as an advanced capability.                                                             |
| Agent registry                                                         | **REFINE**               | Keep; distinguish configured agents from live execution activity in copy and IA.                                                                                     |
| Runs list                                                              | **KEEP**                 | It is the primary entry point into diagnosis. Continue presenting trace data as runs.                                                                                |
| Run Workbench                                                          | **KEEP**                 | It is the core integration surface and should remain a single synchronized execution context.                                                                        |
| Live Timeline                                                          | **KEEP**                 | Reuse its timeline, filtering, streaming, and raw-event infrastructure.                                                                                              |
| Agent Brain                                                            | **KEEP**                 | Preserve React Flow graph projection and node inspection.                                                                                                            |
| Memory Explorer                                                        | **KEEP**                 | Preserve as a run-workbench view with execution evidence.                                                                                                            |
| Decision Explorer                                                      | **KEEP**                 | Preserve as a run-workbench view with alternate-path comparison.                                                                                                     |
| Replay                                                                 | **KEEP**                 | Preserve shared playhead state and synchronized views.                                                                                                               |
| Simulation Lab                                                         | **KEEP**                 | Preserve its scenario comparison and clear simulated-versus-production distinction.                                                                                  |
| Tool Explorer                                                          | **REBUILD**              | Required by the PRD and final navigation, but no production-complete standalone view exists. It must reuse IO, redaction, timeline, and dependency components.       |
| Execution Coach                                                        | **REBUILD**              | Required by the PRD, but needs an evidence-backed, approved recommendation pipeline; do not add a decorative screen.                                                 |
| Analytics                                                              | **REBUILD**              | Existing dashboards provide infrastructure, but a dedicated execution-analytics information architecture has not been completed.                                     |
| Prompt, dataset, evaluation, experiment, playground, score pages       | **MERGE**                | Remove from primary navigation, retain as advanced supporting workflows and compatibility routes. They remain needed by the PRD’s Coach and Simulation architecture. |
| Sessions                                                               | **MERGE**                | Retain grouping data and deep links; surface it as run context rather than a top-level operating-console concept.                                                    |
| Monitors and automations                                               | **REFINE**               | Keep as incident detection, escalation, remediation, and policy capability.                                                                                          |
| Authentication, organization/project setup, account, settings, billing | **KEEP**                 | Enterprise infrastructure; not founder-demo surface, but must remain functional and discoverable through settings/admin paths.                                       |
| Public APIs, SDK pages, OTLP/ingestion, exports, webhooks              | **KEEP**                 | Compatibility-critical infrastructure.                                                                                                                               |
| Legacy route families without a tested replacement                     | **REMOVE: NOT APPROVED** | No route, API, model, queue, feature flag, or integration is approved for deletion under `PROJECT_PRD.md` and `TASKS.md`.                                            |

### Primary navigation status

The requested final navigation is the target information architecture:

1. Mission Control
2. Dashboard
3. Live Agents
4. Runs
5. Replay
6. Agent Brain
7. Memory Explorer
8. Tool Explorer
9. Decision Explorer
10. Simulation Lab
11. Execution Coach
12. Analytics
13. Agents
14. Settings

Current implemented primary navigation remains: Overview, Dashboards, Agents,
Agent Runs, Run Sessions, Monitors, Automations, and Settings. The mismatch is
intentional debt, not a cosmetic issue: Replay, Brain, Memory, Decisions, and
Simulation require a selected run; Tool Explorer, Coach, and Analytics lack
complete canonical pages. Adding top-level links before those routes are
functional would create dead or duplicate navigation, violating the PRD’s
no-placeholder rule.

**Safe migration:** introduce canonical, operational destinations only when
they are complete; keep the workbench views contextually inside a selected run;
retain legacy/admin surfaces in a capability-aware advanced menu or command
menu. Every old URL must redirect or remain reachable until a tested retirement
proposal is approved.

## Data consistency audit

The visible dashboard mock data and deterministic agent-execution seed were
aligned around the Northstar Logistics customer renewal: Planner Agent, Memory
Retrieval, Salesforce CRM, NetSuite ERP, pricing/policy review, approval, and
SendGrid response.

Remaining scenario work before a final demo claim:

- Add a first-class Slack Notification event and Customer Email completion to
  the deterministic seed, matching the PRD’s canonical full workflow.
- Verify every explorer consumes the same execution identifiers and exact
  evidence, rather than independently fabricated presentation data.
- Add failure fixtures for CRM unavailable, Slack retry exhaustion, stale or
  rejected memory, and competing decisions.
- Ensure dashboard, replay, simulation, analytics, and coach metrics use the
  same named agents/tools and no unrelated sample tenants.

## Component and code-health audit

### Retain and consolidate

- Use `RunWorkbench` as the only composition boundary for run-level modules.
- Reuse shared card, badge, table, chart, JSON, media, loading, and error
  primitives; do not introduce a parallel Mission Control design system.
- Reuse the existing chart preparer/visualizer architecture and Recharts.
- Reuse existing query/cache, authorization, entitlement, audit, and redaction
  patterns.

### Deletion candidates, pending evidence and approval

- Duplicate visual-brand assets after every runtime consumer is migrated.
- Unreachable sidebar-only routes after a complete canonical route map,
  command-menu access check, import analysis, tests, and production build.
- Experimental/prototype visualizations only after feature parity and usage
  evidence are documented.
- Compatibility shims only after an SDK/API deprecation window and stored-data
  migration plan are complete.

No unused Prisma model, API, route, feature flag, component, queue contract, or
integration was deleted in this audit because no automated reachability or
production-usage evidence was collected and the governing tasks prohibit it.

## Files removed

None. Removing a route, schema, API, queue contract, feature flag, or
enterprise capability without a replacement and regression evidence conflicts
with the repository’s source-of-truth migration policy.

## Files refactored in this audit slice

| File                                               | Change                                                                                                                                                           |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web/src/components/layouts/routes.tsx`            | Reframed primary labels as Dashboard, Runs, and Execution Groups without changing the underlying routes.                                                         |
| `web/src/components/layouts/routes.clienttest.tsx` | Updated the navigation contract to cover the refined Mission Control terms.                                                                                      |
| `web/src/components/nav/AppSidebar/AppSidebar.tsx` | Removed stale public-vendor documentation/release links from the founder-facing sidebar while retaining local deployment status and background migration access. |
| `web/public/icon.svg`                              | Replaced the inherited visual mark with a new Mission Control control-room icon.                                                                                 |
| `TASKS.md`                                         | Marked the information-architecture refinement slice as in progress.                                                                                             |

## Tooling and security review

| Tool                | Status                   | Decision                                                                                                                 |
| ------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Graphify            | Not installed/configured | Do not install automatically. A project-local installation may be proposed if a multi-file impact graph is required.     |
| RTK                 | Installed (`0.42.4`)     | Available for safe compressed shell output; raw output was used where evidence matters.                                  |
| ECC                 | Not installed/configured | Do not install automatically.                                                                                            |
| Ponytail            | Not installed/configured | Manual simplicity challenge applied: no duplicate routes, no new dependencies, no fake top-level pages, no schema churn. |
| Vibe Security Skill | Not installed/configured | Do not install automatically. No auth/API/database mutation occurred in this audit.                                      |

The application remains security-sensitive in authentication/RBAC, tenant
scoping, API keys, OTLP and public ingestion, webhooks, MCP/tool execution,
storage signing, provider credentials, billing, and simulation/replay
isolation. Any change in these areas requires the project security-review
workflow and raw validation evidence.

## Production readiness checklist

### Verified by inspection

- [x] The repository is a pnpm/Turborepo TypeScript monorepo; Node 24 is the
      declared runtime.
- [x] Reusable authentication, tenant/RBAC, database, queue, storage, table,
      chart, timeline, graph, and replay layers exist.
- [x] The existing Mission Control workbench synchronizes Timeline, Brain,
      Memory, Decisions, Replay, and Simulation through shared run state.
- [x] The seed/dashboard narrative is substantially aligned to Northstar
      Logistics customer renewal.
- [x] No dependency was installed and no sensitive production surface changed
      during this audit.

### Required before production approval

- [ ] Complete the missing Tool Explorer, Execution Coach, and Analytics with
      real queries, authorization, empty/loading/error states, and test cover.
- [ ] Make every requested primary-nav destination functional or omit it until
      it is complete; do not ship dead links.
- [ ] Perform full founder-facing copy/brand migration across authenticated UI,
      emails, auth, metadata, public pages, documentation links, and assets.
- [ ] Run route reachability/import analysis before approving any deletion.
- [ ] Start PostgreSQL, ClickHouse, Redis, and object storage; migrate and seed
      the stack; run a browser walkthrough on desktop, tablet, and mobile.
- [ ] Run lint, typecheck, targeted tests, full tests, production build,
      client-bundle scan, end-to-end tests, and security scanners with recorded
      results.
- [ ] Verify no console or hydration errors with the full seeded workflow.
- [ ] Exercise RBAC, cross-tenant access denial, masking, approval, replay, and
      simulation isolation paths.

## Demo readiness checklist

- [x] A coherent five-minute path exists: Dashboard → Runs → Timeline → Agent
      Brain → Memory → Decisions → Replay → Simulation.
- [x] `DEMO_SCRIPT.md` records the current click path and talking points.
- [ ] Seed a live-looking selected run before presenting; deterministic dashboard
      counters alone are insufficient for a production claim.
- [ ] Use only implemented views in the demo. Tool Explorer, Coach, and
      Analytics are not demo-ready yet.
- [ ] Replace remaining visible external Langfuse help/changelog/roadmap,
      self-hosting, release, and brand references before external presentation.
- [ ] Verify the route flow in a real browser after infrastructure is available.

## Phased implementation and rollback

1. **Foundation and shell:** finish user-visible brand and navigation migration
   with capability-aware advanced access. Validate route compatibility and
   rollback by reverting isolated UI commits.
2. **Execution workbench:** complete Tool Explorer and deepen shared evidence
   projection. Validate redaction, selection/replay synchronization, and seed
   fixtures. Rollback by disabling only the canonical route/view.
3. **Improvement workflows:** build Coach, Analytics, and supported root-cause
   flows with auditable services, queues, RBAC, budgets, and approval. Rollback
   by feature flag/capability gating; never modify production executions.
4. **Contract retirement:** only after public-client inventory, deprecation,
   migrations, backfills, monitoring, rollback drills, and explicit approval.

## Future roadmap

1. Complete the Tool Explorer, Execution Coach, and Analytics milestones with
   production data, authorization, redaction, tests, and canonical routes.
2. Add the full Northstar Logistics scenario fixtures and run them through the
   same dashboard, workbench, replay, simulation, and quality-signal queries.
3. Finish the founder-facing branding sweep, then validate every desktop and
   mobile flow in a real browser.
4. Gather reachability and production-usage evidence before proposing isolated
   legacy-contract retirements.

## Remaining technical debt

- Product and implementation documents disagree with the requested destructive
  rewrite; `PROJECT_PRD.md` and `TASKS.md` remain the controlling additive
  migration policy.
- The package name, workspace names, schema names, public endpoints, legacy UI
  copy, and external links still include Langfuse terminology.
- Full-stack test infrastructure is not available in the checked environment:
  required database and service environment variables are absent.
- The checked environment runs Node 26 while the repository declares Node 24;
  the pinned pnpm 11.10.0 runtime, Corepack, and the local Vitest executable
  are unavailable. Production validation must run under the declared toolchain.
- Real-browser review is blocked until a running authenticated application and
  browser-control endpoint are available.
- No Graphify impact graph or automated dead-code/route reachability report has
  been generated; deletion remains unapproved.
- `PROJECT_PRD.md` marks several major capabilities TODO or IN PROGRESS; a final
  standalone-production claim would be inaccurate until those are complete.

## Immediate next safe slice

Refine the authenticated shell and primary navigation around completed
operational surfaces, while retaining all legacy capabilities behind an
advanced, capability-aware access path. The implementation must include route
tests and a real-browser review once infrastructure is available. It must not
delete a feature, schema, endpoint, or compatibility contract.
