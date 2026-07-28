import type {
  MissionControlDashboardSnapshot,
  MissionControlMetricId,
} from "@langfuse/shared";
import type { DataPoint } from "@/src/features/widgets/chart-library/chart-props";

export type MetricDefinition = {
  label: string;
  description: string;
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
    format: (value) => compactNumber.format(value),
    positiveTrend: "up",
  },
  runningExecutions: {
    label: "Running Executions",
    description: "Enterprise workflows currently in progress",
    format: (value) => compactNumber.format(value),
    positiveTrend: "up",
  },
  successfulExecutions: {
    label: "Successful Executions",
    description: "Completed executions in the selected window",
    format: (value) => compactNumber.format(value),
    positiveTrend: "up",
  },
  failedExecutions: {
    label: "Failed Executions",
    description: "Executions ending in an unrecovered failure",
    format: (value) => compactNumber.format(value),
    positiveTrend: "down",
  },
  averageLatency: {
    label: "Average Latency",
    description: "Mean end-to-end execution duration",
    format: (value) => `${value.toFixed(2)}s`,
    positiveTrend: "down",
  },
  executionQuality: {
    label: "Execution Quality Score",
    description: "Mean normalized quality evaluation",
    format: percent,
    positiveTrend: "up",
  },
  memoryRetrievalAccuracy: {
    label: "Memory Retrieval Accuracy",
    description: "Relevant memory retrievals across agent decisions",
    format: percent,
    positiveTrend: "up",
  },
  toolSuccessRate: {
    label: "Tool Success Rate",
    description: "Tool calls completed without terminal error",
    format: percent,
    positiveTrend: "up",
  },
  averageCost: {
    label: "Average Cost Per Execution",
    description: "Mean model and tool cost per completed execution",
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
    time_dimension: tool.name,
    dimension: tool.name,
    metric: tool.calls,
  }));
}
