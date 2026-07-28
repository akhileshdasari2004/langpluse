import type { DashboardDefinition } from "../server/services/DashboardService/types";

/**
 * The Langfuse-curated Home dashboard (projectId = null).
 *
 * The worker upserts it into Postgres at startup (see
 * worker/src/scripts/upsertLangfuseDashboards.ts) so it behaves like any other
 * Langfuse-maintained dashboard (listed, read-only, cloneable). The web Home
 * page fetches it by this well-known id and falls back to this constant when
 * the row does not exist yet (e.g. the worker has not run).
 *
 * All placements are "preset" placements: they render the existing Home card
 * components (registered by presetId in the web preset registry) with their
 * existing data fetches — no DashboardWidget rows, no query configuration.
 *
 * When changing the definition, bump `updatedAt` so the worker upsert
 * overwrites the existing row.
 */
export const LANGFUSE_HOME_DASHBOARD_ID = "langfuse-home-dashboard";

export const LEGACY_HOME_DASHBOARD_PRESET_IDS = [
  "home-traces",
  "home-model-costs",
  "home-scores-table",
  "home-traces-obs-time-series",
  "home-model-usage",
  "home-users",
  "home-chart-scores",
  "home-latency-table-traces",
  "home-latency-table-generations",
  "home-latency-table-observations",
  "home-generation-latency",
  "home-score-analytics",
] as const;

export const MISSION_CONTROL_DASHBOARD_PRESET_IDS = [
  "mission-control-active-agents",
  "mission-control-running-executions",
  "mission-control-successful-executions",
  "mission-control-failed-executions",
  "mission-control-average-latency",
  "mission-control-execution-quality",
  "mission-control-memory-accuracy",
  "mission-control-tool-success-rate",
  "mission-control-average-cost",
  "mission-control-recent-executions",
  "mission-control-system-health",
  "mission-control-top-failing-agents",
  "mission-control-top-used-tools",
  "mission-control-execution-trend",
  "mission-control-live-activity",
] as const;

// Legacy presets remain registered because curated cards can be copied into
// custom dashboards. The Mission Control definition below changes only the
// default landing dashboard; it does not invalidate saved dashboard layouts.
export const HOME_DASHBOARD_PRESET_IDS = [
  ...LEGACY_HOME_DASHBOARD_PRESET_IDS,
  ...MISSION_CONTROL_DASHBOARD_PRESET_IDS,
] as const;

export type HomeDashboardPresetId = (typeof HOME_DASHBOARD_PRESET_IDS)[number];

const placement = (
  presetId: HomeDashboardPresetId,
  x: number,
  y: number,
  x_size: number,
  y_size: number,
) => ({
  type: "preset" as const,
  // Placement ids only need to be unique within the dashboard, so the
  // presetId doubles as a stable, readable placement id.
  id: presetId,
  presetId,
  x,
  y,
  x_size,
  y_size,
});

export const LANGFUSE_HOME_DASHBOARD_DEFINITION: DashboardDefinition = {
  widgets: [
    // Compact operational metrics.
    placement("mission-control-active-agents", 0, 0, 3, 3),
    placement("mission-control-running-executions", 3, 0, 3, 3),
    placement("mission-control-successful-executions", 6, 0, 3, 3),
    placement("mission-control-failed-executions", 9, 0, 3, 3),
    placement("mission-control-average-latency", 0, 3, 3, 3),
    placement("mission-control-execution-quality", 3, 3, 3, 3),
    placement("mission-control-memory-accuracy", 6, 3, 3, 3),
    placement("mission-control-tool-success-rate", 9, 3, 3, 3),
    // Cost and the execution substrate.
    placement("mission-control-average-cost", 0, 6, 3, 3),
    placement("mission-control-system-health", 3, 6, 9, 3),
    // Live operational overview.
    placement("mission-control-execution-trend", 0, 9, 8, 7),
    placement("mission-control-live-activity", 8, 9, 4, 7),
    // Investigation queues.
    placement("mission-control-recent-executions", 0, 16, 8, 7),
    placement("mission-control-top-failing-agents", 8, 16, 4, 7),
    placement("mission-control-top-used-tools", 0, 23, 12, 6),
  ],
};

export const LANGFUSE_HOME_DASHBOARD = {
  id: LANGFUSE_HOME_DASHBOARD_ID,
  name: "Mission Control",
  description:
    "Enterprise AI agent execution health, quality, cost, and live operational activity.",
  definition: LANGFUSE_HOME_DASHBOARD_DEFINITION,
  filters: [],
  createdAt: "2026-07-06T00:00:00.000Z",
  updatedAt: "2026-07-28T00:00:00.000Z",
};
