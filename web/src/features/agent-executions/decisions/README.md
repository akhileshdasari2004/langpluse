# Decision Explorer

## Surface

Decision Explorer owns the run-workbench decision tree and alternative-path
comparison for explicit AI-agent decision evidence.

## Entry points

- `DecisionExplorer.tsx` is mounted by `../components/RunWorkbench.tsx`.
- `packages/shared/src/features/agent-executions/decisions.ts` owns the
  client-safe immutable decision projection and instrumentation contract.

## Structure

- `model.ts` owns pure filters and shared risk presentation.
- `DecisionTree.tsx` adapts explicit options to React Flow and reuses the
  existing ELK layout safety budget.
- `DecisionInspector.tsx` owns selected-decision evidence and the side-by-side
  alternative-path comparison.

## State ownership

- Immutable run and live stream data stay in the projection context and scoped
  live-run Zustand store.
- Selected decision, selected alternative, branch, and risk are URL state.
- Search stays local so enterprise decision text is not persisted in URLs or
  analytics.
- ELK layout is an imperative third-party integration with cancellation; no
  query data is mirrored into local state.

## Security and performance boundaries

- The explorer derives only from the existing project-authorized projection;
  no new API, database query, external request, or mutable server state exists.
- Rationale, rejected paths, and risk are displayed only when instrumented.
  Missing evidence is never replaced with inferred private chain-of-thought.
- React Flow uses the shared bounded layout and visible-element rendering.
  Oversized decision trees fall back to the accessible decision list.
