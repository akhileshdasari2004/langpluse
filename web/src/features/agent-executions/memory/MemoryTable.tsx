import { useRef } from "react";
import type { AgentMemoryEvidence } from "@langfuse/shared";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CheckCircle2, CircleX, Clock3, Database } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { cn } from "@/src/utils/tailwind";
import { MemoryRelevanceBadge } from "./MemoryRelevanceBadge";
import { formatMemoryFreshness, getMemoryFreshnessBand } from "./model";

const gridColumns =
  "grid-cols-[minmax(300px,2fr)_128px_122px_130px_minmax(190px,1fr)_100px]";

function formatDistance(distance: number | null) {
  return distance === null ? "Not emitted" : distance.toFixed(3);
}

function MemoryRow({
  memory,
  selected,
  onSelect,
}: {
  memory: AgentMemoryEvidence;
  selected: boolean;
  onSelect: (memory: AgentMemoryEvidence) => void;
}) {
  const RetrievedIcon =
    memory.disposition === "RETRIEVED" ? CheckCircle2 : CircleX;
  const freshness = getMemoryFreshnessBand(memory.freshnessSeconds);

  return (
    <button
      type="button"
      onClick={() => onSelect(memory)}
      aria-pressed={selected}
      className={cn(
        "hover:bg-muted/45 focus-visible:ring-primary-accent grid h-[72px] w-full items-center gap-3 border-b px-3 text-left transition-[background-color,box-shadow] focus-visible:ring-2 focus-visible:outline-hidden",
        gridColumns,
        selected &&
          "bg-primary-accent/5 shadow-[inset_3px_0_0_hsl(var(--primary-accent))]",
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            memory.disposition === "RETRIEVED"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
              : "bg-red-500/10 text-red-600 dark:text-red-300",
          )}
        >
          <RetrievedIcon className="size-4" />
        </span>
        <span className="min-w-0">
          <span
            className="block truncate text-xs font-bold"
            title={memory.content ?? memory.eventName}
          >
            {memory.content ?? memory.eventName}
          </span>
          <span
            className="text-muted-foreground mt-1 block truncate font-mono text-[10px]"
            title={memory.memoryId}
          >
            {memory.memoryId}
          </span>
        </span>
      </span>
      <span>
        <Badge
          variant={memory.disposition === "RETRIEVED" ? "success" : "error"}
          className="gap-1"
        >
          <RetrievedIcon className="size-3" />
          {memory.disposition}
        </Badge>
      </span>
      <span className="flex flex-col items-start gap-1">
        <MemoryRelevanceBadge similarity={memory.similarity} />
        <span className="text-muted-foreground font-mono text-[10px]">
          distance {formatDistance(memory.embeddingDistance)}
        </span>
      </span>
      <span className="flex flex-col gap-1 text-xs">
        <span className="font-mono font-bold">
          {Math.round(memory.confidence * 100)}% confidence
        </span>
        <span className="text-muted-foreground text-[10px]">
          {formatMemoryFreshness(memory.freshnessSeconds)} · {freshness}
        </span>
      </span>
      <span className="min-w-0">
        <span
          className="block truncate text-xs"
          title={memory.source ?? "Source not emitted"}
        >
          {memory.source ?? "Source not emitted"}
        </span>
        <span
          className="text-muted-foreground mt-1 block truncate text-[10px]"
          title={memory.businessContext ?? "Business context not emitted"}
        >
          {memory.businessContext ?? "Business context not emitted"}
        </span>
      </span>
      <span className="font-mono text-xs">
        {memory.retrievalTimeMs === null
          ? "Not emitted"
          : `${Math.round(memory.retrievalTimeMs)} ms`}
      </span>
    </button>
  );
}

export function MemoryTable({
  memories,
  selectedId,
  onSelect,
}: {
  memories: AgentMemoryEvidence[];
  selectedId: string | null;
  onSelect: (memory: AgentMemoryEvidence) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: memories.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 72,
    overscan: 8,
  });

  return (
    <div className="bg-card flex min-h-[320px] flex-1 flex-col overflow-hidden rounded-lg border shadow-xs">
      <div
        className="min-h-0 flex-1 overflow-x-auto"
        role="region"
        aria-label="Memory evidence inventory"
      >
        <div className="flex h-full min-w-[1000px] flex-col">
          <div
            className={cn(
              "text-muted-foreground bg-muted/30 grid shrink-0 gap-3 border-b px-3 py-2 text-[10px] font-bold tracking-wide uppercase",
              gridColumns,
            )}
          >
            <span>Memory evidence</span>
            <span>Status</span>
            <span>Relevance</span>
            <span>Confidence / freshness</span>
            <span>Source / context</span>
            <span>Retrieval</span>
          </div>
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
            <div
              className="relative"
              style={{ height: virtualizer.getTotalSize() }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const memory = memories[virtualRow.index];
                return (
                  <div
                    key={memory.id}
                    className="absolute top-0 left-0 w-full"
                    style={{
                      height: virtualRow.size,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <MemoryRow
                      memory={memory}
                      selected={memory.id === selectedId}
                      onSelect={onSelect}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <footer className="text-muted-foreground flex items-center justify-between gap-2 border-t px-3 py-2 text-[10px]">
        <span className="flex items-center gap-1">
          <Database className="size-3" />
          {memories.length.toLocaleString()} memories
        </span>
        <span className="flex items-center gap-1">
          <Clock3 className="size-3" />
          Virtualized evidence view
        </span>
      </footer>
    </div>
  );
}
