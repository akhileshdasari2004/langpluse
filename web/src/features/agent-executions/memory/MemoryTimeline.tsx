import type { AgentMemoryEvidence } from "@langfuse/shared";
import { CheckCircle2, CircleX, Clock3 } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { cn } from "@/src/utils/tailwind";
import { MemoryRelevanceBadge } from "./MemoryRelevanceBadge";

export function MemoryTimeline({
  memories,
  selectedId,
  onSelect,
}: {
  memories: AgentMemoryEvidence[];
  selectedId: string | null;
  onSelect: (memory: AgentMemoryEvidence) => void;
}) {
  const ordered = memories.toSorted(
    (left, right) =>
      left.retrievedAt.getTime() - right.retrievedAt.getTime() ||
      left.id.localeCompare(right.id),
  );

  return (
    <div className="bg-card min-h-0 flex-1 overflow-auto rounded-lg border p-4 shadow-xs">
      <div className="flex min-w-max items-stretch gap-0 py-4">
        {ordered.map((memory, index) => {
          const StatusIcon =
            memory.disposition === "RETRIEVED" ? CheckCircle2 : CircleX;
          return (
            <div
              key={memory.id}
              className="relative flex w-64 shrink-0 flex-col"
            >
              <div className="relative flex h-8 items-center">
                <div
                  className={cn(
                    "bg-border absolute right-0 left-0 h-px",
                    index === 0 && "left-1/2",
                    index === ordered.length - 1 && "right-1/2",
                  )}
                />
                <div
                  className={cn(
                    "bg-background relative mx-auto flex size-6 items-center justify-center rounded-full border-2 shadow-sm",
                    memory.disposition === "RETRIEVED"
                      ? "border-emerald-500 text-emerald-600"
                      : "border-red-500 text-red-600",
                  )}
                >
                  <StatusIcon className="size-3" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelect(memory)}
                aria-pressed={selectedId === memory.id}
                className={cn(
                  "hover:border-primary-accent/50 focus-visible:ring-primary-accent bg-background mx-2 mt-2 flex h-44 flex-col rounded-lg border p-3 text-left shadow-xs transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:outline-hidden",
                  selectedId === memory.id &&
                    "border-primary-accent ring-primary-accent ring-1",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant={
                      memory.disposition === "RETRIEVED" ? "success" : "error"
                    }
                  >
                    {memory.disposition}
                  </Badge>
                  <MemoryRelevanceBadge similarity={memory.similarity} />
                </div>
                <p
                  className="mt-2 line-clamp-3 text-xs leading-relaxed font-bold"
                  title={memory.content ?? memory.eventName}
                >
                  {memory.content ?? memory.eventName}
                </p>
                <p
                  className="text-muted-foreground mt-auto truncate text-[10px]"
                  title={memory.source ?? "Source not emitted"}
                >
                  {memory.source ?? "Source not emitted"}
                </p>
                <p className="text-muted-foreground mt-1 flex items-center gap-1 font-mono text-[10px]">
                  <Clock3 className="size-3" />
                  {memory.retrievedAt.toISOString()}
                </p>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
