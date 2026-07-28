import type {
  MissionControlMetric,
  MissionControlMetricId,
} from "@langfuse/shared";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bot,
  BrainCircuit,
  CheckCircle2,
  CircleDollarSign,
  CircleX,
  Gauge,
  Timer,
  Wrench,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { MissionControlCard } from "./MissionControlCard";
import { MISSION_CONTROL_METRICS } from "../lib/dashboard-model";
import { cn } from "@/src/utils/tailwind";

const icons: Record<MissionControlMetricId, LucideIcon> = {
  activeAgents: Bot,
  runningExecutions: Activity,
  successfulExecutions: CheckCircle2,
  failedExecutions: CircleX,
  averageLatency: Timer,
  executionQuality: Gauge,
  memoryRetrievalAccuracy: BrainCircuit,
  toolSuccessRate: Wrench,
  averageCost: CircleDollarSign,
};

export function MetricCard(props: {
  metricId: MissionControlMetricId;
  metric?: MissionControlMetric;
  projectId: string;
  isLoading: boolean;
  isError: boolean;
  className?: string;
}) {
  const definition = MISSION_CONTROL_METRICS[props.metricId];
  const Icon = icons[props.metricId];
  const delta = props.metric
    ? props.metric.value - props.metric.previousValue
    : 0;
  const trendIsPositive =
    props.metric?.trend === "steady" ||
    props.metric?.trend === definition.positiveTrend;

  return (
    <MissionControlCard
      title={definition.label}
      description={definition.description}
      isLoading={props.isLoading}
      isError={props.isError}
      className={props.className}
      action={
        <Link
          href={`/project/${props.projectId}/${definition.drilldown}`}
          className="rounded-md border bg-background/80 p-1.5 shadow-xs transition-colors hover:bg-muted"
          title={`${definition.formula}. ${definition.nullBehavior}. Open ${definition.drilldown}.`}
        >
          <Icon className="text-muted-foreground h-4 w-4" />
          <ArrowUpRight className="sr-only h-3 w-3" />
          <span className="sr-only">Open {definition.drilldown}</span>
        </Link>
      }
    >
      {props.metric ? (
        <div className="flex h-full flex-col justify-end gap-3">
          <div className="text-3xl font-bold tracking-tight tabular-nums">
            {definition.format(props.metric.value)}
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span
              className={cn(
                "font-bold tabular-nums",
                trendIsPositive ? "text-dark-green" : "text-dark-red",
              )}
            >
              {delta === 0 ? "Stable" : `${delta > 0 ? "+" : ""}${delta.toFixed(Math.abs(delta) < 1 ? 2 : 0)}`}
            </span>
            <span className="text-muted-foreground">vs previous window</span>
          </div>
        </div>
      ) : null}
    </MissionControlCard>
  );
}
