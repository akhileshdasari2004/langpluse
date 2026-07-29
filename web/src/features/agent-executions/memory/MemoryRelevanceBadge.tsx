import { Badge } from "@/src/components/ui/badge";
import { cn } from "@/src/utils/tailwind";

export function MemoryRelevanceBadge({
  similarity,
  className,
}: {
  similarity: number | null;
  className?: string;
}) {
  if (similarity === null) {
    return (
      <Badge variant="secondary" className={className}>
        Not emitted
      </Badge>
    );
  }

  const percentage = Math.round(similarity * 100);
  return (
    <Badge
      variant="outline"
      className={cn(
        similarity >= 0.9
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : similarity >= 0.7
            ? "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300"
            : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        className,
      )}
    >
      {percentage}% match
    </Badge>
  );
}
