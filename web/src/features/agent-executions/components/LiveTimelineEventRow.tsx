import type { AgentExecutionEvent } from "@langfuse/shared";
import type { Ref } from "react";
import {
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  CircleX,
  Database,
  Flag,
  GitBranch,
  Hand,
  ListRestart,
  MessageSquareWarning,
  RefreshCcw,
  Route,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Badge, type BadgeProps } from "@/src/components/ui/badge";
import { JSONView } from "@/src/components/ui/CodeJsonViewer";
import { cn } from "@/src/utils/tailwind";
import { formatIntervalSeconds } from "@/src/utils/dates";

const categoryPresentation: Record<
  AgentExecutionEvent["category"],
  {
    icon: typeof CircleDot;
    label: string;
    className: string;
  }
> = {
  TASK_RECEIVED: {
    icon: Flag,
    label: "Task",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  PLANNING: {
    icon: Route,
    label: "Planning",
    className: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  TOOL_CALL: {
    icon: Wrench,
    label: "Tool",
    className: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  },
  MEMORY_RETRIEVAL: {
    icon: Database,
    label: "Memory",
    className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  },
  REASONING: {
    icon: BrainCircuit,
    label: "Reasoning",
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  DECISION: {
    icon: GitBranch,
    label: "Decision",
    className: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
  },
  APPROVAL: {
    icon: Hand,
    label: "Approval",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  RETRY: {
    icon: RefreshCcw,
    label: "Retry",
    className: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  },
  FAILURE: {
    icon: MessageSquareWarning,
    label: "Error",
    className: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  COMPLETION: {
    icon: Check,
    label: "Complete",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  HANDOFF: {
    icon: ListRestart,
    label: "Handoff",
    className: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  },
  OBSERVATION: {
    icon: Sparkles,
    label: "Event",
    className: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  },
  UNKNOWN: {
    icon: CircleDot,
    label: "Event",
    className: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  },
};

const statusPresentation: Record<
  AgentExecutionEvent["status"],
  {
    label: string;
    variant: BadgeProps["variant"];
    icon: typeof CircleDot;
  }
> = {
  RUNNING: { label: "Running", variant: "warning", icon: CircleDot },
  COMPLETED: { label: "Completed", variant: "success", icon: CheckCircle2 },
  FAILED: { label: "Failed", variant: "error", icon: CircleX },
  WAITING_APPROVAL: {
    label: "Awaiting approval",
    variant: "warning",
    icon: Hand,
  },
};

function formatTimestamp(timestamp: Date) {
  return `${timestamp.toISOString().slice(11, 23)} UTC`;
}

function formatDuration(event: AgentExecutionEvent) {
  return event.latencySeconds === null
    ? "In progress"
    : formatIntervalSeconds(event.latencySeconds, 3);
}

export function LiveTimelineEventRow({
  event,
  expanded,
  onToggle,
  measureRef,
  virtualIndex,
}: {
  event: AgentExecutionEvent;
  expanded: boolean;
  onToggle: () => void;
  measureRef: Ref<HTMLDivElement>;
  virtualIndex: number;
}) {
  const category = categoryPresentation[event.category];
  const status = statusPresentation[event.status];
  const CategoryIcon = category.icon;
  const StatusIcon = status.icon;

  return (
    <div
      ref={measureRef}
      data-index={virtualIndex}
      className="group relative px-3 pb-2 sm:px-5"
    >
      <div
        className={cn(
          "bg-border absolute top-0 bottom-0 left-[31px] w-px sm:left-[39px]",
          virtualIndex === 0 && "top-6",
        )}
        aria-hidden="true"
      />
      <div
        className={cn(
          "ring-background absolute top-5 left-[24px] z-10 flex size-4 items-center justify-center rounded-full ring-4 sm:left-[32px]",
          category.className,
        )}
        aria-hidden="true"
      >
        <CategoryIcon className="size-2.5" />
      </div>
      <article
        className={cn(
          "bg-card relative ml-10 overflow-hidden rounded-lg border shadow-xs transition-all duration-300",
          "hover:border-border-contrast hover:-translate-y-px hover:shadow-md",
          expanded && "border-border-contrast shadow-md",
        )}
      >
        <button
          type="button"
          className="focus-visible:ring-ring flex w-full flex-col gap-3 p-3 text-left outline-hidden transition-colors focus-visible:ring-2 sm:p-4"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={`event-metadata-${event.id}`}
        >
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={cn(
                "mt-0.5 hidden size-8 shrink-0 items-center justify-center rounded-md sm:flex",
                category.className,
              )}
            >
              <CategoryIcon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className="truncate text-sm font-bold" title={event.name}>
                  {event.name}
                </h3>
                <Badge variant="outline" className={category.className}>
                  {category.label}
                </Badge>
                <Badge variant={status.variant} className="gap-1">
                  <StatusIcon
                    className={cn(
                      "size-3",
                      event.status === "RUNNING" && "animate-pulse",
                    )}
                  />
                  {status.label}
                </Badge>
              </div>
              {event.reasoningSummary && (
                <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed sm:text-sm">
                  {event.reasoningSummary}
                </p>
              )}
              {event.statusMessage && (
                <p className="mt-1 line-clamp-2 text-xs text-red-600 dark:text-red-400">
                  {event.statusMessage}
                </p>
              )}
            </div>
            <ChevronDown
              className={cn(
                "text-muted-foreground mt-1 size-4 shrink-0 transition-transform duration-300",
                expanded && "rotate-180",
              )}
            />
          </div>

          <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
            <time dateTime={event.startedAt.toISOString()}>
              {formatTimestamp(event.startedAt)}
            </time>
            <span>{formatDuration(event)}</span>
            <span>{Math.round(event.confidence * 100)}% confidence</span>
            {event.apiLatencyMs !== null && (
              <span>{Math.round(event.apiLatencyMs)} ms API</span>
            )}
            {event.toolUsed && (
              <span
                className="text-foreground max-w-72 truncate"
                title={event.toolUsed}
              >
                {event.toolUsed}
              </span>
            )}
          </div>
        </button>

        {expanded && (
          <div
            id={`event-metadata-${event.id}`}
            className="animate-in fade-in slide-in-from-top-1 overflow-hidden border-t duration-300"
          >
            <div className="p-3 sm:p-4">
              <JSONView
                title="Event metadata"
                json={{
                  eventId: event.id,
                  parentEventId: event.parentEventId,
                  observationType: event.observationType,
                  level: event.level,
                  agent: event.agent,
                  metadata: event.metadata,
                }}
                collapseStringsAfterLength={300}
              />
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
