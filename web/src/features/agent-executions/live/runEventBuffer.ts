import type {
  AgentExecutionEvent,
  AgentExecutionProjection,
  AgentExecutionStatus,
} from "@langfuse/shared";
import type { RunStreamMessage } from "./schema";

export const MAX_LIVE_RUN_EVENTS = 5_000;

export type RunEventBuffer = {
  events: AgentExecutionEvent[];
  status: AgentExecutionStatus;
  endedAt: Date | null;
  cursor: string | null;
  lastServerTime: Date | null;
  queryLatencyMs: number | null;
};

export function createRunEventCursor(event: AgentExecutionEvent): string {
  return `${event.startedAt.getTime()}:${encodeURIComponent(event.id)}`;
}

export function parseRunEventCursor(
  cursor: string | null | undefined,
): { startedAtMs: number; eventId: string } | null {
  if (!cursor || cursor.length > 500) return null;
  const separator = cursor.indexOf(":");
  if (separator <= 0) return null;
  const startedAtMs = Number(cursor.slice(0, separator));
  if (!Number.isSafeInteger(startedAtMs) || startedAtMs < 0) return null;
  try {
    const eventId = decodeURIComponent(cursor.slice(separator + 1));
    return eventId ? { startedAtMs, eventId } : null;
  } catch {
    return null;
  }
}

export function isEventAfterCursor(
  event: AgentExecutionEvent,
  cursor: string | null | undefined,
): boolean {
  const parsed = parseRunEventCursor(cursor);
  if (!parsed) return true;
  const eventTime = event.startedAt.getTime();
  return (
    eventTime > parsed.startedAtMs ||
    (eventTime === parsed.startedAtMs && event.id > parsed.eventId)
  );
}

export function sortAndBoundRunEvents(
  events: AgentExecutionEvent[],
  maxEvents = MAX_LIVE_RUN_EVENTS,
): AgentExecutionEvent[] {
  const byId = new Map<string, AgentExecutionEvent>();
  for (const event of events) byId.set(event.id, event);
  return [...byId.values()]
    .sort(
      (left, right) =>
        left.startedAt.getTime() - right.startedAt.getTime() ||
        left.id.localeCompare(right.id),
    )
    .slice(-maxEvents);
}

export function createRunEventBuffer(
  projection: AgentExecutionProjection,
): RunEventBuffer {
  const events = sortAndBoundRunEvents(projection.events);
  return {
    events,
    status: projection.status,
    endedAt: projection.endedAt,
    cursor: events.at(-1) ? createRunEventCursor(events.at(-1)!) : null,
    lastServerTime: null,
    queryLatencyMs: null,
  };
}

export function applyRunStreamMessage(
  buffer: RunEventBuffer,
  message: RunStreamMessage,
  maxEvents = MAX_LIVE_RUN_EVENTS,
): RunEventBuffer {
  switch (message.type) {
    case "snapshot": {
      const events = sortAndBoundRunEvents(
        message.replace
          ? message.projection.events
          : [...buffer.events, ...message.projection.events],
        maxEvents,
      );
      return {
        ...buffer,
        events,
        status: message.projection.status,
        endedAt: message.projection.endedAt,
        cursor: message.cursor,
      };
    }
    case "append":
    case "correction":
      return {
        ...buffer,
        events: sortAndBoundRunEvents(
          [...buffer.events, message.event],
          maxEvents,
        ),
        cursor: message.cursor,
      };
    case "heartbeat":
      return {
        ...buffer,
        cursor: message.cursor ?? buffer.cursor,
        lastServerTime: message.serverTime,
        queryLatencyMs: message.queryLatencyMs,
      };
    case "completion":
      return {
        ...buffer,
        status: message.status,
        endedAt: message.endedAt,
        cursor: message.cursor ?? buffer.cursor,
      };
    case "error":
      return buffer;
  }
}
