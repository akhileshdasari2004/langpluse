import type { AgentExecutionEvent } from "@langfuse/shared";
import type { NodeWindow } from "@/src/components/trace/contexts/playheadStore";

export function orderReplayEvents(events: AgentExecutionEvent[]) {
  return [...events].toSorted(
    (left, right) =>
      left.startedAt.getTime() - right.startedAt.getTime() ||
      left.id.localeCompare(right.id),
  );
}

export function buildRunReplayGeometry({
  events,
  startedAt,
  endedAt,
}: {
  events: AgentExecutionEvent[];
  startedAt: Date;
  endedAt: Date | null;
}) {
  const ordered = orderReplayEvents(events);
  const latest =
    endedAt ??
    ordered.at(-1)?.endedAt ??
    ordered.at(-1)?.startedAt ??
    startedAt;
  const duration = Math.max(
    0,
    (latest.getTime() - startedAt.getTime()) / 1_000,
  );
  const windows: NodeWindow[] = ordered.map((event) => ({
    id: event.id,
    startSec: Math.max(
      0,
      (event.startedAt.getTime() - startedAt.getTime()) / 1_000,
    ),
    endSec: Math.max(
      0,
      ((event.endedAt ?? event.startedAt).getTime() - startedAt.getTime()) /
        1_000,
    ),
  }));
  return {
    ordered,
    traceDuration: duration,
    nodeWindows: windows,
    boundaries: windows.flatMap((window) => [window.startSec, window.endSec]),
  };
}

export function activeReplayEvent(
  ordered: AgentExecutionEvent[],
  activeIds: ReadonlySet<string>,
) {
  return ordered.find((event) => activeIds.has(event.id)) ?? null;
}
