import type {
  MissionControlDashboardSnapshot,
  MissionControlMetricId,
} from "@langfuse/shared";
import type { DataPoint } from "@/src/features/widgets/chart-library/chart-props";

export type MetricDefinition = {
  label: string;
  description: string;
  formula: string;
  window: "selected";
  nullBehavior: string;
  drilldown: "agents" | "runs";
  format: (value: number) => string;
  positiveTrend: "up" | "down";
};

const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const percent = (value: number) => `${value.toFixed(1)}%`;

export const MISSION_CONTROL_METRICS: Record<
  MissionControlMetricId,
  MetricDefinition
> = {
  activeAgents: {
    label: "Active Agents",
    description: "Agents with execution activity in the selected window",
    formula: "Distinct agent identities with at least one execution",
    window: "selected",
    nullBehavior: "Returns zero when no agent executed",
    drilldown: "agents",
    format: (value) => compactNumber.format(value),
    positiveTrend: "up",
  },
  runningExecutions: {
    label: "Running Executions",
    description: "Enterprise workflows currently in progress",
    formula: "Executions with RUNNING status at snapshot time",
    window: "selected",
    nullBehavior: "Returns zero when no execution is running",
    drilldown: "runs",
    format: (value) => compactNumber.format(value),
    positiveTrend: "up",
  },
  successfulExecutions: {
    label: "Successful Executions",
    description: "Completed executions in the selected window",
    formula: "Count of executions with SUCCEEDED status",
    window: "selected",
    nullBehavior: "Returns zero when no execution succeeded",
    drilldown: "runs",
    format: (value) => compactNumber.format(value),
    positiveTrend: "up",
  },
  failedExecutions: {
    label: "Failed Executions",
    description: "Executions ending in an unrecovered failure",
    formula: "Count of executions with FAILED status",
    window: "selected",
    nullBehavior: "Returns zero when no execution failed",
    drilldown: "runs",
    format: (value) => compactNumber.format(value),
    positiveTrend: "down",
  },
  averageLatency: {
    label: "Average Latency",
    description: "Mean end-to-end execution duration",
    formula: "Mean endedAt - startedAt for completed executions",
    window: "selected",
    nullBehavior: "Unavailable when there are no completed executions",
    drilldown: "runs",
    format: (value) => `${value.toFixed(2)}s`,
    positiveTrend: "down",
  },
  executionQuality: {
    label: "Execution Quality Score",
    description: "Mean normalized quality evaluation",
    formula: "Mean normalized quality score across evaluated executions",
    window: "selected",
    nullBehavior: "Unavailable when no quality score exists",
    drilldown: "runs",
    format: percent,
    positiveTrend: "up",
  },
  memoryRetrievalAccuracy: {
    label: "Memory Retrieval Accuracy",
    description: "Relevant memory retrievals across agent decisions",
    formula: "Relevant memory retrievals divided by judged retrievals",
    window: "selected",
    nullBehavior: "Unavailable when no retrieval was judged",
    drilldown: "runs",
    format: percent,
    positiveTrend: "up",
  },
  toolSuccessRate: {
    label: "Tool Success Rate",
    description: "Tool calls completed without terminal error",
    formula: "Successful tool calls divided by completed tool calls",
    window: "selected",
    nullBehavior: "Unavailable when no tool call completed",
    drilldown: "runs",
    format: percent,
    positiveTrend: "up",
  },
  averageCost: {
    label: "Average Cost Per Execution",
    description: "Mean model and tool cost per completed execution",
    formula: "Total attributed execution cost divided by completed executions",
    window: "selected",
    nullBehavior: "Unavailable when no execution completed",
    drilldown: "runs",
    format: (value) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      }).format(value),
    positiveTrend: "down",
  },
};

export function prepareExecutionTrend(
  snapshot: MissionControlDashboardSnapshot,
): DataPoint[] {
  return snapshot.executionTrend.flatMap((point) => [
    {
      time_dimension: point.timestamp.toISOString(),
      dimension: "Successful",
      metric: point.successful,
    },
    {
      time_dimension: point.timestamp.toISOString(),
      dimension: "Failed",
      metric: point.failed,
    },
    {
      time_dimension: point.timestamp.toISOString(),
      dimension: "Running",
      metric: point.running,
    },
  ]);
}

export function prepareToolUsage(
  snapshot: MissionControlDashboardSnapshot,
): DataPoint[] {
  return snapshot.topUsedTools.map((tool) => ({
    time_dimension: undefined,
    dimension: tool.name,
    metric: tool.calls,
  }));
}
