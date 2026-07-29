import { useLayoutEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Activity,
  ArrowDown,
  Clock3,
  Gauge,
  Radio,
  Search,
  Server,
  Sparkles,
} from "lucide-react";
import type { AgentExecutionEvent } from "@langfuse/shared";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Skeleton } from "@/src/components/ui/skeleton";
import { cn } from "@/src/utils/tailwind";
import { formatIntervalSeconds } from "@/src/utils/dates";
import { useRunProjection } from "./RunProjectionContext";
import { LiveTimelineEventRow } from "./LiveTimelineEventRow";
import { useLiveRunStore } from "../live/LiveRunStoreProvider";
import {
  filterSemanticTimelineEvents,
  getAvailableTimelineCategories,
} from "../live/semanticTimelineRows";
import type { LiveRunConnectionState } from "../live/liveRunStore";

const statusOptions: Array<AgentExecutionEvent["status"]> = [
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "WAITING_APPROVAL",
];

const connectionPresentation: Record<
  LiveRunConnectionState,
  { label: string; className: string }
> = {
  CONNECTING: {
    label: "Connecting",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  },
  LIVE: {
    label: "Live",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  },
  RECONNECTING: {
    label: "Reconnecting",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  },
  COMPLETE: {
    label: "Complete",
    className: "border-blue-500/30 bg-blue-500/10 text-blue-700",
  },
  ERROR: {
    label: "Stream unavailable",
    className: "border-red-500/30 bg-red-500/10 text-red-700",
  },
};

function enumLabel(value: string) {
  return value
    .split("_")
    .map((word) => word[0] + word.slice(1).toLocaleLowerCase())
    .join(" ");
}

function ConsoleMetric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Activity;
}) {
  return (
    <div className="bg-card group min-w-0 rounded-lg border p-3 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <Icon className="size-3.5 transition-transform duration-300 group-hover:scale-110" />
        <span className="truncate" title={label}>
          {label}
        </span>
      </div>
      <p
        className="mt-2 truncate text-xl font-bold tracking-tight"
        title={value}
      >
        {value}
      </p>
      <p
        className="text-muted-foreground mt-0.5 truncate text-[11px]"
        title={detail}
      >
        {detail}
      </p>
    </div>
  );
}

