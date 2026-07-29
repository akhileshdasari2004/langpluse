import { describe, expect, it } from "vitest";
import type { Session } from "next-auth";
import { resolveRunStreamAccess } from "./access";

const session = (options?: { projectId?: string; admin?: boolean }): Session =>
  ({
    expires: new Date(Date.now() + 60_000).toISOString(),
    user: {
      id: "user-1",
      name: "Morgan Lee",
      email: "morgan@example.com",
      admin: options?.admin ?? false,
      organizations: options?.projectId
        ? [
            {
              id: "org-1",
              name: "Acme",
              role: "OWNER",
              projects: [
                {
                  id: options.projectId,
                  name: "Production",
                  role: "MEMBER",
                  retentionDays: 30,
                  deletedAt: null,
                },
              ],
            },
          ]
        : [],
    },
  }) as Session;

describe("resolveRunStreamAccess", () => {
  it("rejects unauthenticated and cross-tenant requests", () => {
    expect(resolveRunStreamAccess(null, "project-1")).toEqual({
      kind: "unauthorized",
    });
    expect(
      resolveRunStreamAccess(
        session({ projectId: "another-project" }),
        "project-1",
      ),
    ).toEqual({ kind: "forbidden" });
  });

  it("returns the project role for an explicit membership", () => {
    expect(
      resolveRunStreamAccess(session({ projectId: "project-1" }), "project-1"),
    ).toEqual({
      kind: "member",
      role: "MEMBER",
      organizationId: "org-1",
    });
  });

  it("allows an administrator to proceed to the audited project lookup", () => {
    expect(
      resolveRunStreamAccess(session({ admin: true }), "project-1"),
    ).toEqual({ kind: "admin" });
  });
});
