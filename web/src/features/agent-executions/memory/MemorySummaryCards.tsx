import type { AgentMemoryProjection } from "@langfuse/shared";
import { CheckCircle2, Clock3, Database, SearchX } from "lucide-react";
import { formatIntervalSeconds } from "@/src/utils/dates";

const cards = [
  {
    key: "retrieved",
    label: "Retrieved",
    icon: CheckCircle2,
    className: "text-emerald-600 dark:text-emerald-300",
  },
  {
    key: "rejected",
    label: "Rejected",
    icon: SearchX,
    className: "text-red-600 dark:text-red-300",
  },
  {
    key: "similarity",
    label: "Avg. similarity",
    icon: Database,
    className: "text-blue-600 dark:text-blue-300",
  },
  {
    key: "latency",
    label: "Avg. retrieval",
    icon: Clock3,
    className: "text-purple-600 dark:text-purple-300",
  },
] as const;

export function MemorySummaryCards({
  projection,
}: {
  projection: AgentMemoryProjection;
}) {
  const values = {
    retrieved: projection.retrievedCount.toLocaleString(),
    rejected: projection.rejectedCount.toLocaleString(),
    similarity:
      projection.averageSimilarity === null
        ? "Not emitted"
        : `${Math.round(projection.averageSimilarity * 100)}%`,
    latency:
      projection.averageRetrievalTimeMs === null
        ? "Not emitted"
        : formatIntervalSeconds(projection.averageRetrievalTimeMs / 1_000, 3),
  };

  return (
    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="bg-card/80 rounded-lg border p-3 shadow-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-[10px] font-bold tracking-wide uppercase">
                {card.label}
              </p>
              <Icon className={`size-3.5 ${card.className}`} />
            </div>
            <p className="mt-1 font-mono text-lg font-bold">
              {values[card.key]}
            </p>
          </div>
        );
      })}
    </div>
  );
}
