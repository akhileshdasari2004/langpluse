import { describe, expect, it } from "vitest";
import type {
  AgentExecutionEvent,
  AgentExecutionProjection,
} from "@langfuse/shared";
import {
  applyRunStreamMessage,
  createRunEventBuffer,
  createRunEventCursor,
  isEventAfterCursor,
  MAX_LIVE_RUN_EVENTS,
  parseRunEventCursor,
} from "./runEventBuffer";

const event = (
  id: string,
  startedAt: string,
  overrides: Partial<AgentExecutionEvent> = {},
): AgentExecutionEvent => ({
  id,
  parentEventId: null,
  category: "OBSERVATION",
  categoryProvenance: "EXPLICIT",
  confidence: 0.9,
  name: id,
  observationType: "EVENT",
  level: "DEFAULT",
  status: "COMPLETED",
  statusMessage: null,
  startedAt: new Date(startedAt),
  endedAt: new Date(startedAt),
  latencySeconds: 0,
  apiLatencyMs: null,
  toolUsed: null,
  reasoningSummary: null,
  agent: null,
  metadata: {},
  ...overrides,
});

const projection = (
  events: AgentExecutionEvent[],
): AgentExecutionProjection => ({
  id: "run-1",
  traceId: "run-1",
  projectId: "project-1",
  name: "Enterprise Sales Email",
  status: "RUNNING",
  startedAt: new Date("2026-07-29T00:00:00.000Z"),
  endedAt: null,
  latencySeconds: null,
  agent: {
    key: "sales-agent",
    name: "Sales Agent",
    version: "1.0",
    provenance: "EXPLICIT",
  },
  events,
});

describe("runEventBuffer", () => {
  it("deduplicates and orders late events deterministically", () => {
    const first = event("first", "2026-07-29T00:00:01.000Z");
    const second = event("second", "2026-07-29T00:00:02.000Z");
    let buffer = createRunEventBuffer(projection([second]));

    buffer = applyRunStreamMessage(buffer, {
      type: "append",
      event: first,
      cursor: createRunEventCursor(first),
    });
    buffer = applyRunStreamMessage(buffer, {
      type: "append",
      event: second,
      cursor: createRunEventCursor(second),
    });

    expect(buffer.events.map(({ id }) => id)).toEqual(["first", "second"]);
  });

  it("replaces corrected events and bounds retained history", () => {
    const original = event("same", "2026-07-29T00:00:01.000Z");
    const corrected = event("same", "2026-07-29T00:00:01.000Z", {
      status: "FAILED",
    });
    const buffer = applyRunStreamMessage(
      createRunEventBuffer(projection([original])),
      {
        type: "correction",
        event: corrected,
        cursor: createRunEventCursor(corrected),
      },
      1,
    );

    expect(buffer.events).toEqual([corrected]);
  });

  it("merges reconnect snapshots and replaces replay snapshots", () => {
    const first = event("first", "2026-07-29T00:00:01.000Z");
    const second = event("second", "2026-07-29T00:00:02.000Z");
    const initial = createRunEventBuffer(projection([first]));

    const merged = applyRunStreamMessage(initial, {
      type: "snapshot",
      cursor: createRunEventCursor(second),
      replace: false,
      projection: projection([second]),
    });
    const replaced = applyRunStreamMessage(merged, {
      type: "snapshot",
      cursor: createRunEventCursor(second),
      replace: true,
      projection: projection([second]),
    });

    expect(merged.events.map(({ id }) => id)).toEqual(["first", "second"]);
    expect(replaced.events.map(({ id }) => id)).toEqual(["second"]);
  });

  it("retains at most the documented event limit during a high-rate run", () => {
    const events = Array.from(
      { length: MAX_LIVE_RUN_EVENTS + 25 },
      (_, index) =>
        event(
          `event-${String(index).padStart(5, "0")}`,
          new Date(Date.UTC(2026, 6, 29, 0, 0, 0, index)).toISOString(),
        ),
    );

    const buffer = createRunEventBuffer(projection(events));

    expect(buffer.events).toHaveLength(MAX_LIVE_RUN_EVENTS);
    expect(buffer.events[0]?.id).toBe("event-00025");
  });

  it("applies terminal status without discarding the final events", () => {
    const completed = event("completed", "2026-07-29T00:00:02.000Z");
    const buffer = applyRunStreamMessage(
      createRunEventBuffer(projection([completed])),
      {
        type: "completion",
        cursor: createRunEventCursor(completed),
        status: "SUCCEEDED",
        endedAt: new Date("2026-07-29T00:00:03.000Z"),
      },
    );

    expect(buffer.status).toBe("SUCCEEDED");
    expect(buffer.endedAt).toEqual(new Date("2026-07-29T00:00:03.000Z"));
    expect(buffer.events).toEqual([completed]);
  });

  it("parses resumable cursors and compares equal timestamps by id", () => {
    const cursor = createRunEventCursor(
      event("event:a", "2026-07-29T00:00:01.000Z"),
    );

    expect(parseRunEventCursor(cursor)).toEqual({
      startedAtMs: new Date("2026-07-29T00:00:01.000Z").getTime(),
      eventId: "event:a",
    });
    expect(
      isEventAfterCursor(event("event:b", "2026-07-29T00:00:01.000Z"), cursor),
    ).toBe(true);
    expect(
      isEventAfterCursor(event("event:0", "2026-07-29T00:00:01.000Z"), cursor),
    ).toBe(false);
    expect(parseRunEventCursor("not-a-cursor")).toBeNull();
  });
});
