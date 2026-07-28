import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getAgentExecutionProjection,
  getAgentRegistryEntry,
  getTracesTable,
  listAgentRegistryEntries,
  upsertAgentRegistryEntry,
} from "@langfuse/shared/src/server";
import { AgentRegistryUpsertSchema } from "@langfuse/shared";
import { env } from "@langfuse/shared/src/env";
import {
  createTRPCRouter,
  protectedGetTraceProcedure,
  protectedProjectProcedure,
} from "@/src/server/api/trpc";
import { throwIfNoProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { auditLog } from "@/src/features/audit-logs/auditLog";

const projectInput = z.object({ projectId: z.string().min(1) });

export const agentExecutionsRouter = createTRPCRouter({
  getRun: protectedGetTraceProcedure
    .input(
      projectInput.extend({
        traceId: z.string().min(1),
        timestamp: z.date().nullish(),
        fromTimestamp: z.date().nullish(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const session = ctx.session;
      if (!session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const projectRole = session.user.organizations
        .flatMap((organization) => organization.projects)
        .find((project) => project.id === input.projectId)?.role;
      if (!projectRole && session.user.admin !== true) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      throwIfNoProjectAccess({
        role: projectRole ?? "OWNER",
        admin: session.user.admin,
        scope: "project:read",
      });

      if (!ctx.trace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Run not found" });
      }

      return getAgentExecutionProjection({
        trace: ctx.trace,
        useEventsTable:
          env.LANGFUSE_MIGRATION_V4_WRITE_MODE === "events_only" ||
          session.user.v4BetaEnabled === true,
      });
    }),

  listRuns: protectedProjectProcedure
    .input(
      projectInput.extend({
        limit: z.number().int().min(1).max(100).default(50),
        page: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ input, ctx }) => {
      throwIfNoProjectAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "project:read",
      });

      return getTracesTable({
        projectId: input.projectId,
        filter: [],
        orderBy: { column: "timestamp", order: "DESC" },
        limit: input.limit,
        page: input.page,
      });
    }),

  listAgents: protectedProjectProcedure
    .input(
      projectInput.extend({
        limit: z.number().int().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      throwIfNoProjectAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "project:read",
      });

      return listAgentRegistryEntries(input);
    }),

  getAgent: protectedProjectProcedure
    .input(projectInput.extend({ agentId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      throwIfNoProjectAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "project:read",
      });

      const agent = await getAgentRegistryEntry(input);
      if (!agent) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }
      return agent;
    }),

  upsertAgentMetadata: protectedProjectProcedure
    .input(AgentRegistryUpsertSchema)
    .mutation(async ({ input, ctx }) => {
      throwIfNoProjectAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "project:update",
      });

      const before = await ctx.prisma.agent.findUnique({
        where: {
          projectId_stableKey: {
            projectId: input.projectId,
            stableKey: input.stableKey,
          },
        },
      });
      const agent = await upsertAgentRegistryEntry({
        input,
        actorUserId: ctx.session.user.id,
        db: ctx.prisma,
      });

      await auditLog({
        session: ctx.session,
        resourceType: "agent",
        resourceId: agent.id,
        action: before ? "update" : "create",
        before,
        after: agent,
      });

      return agent;
    }),
});
