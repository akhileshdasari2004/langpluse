import { Badge, type BadgeProps } from "@/src/components/ui/badge";
import { formatIntervalSeconds } from "@/src/utils/dates";
import { useRunProjection } from "./RunProjectionContext";

const statusVariant: Record<
  ReturnType<typeof useRunProjection>["status"],
  BadgeProps["variant"]
> = {
  RUNNING: "warning",
  SUCCEEDED: "success",
  FAILED: "error",
  UNKNOWN: "secondary",
};

export function RunWorkbenchHeader() {
  const run = useRunProjection();

  return (
    <section
      className="bg-muted/20 border-b px-3 py-2"
      aria-label="Run summary"
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant={statusVariant[run.status]}>{run.status}</Badge>
        <span className="font-medium">{run.agent.name}</span>
        {run.agent.version && (
          <Badge variant="outline">v{run.agent.version}</Badge>
        )}
        <span className="text-muted-foreground">
          {run.events.length} {run.events.length === 1 ? "event" : "events"}
        </span>
        {run.latencySeconds !== null && (
          <span className="text-muted-foreground">
            {formatIntervalSeconds(run.latencySeconds)}
          </span>
        )}
        {run.agent.provenance !== "EXPLICIT" && (
          <Badge variant="outline">{run.agent.provenance} identity</Badge>
        )}
      </div>
    </section>
  );
}
