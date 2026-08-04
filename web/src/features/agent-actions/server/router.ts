import { TRPCError } from "@trpc/server";
import {
  approveAgentAction,
  listAgentActions,
} from "@langfuse/shared/src/server";
import { z } from "zod";
import { auditLog } from "@/src/features/audit-logs/auditLog";
import { throwIfNoProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import {
  createTRPCRouter,
  protectedProjectProcedure,
} from "@/src/server/api/trpc";

export const agentActionsRouter = createTRPCRouter({
  listForRun: protectedProjectProcedure
    .input(z.object({ projectId: z.string().min(1), runId: z.string().min(1) }))
    .query(({ input, ctx }) => {
      throwIfNoProjectAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "project:read",
      });
      return listAgentActions({ ...input, db: ctx.prisma });
    }),
  approve: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        actionId: z.string().min(1),
        expectedVersion: z.number().int().positive(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      throwIfNoProjectAccess({
        session: ctx.session,
        projectId: input.projectId,
        scope: "project:update",
      });
      const action = await approveAgentAction({
        ...input,
        userId: ctx.session.user.id,
        db: ctx.prisma,
      });
      if (!action)
        throw new TRPCError({
          code: "CONFLICT",
          message: "Action was already changed.",
        });
      await auditLog({
        session: ctx.session,
        resourceType: "agentAction",
        resourceId: action.id,
        action: "approve",
        after: action,
      });
      return action;
    }),
});
