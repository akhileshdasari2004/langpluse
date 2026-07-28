import type { MissionControlMetricId } from "@langfuse/shared";
import type { PresetWidgetContext } from "@/src/features/dashboard/components/home-preset-registry";
import { useMissionControlDashboard } from "../hooks/useMissionControlDashboard";
import { MetricCard } from "./MetricCard";
import {
  ExecutionTrendCard,
  TopUsedToolsCard,
} from "./ExecutionCharts";
import {
  LiveActivityCard,
  RecentExecutionsCard,
  SystemHealthCard,
  TopFailingAgentsCard,
} from "./OperationalCards";

export type MissionControlPresetKind =
  | MissionControlMetricId
  | "recentExecutions"
  | "systemHealth"
  | "topFailingAgents"
  | "topUsedTools"
  | "executionTrend"
  | "liveActivity";

const metricKinds = new Set<MissionControlPresetKind>([
  "activeAgents",
  "runningExecutions",
  "successfulExecutions",
  "failedExecutions",
  "averageLatency",
  "executionQuality",
  "memoryRetrievalAccuracy",
  "toolSuccessRate",
  "averageCost",
]);

export function MissionControlPreset(props: {
  kind: MissionControlPresetKind;
  context: PresetWidgetContext;
}) {
  const dashboard = useMissionControlDashboard({
    projectId: props.context.projectId,
    from: props.context.fromTimestamp,
    to: props.context.toTimestamp,
  });
  const common = {
    snapshot: dashboard.data,
    isLoading: dashboard.isPending,
    isError: dashboard.isError,
    className: props.context.className,
  };

  if (metricKinds.has(props.kind)) {
    const metricId = props.kind as MissionControlMetricId;
    return (
      <MetricCard
        metricId={metricId}
        metric={dashboard.data?.metrics[metricId]}
        isLoading={dashboard.isPending}
        isError={dashboard.isError}
        className={props.context.className}
      />
    );
  }

  switch (props.kind) {
    case "recentExecutions":
      return (
        <RecentExecutionsCard
          {...common}
          projectId={props.context.projectId}
        />
      );
    case "systemHealth":
      return <SystemHealthCard {...common} />;
    case "topFailingAgents":
      return <TopFailingAgentsCard {...common} />;
    case "topUsedTools":
      return <TopUsedToolsCard {...common} />;
    case "executionTrend":
      return <ExecutionTrendCard {...common} syncId={props.context.syncId} />;
    case "liveActivity":
      return <LiveActivityCard {...common} />;
  }
}
