import type { Job, Processor } from "bullmq";
import {
  cancelSimulationRun,
  claimSimulationRun,
  completeSimulationRun,
  failSimulationRun,
  getAgentExecutionProjection,
  getSimulationRun,
  getSimulationScenario,
  getTraceById,
  parseScenarioDefinition,
  QueueName,
  type TQueueJobTypes,
} from "@langfuse/shared/src/server";
import { compileSimulationScenario } from "@langfuse/shared";
import { env, v4WritesToEventsTable } from "../env";

export const executionSimulationQueueProcessor: Processor = async (
  job: Job<TQueueJobTypes[QueueName.ExecutionSimulation]>,
) => {
  const { projectId, simulationRunId } = job.data.payload;
  const claimedRun = await claimSimulationRun({ projectId, simulationRunId });
  if (!claimedRun) return;

  try {
    if (claimedRun.cancelRequestedAt) {
      await cancelSimulationRun({ projectId, simulationRunId });
      return;
    }
    const scenario = await getSimulationScenario({
      projectId,
      scenarioId: claimedRun.scenarioId,
    });
    const definition = scenario
      ? parseScenarioDefinition(scenario.definition)
      : null;
    if (!scenario || !definition) {
      throw new Error("Simulation scenario is missing or invalid.");
    }

    // The routing reader enforces the project ID at the ClickHouse boundary.
    // This worker never receives production tool credentials or an endpoint.
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- the routing wrapper preserves v3/v4 compatibility for a run persisted before its worker starts.
    const trace = await getTraceById({
      projectId,
      traceId: definition.sourceRunId,
      renderingProps: { truncated: true, shouldJsonParse: false },
    });
    if (!trace) throw new Error("Source run was not found in this project.");

    const latestRun = await getSimulationRun({ projectId, simulationRunId });
    if (latestRun?.cancelRequestedAt) {
      await cancelSimulationRun({ projectId, simulationRunId });
      return;
    }
    const baseline = await getAgentExecutionProjection({
      trace,
      useEventsTable: v4WritesToEventsTable(env),
    });
    const result = compileSimulationScenario({
      baseline,
      scenario: definition,
      seed: claimedRun.deterministicSeed,
    });
    await completeSimulationRun({
      projectId,
      simulationRunId,
      result,
      // An expected simulated failure remains a successful worker job. The
      // comparison retains the simulated execution status separately.
      status: "SUCCEEDED",
    });
  } catch (error) {
    await failSimulationRun({
      projectId,
      simulationRunId,
      error: error instanceof Error ? error.message : "Simulation failed.",
    });
    throw error;
  }
};
