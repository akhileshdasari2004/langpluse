import type { AgentExecutionStatus } from "@langfuse/shared";
import { Badge, type BadgeProps } from "@/src/components/ui/badge";
import { formatIntervalSeconds } from "@/src/utils/dates";
import { useRunProjection } from "./RunProjectionContext";
import { useLiveRunStore } from "../live/LiveRunStoreProvider";

const statusVariant: Record<AgentExecutionStatus, BadgeProps["variant"]> = {
  RUNNING: "warning",
  SUCCEEDED: "success",
  FAILED: "error",
  UNKNOWN: "secondary",
};

export function RunWorkbenchHeader() {
  const run = useRunProjection();
  const buffer = useLiveRunStore((state) => state.buffer);
  const latencySeconds =
    buffer.endedAt !== null
      ? (buffer.endedAt.getTime() - run.startedAt.getTime()) / 1_000
      : run.latencySeconds;

  return (
    <section
      className="bg-muted/20 border-b px-3 py-2"
      aria-label="Run summary"
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant={statusVariant[buffer.status]}>{buffer.status}</Badge>
        <span className="font-bold">{run.agent.name}</span>
        {run.agent.version && (
          <Badge variant="outline">v{run.agent.version}</Badge>
        )}
        <span className="text-muted-foreground">
          {buffer.events.length}{" "}
          {buffer.events.length === 1 ? "event" : "events"}
        </span>
        {latencySeconds !== null && (
          <span className="text-muted-foreground">
            {formatIntervalSeconds(latencySeconds)}
          </span>
        )}
        {run.agent.provenance !== "EXPLICIT" && (
          <Badge variant="outline">{run.agent.provenance} identity</Badge>
        )}
      </div>
    </section>
  );
}
