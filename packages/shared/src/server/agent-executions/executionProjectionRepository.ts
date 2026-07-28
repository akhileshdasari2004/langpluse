import {
  projectAgentExecution,
  type AgentExecutionProjection,
  type AgentExecutionSourceEvent,
  type AgentExecutionSourceTrace,
} from "../../features/agent-executions";
import { getObservationsForTrace } from "../repositories/observations";
import { getObservationsForTraceFromEventsTable } from "../repositories/events";

function toSourceEvent(
  observation: Awaited<ReturnType<typeof getObservationsForTrace>>[number],
): AgentExecutionSourceEvent {
  return {
    id: observation.id,
    parentObservationId: observation.parentObservationId,
    name: observation.name,
    type: observation.type,
    level: observation.level,
    statusMessage: observation.statusMessage,
    startTime: observation.startTime,
    endTime: observation.endTime,
    version: observation.version,
    metadata: observation.metadata,
  };
}

export async function getAgentExecutionProjection({
  trace,
  useEventsTable,
}: {
  trace: AgentExecutionSourceTrace;
  useEventsTable: boolean;
}): Promise<AgentExecutionProjection> {
  const observations = useEventsTable
    ? (
        await getObservationsForTraceFromEventsTable({
          projectId: trace.projectId,
          traceId: trace.id,
          timestamp: trace.timestamp,
          selectMetadata: true,
        })
      ).observations
    : await getObservationsForTrace({
        projectId: trace.projectId,
        traceId: trace.id,
        timestamp: trace.timestamp,
        includeIO: false,
        includeMetadata: true,
      });

  return projectAgentExecution({
    trace,
    events: observations.map(toSourceEvent),
  });
}
