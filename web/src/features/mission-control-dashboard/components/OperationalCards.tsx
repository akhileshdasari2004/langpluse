import type {
  MissionControlDashboardSnapshot,
  MissionControlExecutionStatus,
} from "@langfuse/shared";
import { formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, CircleAlert, Clock3 } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import {
  MissionControlCard,
  SeededDataBadge,
} from "./MissionControlCard";
import { cn } from "@/src/utils/tailwind";

const statusVariant: Record<
  MissionControlExecutionStatus,
  "success" | "error" | "warning"
> = {
  SUCCEEDED: "success",
  FAILED: "error",
  RUNNING: "warning",
};

export function RecentExecutionsCard(props: {
  projectId: string;
  snapshot?: MissionControlDashboardSnapshot;
  isLoading: boolean;
  isError: boolean;
  className?: string;
}) {
  return (
    <MissionControlCard
      title="Recent Enterprise Executions"
      description="Latest production runs across the seeded sales-email workflow"
      isLoading={props.isLoading}
      isError={props.isError}
      className={props.className}
      contentClassName="overflow-auto p-0"
      action={
        <Link
          href={`/project/${props.projectId}/runs`}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
        >
          All runs <ArrowUpRight className="h-3 w-3" />
        </Link>
      }
    >
      {props.snapshot ? (
        <div className="min-w-[660px]">
          <div className="text-muted-foreground grid grid-cols-[1.45fr_1.1fr_.7fr_.65fr_.55fr] gap-3 border-b px-4 py-2 text-[10px] font-bold tracking-wider uppercase">
            <span>Execution</span>
            <span>Agent</span>
            <span>Status</span>
            <span>Latency</span>
            <span className="text-right">Cost</span>
          </div>
          {props.snapshot.recentExecutions.map((execution) => (
            <div
              key={execution.id}
              className="grid grid-cols-[1.45fr_1.1fr_.7fr_.65fr_.55fr] items-center gap-3 border-b px-4 py-3 text-xs last:border-b-0 hover:bg-muted/35"
            >
              <div className="min-w-0">
                <div className="truncate" title={execution.account}>
                  {execution.account}
                </div>
                <div
                  className="text-muted-foreground truncate"
                  title={execution.workflow}
                >
                  {execution.workflow}
                </div>
              </div>
              <span className="truncate" title={execution.agent}>
                {execution.agent}
              </span>
              <Badge
                variant={statusVariant[execution.status]}
                size="sm"
                className="w-fit"
              >
                {execution.status.toLowerCase()}
              </Badge>
              <span className="tabular-nums">
                {execution.latencySeconds === null
                  ? "In progress"
                  : `${execution.latencySeconds.toFixed(2)}s`}
              </span>
              <span className="text-right tabular-nums">
                ${execution.costUsd.toFixed(3)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </MissionControlCard>
  );
}

export function SystemHealthCard(props: {
  snapshot?: MissionControlDashboardSnapshot;
  isLoading: boolean;
  isError: boolean;
  className?: string;
}) {
  const allOperational = props.snapshot?.systemHealth.every(
    (service) => service.status === "OPERATIONAL",
  );
  return (
    <MissionControlCard
      title="System Health"
      description="Availability and response time of execution dependencies"
      isLoading={props.isLoading}
      isError={props.isError}
      className={props.className}
      live
      action={
        props.snapshot ? (
          <Badge variant={allOperational ? "success" : "warning"} size="sm">
            {allOperational ? "All systems operational" : "Degraded service"}
          </Badge>
        ) : null
      }
    >
      {props.snapshot ? (
        <div className="grid h-full gap-3 md:grid-cols-2">
          {props.snapshot.systemHealth.map((service) => (
            <div
              key={service.id}
              className="flex items-center justify-between rounded-md border bg-muted/20 p-3"
            >
              <div>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      service.status === "OPERATIONAL"
                        ? "bg-green-500"
                        : service.status === "DEGRADED"
                          ? "bg-amber-500"
                          : "bg-red-500",
                    )}
                  />
                  {service.name}
                </div>
                <div className="text-muted-foreground mt-1 text-[11px]">
                  {service.availability}% availability
                </div>
              </div>
              <div className="text-xs font-bold tabular-nums">
                {service.latencyMs}ms
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </MissionControlCard>
  );
}

export function TopFailingAgentsCard(props: {
  snapshot?: MissionControlDashboardSnapshot;
  isLoading: boolean;
  isError: boolean;
  className?: string;
}) {
  return (
    <MissionControlCard
      title="Top Failing Agents"
      description="Agents ranked by unrecovered execution failures"
      isLoading={props.isLoading}
      isError={props.isError}
      className={props.className}
      action={<SeededDataBadge />}
    >
      {props.snapshot ? (
        <div className="space-y-4">
          {props.snapshot.topFailingAgents.map((agent, index) => (
            <div key={agent.name} className="flex items-center gap-3">
              <span className="text-muted-foreground w-4 text-xs tabular-nums">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-3 text-xs">
                  <span className="truncate" title={agent.name}>
                    {agent.name}
                  </span>
                  <span className="font-bold tabular-nums">
                    {agent.failures}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-red-500/80 transition-[width] duration-700 motion-reduce:transition-none"
                    style={{
                      width: `${Math.min(100, agent.failureRate * 15)}%`,
                    }}
                  />
                </div>
                <div className="text-muted-foreground mt-1 flex justify-between text-[10px]">
                  <span>{agent.team}</span>
                  <span>{agent.failureRate.toFixed(1)}% failure rate</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </MissionControlCard>
  );
}

const activityIcon = {
  SUCCESS: CheckCircle2,
  INFO: Clock3,
  WARNING: CircleAlert,
  ERROR: CircleAlert,
} as const;

export function LiveActivityCard(props: {
  snapshot?: MissionControlDashboardSnapshot;
  isLoading: boolean;
  isError: boolean;
  className?: string;
}) {
  return (
    <MissionControlCard
      title="Live Activity Feed"
      description="Current orchestration, memory, tool, and approval events"
      isLoading={props.isLoading}
      isError={props.isError}
      className={props.className}
      live
    >
      {props.snapshot ? (
        <div className="space-y-1">
          {props.snapshot.activity.map((activity) => {
            const Icon = activityIcon[activity.status];
            return (
              <div
                key={activity.id}
                className="group flex gap-3 rounded-md p-2 transition-colors hover:bg-muted/45"
              >
                <div className="relative pt-0.5">
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      activity.status === "ERROR"
                        ? "text-red-500"
                        : activity.status === "WARNING"
                          ? "text-amber-500"
                          : activity.status === "SUCCESS"
                            ? "text-green-500"
                            : "text-blue-500",
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs leading-relaxed">
                    {activity.summary}
                  </div>
                  <div className="text-muted-foreground mt-0.5 flex items-center justify-between gap-2 text-[10px]">
                    <span className="truncate" title={activity.agent}>
                      {activity.agent}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {formatDistanceToNowStrict(activity.occurredAt, {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </MissionControlCard>
  );
}
