import { describe, expect, it } from "vitest";
import type { AgentExecutionSourceEvent } from "./types";
import {
  classifyAgentExecutionEvent,
  projectAgentExecution,
} from "./classification";

const sourceEvent = (
  overrides: Partial<AgentExecutionSourceEvent> = {},
): AgentExecutionSourceEvent => ({
  id: "event-1",
  parentObservationId: null,
  name: "work",
  type: "SPAN",
  level: "DEFAULT",
  statusMessage: null,
  startTime: new Date("2026-01-01T00:00:00.000Z"),
  endTime: new Date("2026-01-01T00:00:01.000Z"),
  version: null,
  metadata: {},
  ...overrides,
});

describe("agent execution classification", () => {
  it("prefers an explicit Mission Control category", () => {
    expect(
      classifyAgentExecutionEvent(
        sourceEvent({
          type: "TOOL",
          metadata: { "mission_control.event.category": "decision" },
        }),
      ),
    ).toEqual({
      category: "DECISION",
      provenance: "EXPLICIT",
      confidence: 1,
    });
  });

  it("classifies agent execution types without inventing semantics", () => {
    expect(classifyAgentExecutionEvent(sourceEvent({ type: "TOOL" }))).toEqual({
      category: "TOOL_CALL",
      provenance: "INFERRED",
      confidence: 0.95,
    });
    expect(
      classifyAgentExecutionEvent(sourceEvent({ name: "opaque operation" })),
    ).toEqual({
      category: "UNKNOWN",
      provenance: "RAW",
      confidence: 0,
    });
  });
});

describe("projectAgentExecution", () => {
  it("sorts events deterministically and derives explicit agent identity", () => {
    const projection = projectAgentExecution({
      trace: {
        id: "trace-1",
        projectId: "project-1",
        name: "support-run",
        timestamp: new Date("2026-01-01T00:00:00.000Z"),
        metadata: {
          "mission_control.agent.key": "support-agent",
          "mission_control.agent.name": "Support Agent",
        },
        version: "1.0",
      },
      events: [
        sourceEvent({
          id: "event-2",
          name: "complete",
          startTime: new Date("2026-01-01T00:00:02.000Z"),
          endTime: new Date("2026-01-01T00:00:03.000Z"),
        }),
        sourceEvent({
          id: "event-1",
          type: "AGENT",
          name: "Support Agent",
        }),
      ],
    });

    expect(projection.agent).toEqual({
      key: "support-agent",
      name: "Support Agent",
      version: "1.0",
      provenance: "EXPLICIT",
    });
    expect(projection.events.map((event) => event.id)).toEqual([
      "event-1",
      "event-2",
    ]);
    expect(projection.status).toBe("SUCCEEDED");
    expect(projection.latencySeconds).toBe(3);
  });

  it("marks an execution failed when any event is an error", () => {
    const projection = projectAgentExecution({
      trace: {
        id: "trace-1",
        projectId: "project-1",
        name: null,
        timestamp: new Date("2026-01-01T00:00:00.000Z"),
        metadata: {},
        version: null,
      },
      events: [sourceEvent({ level: "ERROR" })],
    });

    expect(projection.status).toBe("FAILED");
  });
});
