import { useMemo, useState } from "react";
import {
  buildAgentMemoryProjection,
  type AgentExecutionProjection,
  type AgentMemoryEvidence,
} from "@langfuse/shared";
import {
  CheckCircle2,
  CircleX,
  Database,
  GitBranch,
  History,
  List,
  Radio,
  RotateCcw,
  Search,
} from "lucide-react";
import { StringParam, useQueryParam } from "use-query-params";
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
import type { ObservationReturnTypeWithMetadata } from "@/src/server/api/routers/traces";
import { cn } from "@/src/utils/tailwind";
import { useRunProjection } from "../components/RunProjectionContext";
import { useLiveRunStore } from "../live/LiveRunStoreProvider";
import { useActiveRunReplayEvent } from "../replay/RunReplayProvider";
import { MemoryDetail } from "./MemoryDetail";
import { MemoryRelationships } from "./MemoryRelationships";
import { MemorySummaryCards } from "./MemorySummaryCards";
import { MemoryTable } from "./MemoryTable";
import { MemoryTimeline } from "./MemoryTimeline";
import {
  filterAndSortMemories,
  type MemoryDispositionFilter,
  type MemoryFreshnessFilter,
  type MemorySort,
} from "./model";

type MemoryView = "inventory" | "timeline" | "relationships";

function asDisposition(value: string | null | undefined) {
  return value === "RETRIEVED" || value === "REJECTED" ? value : "ALL";
}

function asFreshness(value: string | null | undefined) {
  return value === "FRESH" || value === "AGING" || value === "STALE"
    ? value
    : "ALL";
}

function asView(value: string | null | undefined): MemoryView {
  return value === "timeline" || value === "relationships"
    ? value
    : "inventory";
}

const viewOptions = [
  { value: "inventory", label: "Inventory", icon: List },
  { value: "timeline", label: "Timeline", icon: History },
  { value: "relationships", label: "Relationships", icon: GitBranch },
] as const;

