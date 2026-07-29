# Memory Explorer

## Surface

Memory Explorer owns the run-workbench inventory, timeline, relationship view,
and evidence inspector for retrieved and rejected agent memories.

## Entry points

- `MemoryExplorer.tsx` is mounted by `../components/RunWorkbench.tsx`.
- `packages/shared/src/features/agent-executions/memory.ts` owns the
  client-safe immutable evidence projection.

## Structure

- `model.ts` contains pure filtering, sorting, and freshness preparation.
- `MemoryTable.tsx` owns fixed-row virtualization only.
- `MemoryTimeline.tsx` and `MemoryRelationships.tsx` are view-only
  visualizations.
- `MemoryDetail.tsx` reuses the existing observation I/O query and JSON viewer
  for deferred raw payload inspection.
- `MemorySummaryCards.tsx` and `MemoryRelevanceBadge.tsx` are feature-local
  reusable presentation.

## External consumers

Only the Mission Control run workbench mounts this feature. Components are not
exported through shared UI barrels.

## State ownership

- Immutable run and live stream data stay in the existing projection context
  and scoped live-run Zustand store.
- Selected memory, status, freshness, and view are URL state.
- Search and source text stay local so customer content is not persisted in
  URLs or analytics.
- Filtering and sorting are pure derived data; no effect mirrors query or
  route state.
- Raw observation payloads remain TanStack Query state through
  `useParsedObservation`.

## Performance and security boundaries

- The inventory virtualizes fixed-height rows and the shared stream bounds the
  run at 5,000 events.
- Large raw input/output is fetched only for the selected memory and parsed by
  the existing worker-backed observation hook.
- No memory content is emitted to PostHog, written to local storage, or copied
  into route filters.
- Existing project authorization, ingestion masking, media policy, and trace
  retention apply to raw evidence.

## Migration state

The feature derives memories from explicit instrumentation and presents legacy
retrieval events without inventing missing content. A future server-side
pagination API is only warranted if production traces exceed the current
bounded run projection or require independent memory-only retention.
