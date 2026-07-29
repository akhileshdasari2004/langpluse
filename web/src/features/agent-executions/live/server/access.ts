import type { Role } from "@langfuse/shared/src/db";
import type { Session } from "next-auth";

export type RunStreamAccess =
  | { kind: "member"; role: Role; organizationId: string }
  | { kind: "admin" }
  | { kind: "unauthorized" }
  | { kind: "forbidden" };

export function resolveRunStreamAccess(
  session: Session | null,
  projectId: string,
): RunStreamAccess {
  if (!session?.user) return { kind: "unauthorized" };

  const membership = session.user.organizations
    .flatMap((organization) =>
      organization.projects.map((project) => ({
        organizationId: organization.id,
        project,
      })),
    )
    .find(({ project }) => project.id === projectId);

  if (membership) {
    return {
      kind: "member",
      role: membership.project.role,
      organizationId: membership.organizationId,
    };
  }

  return session.user.admin === true
    ? { kind: "admin" }
    : { kind: "forbidden" };
}
