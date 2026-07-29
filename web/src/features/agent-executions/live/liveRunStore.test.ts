import { describe, expect, it } from "vitest";
import type {
  AgentExecutionEvent,
  AgentExecutionProjection,
} from "@langfuse/shared";
import { createLiveRunStore } from "./liveRunStore";
import { createRunEventCursor } from "./runEventBuffer";

const event = (id: string, offsetMs: number): AgentExecutionEvent => ({
  id,
  parentEventId: null,
  category: "REASONING",
  categoryProvenance: "EXPLICIT",
  confidence: 0.91,
  name: `Reasoning ${id}`,
  observationType: "EVENT",
  level: "DEFAULT",
  status: "COMPLETED",
  statusMessage: null,
  startedAt: new Date(Date.UTC(2026, 6, 29, 0, 0, 0, offsetMs)),
  endedAt: new Date(Date.UTC(2026, 6, 29, 0, 0, 0, offsetMs + 20)),
  latencySeconds: 0.02,
  apiLatencyMs: null,
  toolUsed: null,
  reasoningSummary: "Compared opportunity risk against the account profile.",
  agent: null,
  metadata: {},
});

const projection: AgentExecutionProjection = {
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
  events: [event("initial", 0)],
};

describe("liveRunStore", () => {
  it("counts unread events only while auto-follow is paused", () => {
    const store = createLiveRunStore(projection);
    const nextEvent = event("next", 100);
    store.getState().actions.setAutoFollow(false);
    store.getState().actions.applyMessage({
      type: "append",
      cursor: createRunEventCursor(nextEvent),
      event: nextEvent,
    });

    expect(store.getState().unreadCount).toBe(1);
    store.getState().actions.setAutoFollow(true);
    expect(store.getState().unreadCount).toBe(0);
  });

  it("moves to a terminal connection state after completion", () => {
    const store = createLiveRunStore(projection);
    store.getState().actions.applyMessage({
      type: "completion",
      cursor: null,
      status: "SUCCEEDED",
      endedAt: new Date("2026-07-29T00:00:01.000Z"),
    });

    expect(store.getState().connectionState).toBe("COMPLETE");
    expect(store.getState().buffer.status).toBe("SUCCEEDED");
  });
});