export function LiveExecutionConsole() {
  const projection = useRunProjection();
  const scrollRef = useRef<HTMLDivElement>(null);
  const buffer = useLiveRunStore((state) => state.buffer);
  const connectionState = useLiveRunStore((state) => state.connectionState);
  const search = useLiveRunStore((state) => state.search);
  const categoryFilter = useLiveRunStore((state) => state.categoryFilter);
  const statusFilter = useLiveRunStore((state) => state.statusFilter);
  const expandedEventIds = useLiveRunStore((state) => state.expandedEventIds);
  const autoFollow = useLiveRunStore((state) => state.autoFollow);
  const unreadCount = useLiveRunStore((state) => state.unreadCount);
  const streamError = useLiveRunStore((state) => state.streamError);
  const actions = useLiveRunStore((state) => state.actions);
  const isSeededDemo = projection.events.some(
    (event) => event.metadata.scenario === "sales-email-agent",
  );

  const categories = useMemo(
    () => getAvailableTimelineCategories(buffer.events),
    [buffer.events],
  );
  const filteredEvents = useMemo(
    () =>
      filterSemanticTimelineEvents(buffer.events, {
        search,
        category: categoryFilter,
        status: statusFilter,
      }),
    [buffer.events, categoryFilter, search, statusFilter],
  );
  const virtualizer = useVirtualizer({
    count: filteredEvents.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 116,
    overscan: 8,
  });

  useLayoutEffect(() => {
    if (autoFollow && filteredEvents.length > 0) {
      virtualizer.scrollToIndex(filteredEvents.length - 1, {
        align: "end",
      });
    }
  }, [autoFollow, filteredEvents.length, virtualizer]);

  const completedEvents = buffer.events.filter(
    (event) => event.status === "COMPLETED",
  ).length;
  const averageConfidence =
    buffer.events.length > 0
      ? buffer.events.reduce((sum, event) => sum + event.confidence, 0) /
        buffer.events.length
      : 0;
  const apiEvents = buffer.events.filter(
    (event) => event.apiLatencyMs !== null,
  );
  const averageApiLatency =
    apiEvents.length > 0
      ? apiEvents.reduce((sum, event) => sum + (event.apiLatencyMs ?? 0), 0) /
        apiEvents.length
      : 0;
  const elapsedSeconds =
    ((buffer.endedAt ?? buffer.events.at(-1)?.endedAt ?? new Date()).getTime() -
      projection.startedAt.getTime()) /
    1_000;
  const connection = connectionPresentation[connectionState];

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    const atBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight < 64;
    if (atBottom !== autoFollow) actions.setAutoFollow(atBottom);
  };

  const jumpToLive = () => {
    actions.setAutoFollow(true);
    virtualizer.scrollToIndex(Math.max(0, filteredEvents.length - 1), {
      align: "end",
      behavior: "smooth",
    });
  };

  return (
    <section
      className="bg-muted/10 relative flex min-h-0 flex-1 flex-col overflow-hidden"
      aria-label="Live agent execution timeline"
    >
      <div className="shrink-0 space-y-3 border-b p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight">
                Execution timeline
              </h2>
              <Badge
                variant="outline"
                className={cn("gap-1.5", connection.className)}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full bg-current",
                    (connectionState === "LIVE" ||
                      connectionState === "CONNECTING" ||
                      connectionState === "RECONNECTING") &&
                      "animate-pulse",
                  )}
                />
                {connection.label}
              </Badge>
              {isSeededDemo && (
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="size-3" />
                  Seeded live replay
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Semantic execution events with resumable live updates
            </p>
          </div>
          <div
            className="text-muted-foreground flex items-center gap-1.5 text-xs"
            aria-live="polite"
          >
            <Server className="size-3.5" />
            {buffer.queryLatencyMs !== null
              ? `${Math.round(buffer.queryLatencyMs)} ms stream query`
              : "Establishing stream"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <ConsoleMetric
            label="Execution progress"
            value={`${completedEvents}/${buffer.events.length}`}
            detail={`${buffer.events.filter((event) => event.status === "FAILED").length} failed · ${buffer.events.filter((event) => event.status === "RUNNING").length} running`}
            icon={Activity}
          />
          <ConsoleMetric
            label="Elapsed"
            value={formatIntervalSeconds(Math.max(0, elapsedSeconds), 2)}
            detail={`${buffer.events.filter((event) => event.category === "RETRY").length} retries`}
            icon={Clock3}
          />
          <ConsoleMetric
            label="Mean confidence"
            value={`${Math.round(averageConfidence * 100)}%`}
            detail={`${buffer.events.filter((event) => event.category === "DECISION").length} decisions`}
            icon={Gauge}
          />
          <ConsoleMetric
            label="API latency"
            value={
              apiEvents.length > 0
                ? `${Math.round(averageApiLatency)} ms`
                : "No API calls"
            }
            detail={`${apiEvents.length} external operations`}
            icon={Radio}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-[minmax(14rem,1fr)_11rem_11rem]">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-2 left-2.5 size-4" />
            <Input
              value={search}
              onChange={(event) => actions.setSearch(event.target.value)}
              placeholder="Search events, tools, reasoning, metadata…"
              aria-label="Search execution events"
              className="pl-8"
            />
          </div>
          <Select
            value={categoryFilter}
            onValueChange={(value) =>
              actions.setCategoryFilter(
                value as AgentExecutionEvent["category"] | "ALL",
              )
            }
          >
            <SelectTrigger aria-label="Filter by event category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All event types</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {enumLabel(category)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              actions.setStatusFilter(
                value as AgentExecutionEvent["status"] | "ALL",
              )
            }
          >
            <SelectTrigger aria-label="Filter by event status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {enumLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {streamError && (
          <div
            className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300"
            role="status"
          >
            {streamError}. Existing execution data remains available while the
            stream reconnects.
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-auto py-3"
        onScroll={handleScroll}
      >
        {filteredEvents.length > 0 ? (
          <div
            className="relative w-full"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const event = filteredEvents[virtualRow.index];
              if (!event) return null;
              return (
                <div
                  key={event.id}
                  className="animate-in fade-in slide-in-from-bottom-1 absolute top-0 left-0 w-full duration-300"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <LiveTimelineEventRow
                    event={event}
                    expanded={Boolean(expandedEventIds[event.id])}
                    onToggle={() => actions.toggleExpanded(event.id)}
                    measureRef={virtualizer.measureElement}
                    virtualIndex={virtualRow.index}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full min-h-48 items-center justify-center p-6">
            <div className="max-w-sm text-center">
              <Search className="text-muted-foreground mx-auto size-5" />
              <p className="mt-2 text-sm font-bold">
                No execution events match these filters
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Clear the search or broaden the category and status filters.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  actions.setSearch("");
                  actions.setCategoryFilter("ALL");
                  actions.setStatusFilter("ALL");
                }}
              >
                Clear filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {!autoFollow && (
        <div className="pointer-events-none absolute right-5 bottom-5 z-10">
          <Button
            size="sm"
            className="animate-in fade-in slide-in-from-bottom-2 pointer-events-auto gap-1.5 shadow-lg"
            onClick={jumpToLive}
          >
            <ArrowDown className="size-3.5" />
            Jump to live
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {unreadCount}
              </Badge>
            )}
          </Button>
        </div>
      )}
    </section>
  );
}

export function LiveExecutionConsoleSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-8 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton
            key={index}
            className={cn("h-24 rounded-lg", index === 1 && "h-32")}
          />
        ))}
      </div>
    </div>
  );
}
