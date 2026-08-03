import { TRPCError } from "@trpc/server";
import { AgentExecutionExceptionResolveSchema } from "@langfuse/shared";
import {
  listAgentExecutionExceptions,
  resolveAgentExecutionException,
} from "@langfuse/shared/src/server";
import { z } from "zod";
import { auditLog } from "@/src/features/audit-logs/auditLog";
import { throwIfNoProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import {
  createTRPCRouter,
  protectedProjectProcedure,
} from "@/src/server/api/trpc";

const listInput = z.object({
  projectId: z.string().min(1),
  runId: z.string().min(1).max(255),
});

export const agentExceptionsRouter = createTRPCRouter({
  listForRun: protectedProjectProcedure
    .input(listInput)
    .query(async ({ input, ctx }) => {
      throwIfNoProjectAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "project:read",
      });

      return listAgentExecutionExceptions({ ...input, db: ctx.prisma });
    }),

  resolve: protectedProjectProcedure
    .input(AgentExecutionExceptionResolveSchema)
    .mutation(async ({ input, ctx }) => {
      throwIfNoProjectAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "project:update",
      });

      const result = await resolveAgentExecutionException({
        input,
        actorUserId: ctx.session.user.id,
        db: ctx.prisma,
      });
      if (result.kind === "not_found") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Execution exception not found.",
        });
      }
      if (result.kind === "conflict") {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "This exception was already resolved or changed by another operator.",
        });
      }

      await auditLog({
        session: ctx.session,
        resourceType: "agentExecutionException",
        resourceId: result.after.id,
        action: input.decision.toLowerCase(),
        before: result.before,
        after: result.after,
      });

      return result.after;
    }),
});
