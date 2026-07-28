import type { MissionControlDashboardSnapshot } from "@langfuse/shared";
import { Chart } from "@/src/features/widgets/chart-library/Chart";
import {
  prepareExecutionTrend,
  prepareToolUsage,
} from "../lib/dashboard-model";
import {
  MissionControlCard,
  SeededDataBadge,
} from "./MissionControlCard";

const executionChartConfig = {
  Successful: { label: "Successful", color: "hsl(var(--chart-2))" },
  Failed: { label: "Failed", color: "hsl(var(--chart-5))" },
  Running: { label: "Running", color: "hsl(var(--chart-1))" },
};

export function ExecutionTrendCard(props: {
  snapshot?: MissionControlDashboardSnapshot;
  isLoading: boolean;
  isError: boolean;
  syncId: string;
  className?: string;
}) {
  return (
    <MissionControlCard
      title="Execution Trend (24h)"
      description="Hourly throughput split by execution outcome"
      isLoading={props.isLoading}
      isError={props.isError}
      className={props.className}
      contentClassName="min-h-64 p-3"
      live
      action={<SeededDataBadge />}
    >
      {props.snapshot ? (
        <Chart
          chartType="AREA_TIME_SERIES"
          data={prepareExecutionTrend(props.snapshot)}
          rowLimit={100}
          config={executionChartConfig}
          chartConfig={{
            type: "AREA_TIME_SERIES",
            subtle_fill: true,
          }}
          legendPosition="below"
          legendSummary="sum"
          missingValue="zero"
          syncId={props.syncId}
        />
      ) : null}
    </MissionControlCard>
  );
}

export function TopUsedToolsCard(props: {
  snapshot?: MissionControlDashboardSnapshot;
  isLoading: boolean;
  isError: boolean;
  className?: string;
}) {
  return (
    <MissionControlCard
      title="Top Used Tools"
      description="Calls made by the enterprise sales-email workflow"
      isLoading={props.isLoading}
      isError={props.isError}
      className={props.className}
      contentClassName="min-h-56 p-3"
      action={<SeededDataBadge />}
    >
      {props.snapshot ? (
        <Chart
          chartType="HORIZONTAL_BAR"
          data={prepareToolUsage(props.snapshot)}
          rowLimit={5}
          chartConfig={{
            type: "HORIZONTAL_BAR",
            show_value_labels: true,
            subtle_fill: true,
          }}
        />
      ) : null}
    </MissionControlCard>
  );
}
