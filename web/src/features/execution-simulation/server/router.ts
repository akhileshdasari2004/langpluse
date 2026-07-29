import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import {
  createSimulationRun,
  createSimulationScenario,
  ExecutionSimulationQueue,
  getSimulationRun,
  getSimulationScenario,
  getTraceById,
  listSimulationRuns,
  listSimulationScenarios,
  parseSimulationResult,
  QueueJobs,
  requestSimulationRunCancellation,
} from "@langfuse/shared/src/server";
import { SimulationScenarioDefinitionSchema } from "@langfuse/shared";
import { z } from "zod";
import { auditLog } from "@/src/features/audit-logs/auditLog";
import { throwIfNoProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import {
  createTRPCRouter,
  protectedProjectProcedure,
} from "@/src/server/api/trpc";

const projectInput = z.object({ projectId: z.string().min(1) });

function serializeRun(run: Awaited<ReturnType<typeof getSimulationRun>>) {
  if (!run) return null;
  return { ...run, result: parseSimulationResult(run.result) };
}

export const executionSimulationRouter = createTRPCRouter({
  listScenarios: protectedProjectProcedure
    .input(
      projectInput.extend({
        sourceRunId: z.string().min(1).optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ input, ctx }) => {
      throwIfNoProjectAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "project:read",
      });
      return listSimulationScenarios(input);
    }),

  getRun: protectedProjectProcedure
    .input(projectInput.extend({ simulationRunId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      throwIfNoProjectAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "project:read",
      });
      const run = await getSimulationRun(input);
      if (!run) throw new TRPCError({ code: "NOT_FOUND" });
      return serializeRun(run);
    }),

  listRuns: protectedProjectProcedure
    .input(
      projectInput.extend({
        scenarioId: z.string().min(1).optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ input, ctx }) => {
      throwIfNoProjectAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "project:read",
      });
      const runs = await listSimulationRuns(input);
      return runs.map((run) => ({
        ...run,
        result: parseSimulationResult(run.result),
      }));
    }),

  createScenario: protectedProjectProcedure
    .input(
      projectInput.extend({
        name: z.string().trim().min(1).max(120),
        definition: SimulationScenarioDefinitionSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      throwIfNoProjectAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "project:update",
      });
      // Resolve the source under the requested project before persisting the
      // scenario. This prevents an arbitrary trace ID from becoming a queued
      // cross-project probe and keeps the worker input tenant-bound.
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- the routing reader is the compatibility boundary for legacy and v4 trace storage.
      const sourceRun = await getTraceById({
        projectId: input.projectId,
        traceId: input.definition.sourceRunId,
        renderingProps: { truncated: true, shouldJsonParse: false },
      });
      if (!sourceRun) throw new TRPCError({ code: "NOT_FOUND" });
      const scenario = await createSimulationScenario({
        projectId: input.projectId,
        name: input.name,
        definition: input.definition,
        actorUserId: ctx.session.user.id,
      });
      await auditLog({
        session: ctx.session,
        resourceType: "simulationScenario",
        resourceId: scenario.id,
        action: "create",
        after: scenario,
      });
      return scenario;
    }),

  start: protectedProjectProcedure
    .input(projectInput.extend({ scenarioId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      throwIfNoProjectAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "project:update",
      });
      const scenario = await getSimulationScenario({
        projectId: input.projectId,
        scenarioId: input.scenarioId,
      });
      if (!scenario) throw new TRPCError({ code: "NOT_FOUND" });
      const queue = ExecutionSimulationQueue.getInstance();
      if (!queue) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Simulation queue is unavailable.",
        });
      }
      const definition = SimulationScenarioDefinitionSchema.parse(
        scenario.definition,
      );
      const differentModel = definition.conditions.find(
        (condition) => condition.type === "DIFFERENT_MODEL",
      )?.model;
      const run = await createSimulationRun({
        projectId: input.projectId,
        scenarioId: scenario.id,
        deterministicSeed: randomUUID(),
        model: differentModel ?? null,
        actorUserId: ctx.session.user.id,
      });
      await queue.add(
        QueueJobs.ExecutionSimulationJob,
        {
          id: run.id,
          timestamp: new Date(),
          name: QueueJobs.ExecutionSimulationJob,
          payload: { projectId: input.projectId, simulationRunId: run.id },
        },
        { jobId: run.id },
      );
      await auditLog({
        session: ctx.session,
        resourceType: "simulationRun",
        resourceId: run.id,
        action: "start",
        after: { id: run.id, scenarioId: run.scenarioId, status: run.status },
      });
      return run;
    }),

  cancel: protectedProjectProcedure
    .input(projectInput.extend({ simulationRunId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      throwIfNoProjectAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "project:update",
      });
      const run = await requestSimulationRunCancellation(input);
      if (!run) throw new TRPCError({ code: "NOT_FOUND" });
      await auditLog({
        session: ctx.session,
        resourceType: "simulationRun",
        resourceId: run.id,
        action: "cancel_requested",
        before: { status: run.status },
        after: { cancelRequestedAt: run.cancelRequestedAt },
      });
      return run;
    }),
});
