import { useRouter } from "next/router";
import Page from "@/src/components/layouts/page";
import { Badge } from "@/src/components/ui/badge";
import { ErrorPage } from "@/src/components/error-page";
import { api } from "@/src/utils/api";

export default function AgentDetail() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const agentId = router.query.agentId as string;
  const agent = api.agentExecutions.getAgent.useQuery(
    { projectId, agentId },
    { enabled: !!projectId && !!agentId, retry: false },
  );

  if (agent.isError) {
    return (
      <ErrorPage
        title="Agent not found"
        message="The agent does not exist or is not available in this project."
      />
    );
  }
  if (!agent.data) return <div className="p-3">Loading agent...</div>;

  return (
    <Page
      headerProps={{
        title: agent.data.name,
        breadcrumb: [{ name: "Agents", href: `/project/${projectId}/agents` }],
      }}
      scrollable
    >
      <div className="grid gap-3 p-3 lg:grid-cols-2">
        <section className="rounded-md border p-4">
          <h2 className="font-bold">Identity</h2>
          <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-2 text-sm">
            <dt className="text-muted-foreground">Stable key</dt>
            <dd className="font-mono">{agent.data.stableKey}</dd>
            <dt className="text-muted-foreground">Version</dt>
            <dd>
              {agent.data.version ? (
                <Badge variant="outline">{agent.data.version}</Badge>
              ) : (
                "—"
              )}
            </dd>
            <dt className="text-muted-foreground">Owner</dt>
            <dd>{agent.data.owner ?? "—"}</dd>
            <dt className="text-muted-foreground">Team</dt>
            <dd>{agent.data.team ?? "—"}</dd>
            <dt className="text-muted-foreground">Description</dt>
            <dd>{agent.data.description ?? "—"}</dd>
          </dl>
        </section>
        <section className="rounded-md border p-4">
          <h2 className="font-bold">Activity</h2>
          <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-2 text-sm">
            <dt className="text-muted-foreground">First seen</dt>
            <dd>{agent.data.firstSeenAt?.toLocaleString() ?? "—"}</dd>
            <dt className="text-muted-foreground">Last seen</dt>
            <dd>{agent.data.lastSeenAt?.toLocaleString() ?? "—"}</dd>
            <dt className="text-muted-foreground">Registered</dt>
            <dd>{agent.data.createdAt.toLocaleString()}</dd>
            <dt className="text-muted-foreground">Updated</dt>
            <dd>{agent.data.updatedAt.toLocaleString()}</dd>
          </dl>
        </section>
        <section className="rounded-md border p-4 lg:col-span-2">
          <h2 className="font-bold">Metadata</h2>
          <pre className="bg-muted mt-3 overflow-auto rounded-md p-3 text-xs">
            {JSON.stringify(agent.data.metadata ?? {}, null, 2)}
          </pre>
        </section>
      </div>
    </Page>
  );
}
