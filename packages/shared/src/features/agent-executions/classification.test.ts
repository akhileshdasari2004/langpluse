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

  it("allows a later completion to recover from a failed attempt", () => {
    const projection = projectAgentExecution({
      trace: {
        id: "trace-1",
        projectId: "project-1",
        name: "recovered-run",
        timestamp: new Date("2026-01-01T00:00:00.000Z"),
        metadata: {},
        version: null,
      },
      events: [
        sourceEvent({
          id: "failed-attempt",
          level: "ERROR",
          startTime: new Date("2026-01-01T00:00:01.000Z"),
          endTime: new Date("2026-01-01T00:00:02.000Z"),
        }),
        sourceEvent({
          id: "completion",
          name: "execution complete",
          metadata: { "mission_control.event.category": "completion" },
          startTime: new Date("2026-01-01T00:00:03.000Z"),
          endTime: new Date("2026-01-01T00:00:04.000Z"),
        }),
      ],
    });

    expect(projection.status).toBe("SUCCEEDED");
    expect(projection.events[0]?.status).toBe("FAILED");
  });

  it("preserves raw telemetry identity and metadata in the semantic projection", () => {
    const rawEvent = sourceEvent({
      id: "raw-observation-id",
      parentObservationId: "raw-parent-id",
      type: "TOOL",
      name: "crm.lookup",
      metadata: {
        tenantRegion: "eu-central-1",
        "mission_control.event.category": "tool_call",
      },
    });
    const projection = projectAgentExecution({
      trace: {
        id: "raw-trace-id",
        projectId: "project-1",
        name: "sales-run",
        timestamp: new Date("2026-01-01T00:00:00.000Z"),
        metadata: {},
        version: null,
      },
      events: [rawEvent],
    });

    expect(projection.traceId).toBe("raw-trace-id");
    expect(projection.events[0]).toMatchObject({
      id: rawEvent.id,
      parentEventId: rawEvent.parentObservationId,
      observationType: rawEvent.type,
      name: rawEvent.name,
      metadata: rawEvent.metadata,
      category: "TOOL_CALL",
      categoryProvenance: "EXPLICIT",
      confidence: 1,
      status: "COMPLETED",
      toolUsed: "crm.lookup",
      apiLatencyMs: 1_000,
    });
  });

  it("projects only explicitly supplied reasoning summaries and confidence", () => {
    const projection = projectAgentExecution({
      trace: {
        id: "trace-1",
        projectId: "project-1",
        name: "reasoning-run",
        timestamp: new Date("2026-01-01T00:00:00.000Z"),
        metadata: {},
        version: null,
      },
      events: [
        sourceEvent({
          metadata: {
            "mission_control.event.category": "reasoning",
            "mission_control.event.confidence": 0.87,
            "mission_control.reasoning.summary":
              "Use verified renewal context before drafting.",
          },
        }),
      ],
    });

    expect(projection.events[0]).toMatchObject({
      confidence: 0.87,
      reasoningSummary: "Use verified renewal context before drafting.",
      toolUsed: null,
    });
  });
});
