# Mission Control Migration Changelog

## Status and decision policy

Mission Control is being engineered as an agent operating console. The inherited
repository is a bootstrap, not the target product. This ledger records the
current classification and retirement condition for every subsystem family.
`PROJECT_PRD.md` remains authoritative; a deletion occurs only after a
production-complete replacement, contract migration, and validation evidence.

## 2026-07-30 — Milestone 0: architecture inventory

| Subsystem family                                                    | Classification | Engineering decision                                                                                                 |
| ------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------- |
| `web/` application shell, `web/src/components/ui`, theming, layouts | KEEP           | Generic Next.js, accessibility, overlay, and design-system infrastructure.                                           |
| Authentication, RBAC, SSO/SCIM, tenancy, projects, organizations    | KEEP           | Required enterprise security/control plane; present it as Mission Control administration.                            |
| Tables, filters, search, charts, widgets, virtualisation            | KEEP           | Reusable data-exploration infrastructure.                                                                            |
| `agent-executions`, run workbench, timeline, replay, graph adapters | REFACTOR       | Core Mission Control execution model; replace trace-centric presentation with run/task/step concepts.                |
| `mission-control-dashboard`, dashboard presets                      | REFACTOR       | Retain chart infrastructure; make execution health and agent operations the default domain.                          |
| `execution-simulation`                                              | REFACTOR       | Retain isolation/queue patterns; keep all scenario and evidence contracts Mission Control-specific.                  |
| Tool Explorer, Execution Coach, Analytics                           | REWRITE        | Required PRD products are incomplete; build complete Mission Control flows rather than shallow aliases.              |
| Legacy traces, observations, events, sessions                       | REPLACE        | Preserve ingestion/storage during migration; replace user workflows with Runs and execution evidence.                |
| Prompts, playground, datasets, experiments, evaluations, scores     | REPLACE        | Retain only reusable fixture/quality infrastructure behind Mission Control Coach, Simulation, and quality signals.   |
| Monitors, automations, notifications, web callouts                  | REFACTOR       | Recast as incidents, operational policies, and remediation workflows.                                                |
| In-app agent, MCP, LLM tools, model configuration                   | REFACTOR       | Retain secure tool/runtime primitives; expose only where they support agent operation.                               |
| Billing, entitlements, audit logs, retention, exports               | KEEP           | Enterprise platform infrastructure; not primary operator navigation.                                                 |
| Public API, SDK, OTLP, Fern contracts                               | REPLACE        | Introduce versioned Mission Control API contracts; retain compatibility only through documented deprecation windows. |
| Prisma control plane, ClickHouse, Redis/BullMQ, object storage      | KEEP           | Reusable durable infrastructure; introduce Mission Control domain entities incrementally.                            |
| `chart-view-prototype`, duplicate visual experiments                | DELETE         | Candidate only after import/reachability and replacement-parity evidence.                                            |
| Langfuse-only brand assets, copy, docs, public marketing            | REWRITE        | Replace founder-facing identity with Mission Control; retain provenance and license notices where required.          |
| Generated clients and build output                                  | KEEP           | Generated infrastructure; never hand edit.                                                                           |

## Route classification

| Route family                                                                | Classification | Target                                                                      |
| --------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------- |
| `/project/[projectId]`, `/runs`, `/agents`                                  | REFACTOR       | Dashboard, Live Agents, and Runs.                                           |
| Run workbench views                                                         | REFACTOR       | Timeline, Agent Brain, Memory, Tool, Decision, Replay, Simulation, Coach.   |
| `/traces`, `/observations`, `/sessions`                                     | REPLACE        | Advanced compatibility views until canonical Run routes cover the workflow. |
| `/prompts`, `/playground`, `/datasets`, `/experiments`, `/evals`, `/scores` | REPLACE        | Supporting engineering workflows, not primary product navigation.           |
| `/monitors`, `/automations`                                                 | REFACTOR       | Incident and policy operations.                                             |
| `/settings`, account, organization, auth                                    | KEEP           | Administrative and security workflows.                                      |

## Required evidence before deletion

1. Route/API/schema/queue references are inventoried with automated reachability
   evidence.
2. Replacement behavior has unit, integration, browser, authorization, and
   migration coverage.
3. Public clients have a versioned deprecation and rollback path.
4. Seeded Northstar Logistics workflow passes through the Mission Control flow.
5. The change is documented here with an owner, validation evidence, and
   rollback instruction.

## Remaining migration work

- Reconcile every product document, route label, auth page, email, asset, and
  metadata string to Mission Control.
- Complete Tool Explorer, Execution Coach, Analytics, Root Cause, Workflow
  Graph, and Multi-Agent Graph as PRD-first modules.
- Publish Mission Control API/domain contracts, then retire inherited public
  contracts through a versioned migration.
- Produce machine-readable route, component, API, schema, service, hook, and
  utility inventories before individual deletion commits.