function MemoryEmptyState({
  isFiltered,
  onReset,
}: {
  isFiltered: boolean;
  onReset: () => void;
}) {
  return (
    <div className="bg-card flex min-h-[320px] flex-1 items-center justify-center rounded-lg border p-6 text-center shadow-xs">
      <div className="max-w-md">
        <Database className="text-muted-foreground mx-auto size-9" />
        <h3 className="mt-3 text-sm font-bold">
          {isFiltered
            ? "No memories match these filters"
            : "No memory retrieval evidence recorded"}
        </h3>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {isFiltered
            ? "Broaden the search, source, freshness, or retrieval status to inspect more evidence."
            : "This run did not emit a memory retrieval event. Langpluse does not invent memory records from unrelated spans."}
        </p>
        {isFiltered ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 gap-1.5"
            onClick={onReset}
          >
            <RotateCcw className="size-3.5" />
            Reset filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function MemoryExplorer({
  projectId,
  traceId,
  observations,
}: {
  projectId: string;
  traceId: string;
  observations: ObservationReturnTypeWithMetadata[];
}) {
  const projection = useRunProjection();
  const buffer = useLiveRunStore((state) => state.buffer);
  const replayEvent = useActiveRunReplayEvent();
  const [selectedParam, setSelectedParam] = useQueryParam(
    "memory",
    StringParam,
  );
  const [dispositionParam, setDispositionParam] = useQueryParam(
    "memoryStatus",
    StringParam,
  );
  const [freshnessParam, setFreshnessParam] = useQueryParam(
    "memoryFreshness",
    StringParam,
  );
  const [viewParam, setViewParam] = useQueryParam("memoryView", StringParam);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("ALL");
  const [sort, setSort] = useState<MemorySort>("RELEVANCE");
  const disposition: MemoryDispositionFilter = asDisposition(dispositionParam);
  const freshness: MemoryFreshnessFilter = asFreshness(freshnessParam);
  const view = asView(viewParam);

  const liveProjection = useMemo<AgentExecutionProjection>(
    () => ({
      ...projection,
      status: buffer.status,
      endedAt: buffer.endedAt,
      latencySeconds: buffer.endedAt
        ? Math.max(
            0,
            (buffer.endedAt.getTime() - projection.startedAt.getTime()) / 1_000,
          )
        : null,
      events: buffer.events,
    }),
    [buffer.endedAt, buffer.events, buffer.status, projection],
  );
  const memoryProjection = useMemo(
    () => buildAgentMemoryProjection(liveProjection),
    [liveProjection],
  );
  const sources = useMemo(
    () =>
      [
        ...new Set(
          memoryProjection.memories.flatMap((memory) =>
            memory.source ? [memory.source] : [],
          ),
        ),
      ].toSorted(),
    [memoryProjection.memories],
  );
  const filteredMemories = useMemo(
    () =>
      filterAndSortMemories({
        memories: memoryProjection.memories,
        search,
        disposition,
        freshness,
        source,
        sort,
      }),
    [disposition, freshness, memoryProjection.memories, search, sort, source],
  );
  const selectedMemory =
    memoryProjection.memories.find((memory) => memory.id === selectedParam) ??
    memoryProjection.memories.find(
      (memory) => memory.eventId === replayEvent?.id,
    ) ??
    null;
  const observationById = useMemo(
    () =>
      new Map(observations.map((observation) => [observation.id, observation])),
    [observations],
  );
  const hasFilters =
    search.trim().length > 0 ||
    disposition !== "ALL" ||
    freshness !== "ALL" ||
    source !== "ALL";

  const resetFilters = () => {
    setSearch("");
    setSource("ALL");
    setSort("RELEVANCE");
    setDispositionParam(undefined);
    setFreshnessParam(undefined);
  };

  const selectMemory = (memory: AgentMemoryEvidence) => {
    setSelectedParam(memory.id);
  };

  return (
    <section
      className="bg-muted/10 relative flex min-h-0 flex-1 flex-col overflow-hidden"
      aria-label="Memory Explorer"
    >
      <header className="bg-background/95 grid shrink-0 gap-3 border-b p-3 backdrop-blur sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300">
              <Database className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold">Memory Explorer</h2>
                <Badge variant="outline">
                  {memoryProjection.memories.length.toLocaleString()} memories
                </Badge>
                {memoryProjection.status === "RUNNING" ? (
                  <Badge variant="warning" className="gap-1">
                    <Radio className="size-3 animate-pulse" />
                    Live retrieval
                  </Badge>
                ) : null}
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Auditable retrieval evidence, rejection rationale, and source
                lineage
              </p>
            </div>
          </div>
          <div className="bg-muted/50 inline-flex h-8 rounded-md border p-0.5">
            {viewOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setViewParam(
                      option.value === "inventory" ? undefined : option.value,
                    )
                  }
                  aria-pressed={view === option.value}
                  className={cn(
                    "flex items-center gap-1.5 rounded-sm px-2.5 text-xs font-bold transition-all",
                    view === option.value
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  <span className="hidden sm:inline">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <MemorySummaryCards projection={memoryProjection} />

        <div className="grid gap-2 lg:grid-cols-[minmax(240px,1fr)_150px_150px_200px_155px]">
          <div className="relative min-w-0">
            <Search className="text-muted-foreground pointer-events-none absolute top-2 left-2.5 size-4" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search memory content, source, context, rationale…"
              aria-label="Search memory evidence"
              className="pl-8"
            />
          </div>
          <Select
            value={disposition}
            onValueChange={(value) =>
              setDispositionParam(value === "ALL" ? undefined : value)
            }
          >
            <SelectTrigger aria-label="Filter memory status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="RETRIEVED">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  Retrieved
                </span>
              </SelectItem>
              <SelectItem value="REJECTED">
                <span className="flex items-center gap-1.5">
                  <CircleX className="size-3.5 text-red-600" />
                  Rejected
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={freshness}
            onValueChange={(value) =>
              setFreshnessParam(value === "ALL" ? undefined : value)
            }
          >
            <SelectTrigger aria-label="Filter memory freshness">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Any freshness</SelectItem>
              <SelectItem value="FRESH">Fresh · ≤ 7 days</SelectItem>
              <SelectItem value="AGING">Aging · 8–90 days</SelectItem>
              <SelectItem value="STALE">Stale · &gt; 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger aria-label="Filter memory source">
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All sources</SelectItem>
              {sources.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sort}
            onValueChange={(value) => setSort(value as MemorySort)}
          >
            <SelectTrigger aria-label="Sort memory evidence">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RELEVANCE">Highest relevance</SelectItem>
              <SelectItem value="RECENT">Most recent</SelectItem>
              <SelectItem value="RETRIEVAL_TIME">Slowest retrieval</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
          {filteredMemories.length === 0 ? (
            <MemoryEmptyState isFiltered={hasFilters} onReset={resetFilters} />
          ) : view === "timeline" ? (
            <MemoryTimeline
              memories={filteredMemories}
              selectedId={selectedMemory?.id ?? null}
              onSelect={selectMemory}
            />
          ) : view === "relationships" ? (
            <MemoryRelationships
              memories={filteredMemories}
              relationships={memoryProjection.relationships}
              selectedId={selectedMemory?.id ?? null}
              onSelect={selectMemory}
            />
          ) : (
            <MemoryTable
              memories={filteredMemories}
              selectedId={selectedMemory?.id ?? null}
              onSelect={selectMemory}
            />
          )}
        </div>

        {selectedMemory ? (
          <MemoryDetail
            memory={selectedMemory}
            projection={memoryProjection}
            observation={observationById.get(selectedMemory.eventId)}
            projectId={projectId}
            traceId={traceId}
            onClose={() => setSelectedParam(undefined)}
          />
        ) : null}
      </div>
    </section>
  );
}
