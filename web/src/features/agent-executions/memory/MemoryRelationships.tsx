import type {
  AgentMemoryEvidence,
  AgentMemoryRelationship,
} from "@langfuse/shared";
import { ArrowRight, Network } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { cn } from "@/src/utils/tailwind";

function RelationshipMemory({
  memory,
  selected,
  onSelect,
}: {
  memory: AgentMemoryEvidence;
  selected: boolean;
  onSelect: (memory: AgentMemoryEvidence) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(memory)}
      aria-pressed={selected}
      className={cn(
        "hover:border-primary-accent/50 focus-visible:ring-primary-accent bg-background min-w-0 rounded-lg border p-3 text-left shadow-xs transition-[border-color,box-shadow]",
        selected && "border-primary-accent ring-primary-accent ring-1",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Badge
          variant={memory.disposition === "RETRIEVED" ? "success" : "error"}
        >
          {memory.disposition}
        </Badge>
        <span className="font-mono text-[10px]">
          {memory.similarity === null
            ? "No score"
            : `${Math.round(memory.similarity * 100)}%`}
        </span>
      </div>
      <p
        className="mt-2 line-clamp-2 text-xs font-bold"
        title={memory.content ?? memory.eventName}
      >
        {memory.content ?? memory.eventName}
      </p>
      <p
        className="text-muted-foreground mt-2 truncate text-[10px]"
        title={memory.source ?? "Source not emitted"}
      >
        {memory.source ?? "Source not emitted"}
      </p>
    </button>
  );
}

export function MemoryRelationships({
  memories,
  relationships,
  selectedId,
  onSelect,
}: {
  memories: AgentMemoryEvidence[];
  relationships: AgentMemoryRelationship[];
  selectedId: string | null;
  onSelect: (memory: AgentMemoryEvidence) => void;
}) {
  const byId = new Map(memories.map((memory) => [memory.id, memory]));
  const visibleRelationships = relationships.flatMap((relationship) => {
    const source = byId.get(relationship.source);
    const target = byId.get(relationship.target);
    return source && target ? [{ relationship, source, target }] : [];
  });

  if (visibleRelationships.length === 0) {
    return (
      <div className="bg-card flex min-h-[320px] flex-1 items-center justify-center rounded-lg border p-6 text-center shadow-xs">
        <div className="max-w-md">
          <Network className="text-muted-foreground mx-auto size-8" />
          <h3 className="mt-3 text-sm font-bold">
            No relationships match these filters
          </h3>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Mission Control only displays relationships emitted by the memory
            system; it does not infer links between customer records.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card min-h-0 flex-1 overflow-auto rounded-lg border p-4 shadow-xs">
      <div className="mx-auto grid max-w-5xl gap-3">
        {visibleRelationships.map(({ relationship, source, target }) => (
          <div
            key={relationship.id}
            className="animate-in fade-in slide-in-from-bottom-1 bg-muted/15 grid items-center gap-3 rounded-xl border p-3 duration-300 md:grid-cols-[minmax(0,1fr)_150px_minmax(0,1fr)]"
          >
            <RelationshipMemory
              memory={source}
              selected={selectedId === source.id}
              onSelect={onSelect}
            />
            <div className="flex items-center justify-center gap-2 py-1">
              <span className="bg-border h-px flex-1" />
              <Badge variant="outline">{relationship.type}</Badge>
              <ArrowRight className="text-muted-foreground size-4 shrink-0" />
              <span className="bg-border hidden h-px flex-1 md:block" />
            </div>
            <RelationshipMemory
              memory={target}
              selected={selectedId === target.id}
              onSelect={onSelect}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
