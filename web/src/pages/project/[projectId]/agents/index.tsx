import Link from "next/link";
import { useRouter } from "next/router";
import Page from "@/src/components/layouts/page";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";
import { api } from "@/src/utils/api";

export default function Agents() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const agents = api.agentExecutions.listAgents.useQuery(
    { projectId },
    { enabled: !!projectId },
  );

  return (
    <Page headerProps={{ title: "Agents" }} scrollable>
      <div className="p-3">
        {agents.isLoading ? (
          <div className="text-muted-foreground p-3 text-sm">
            Loading agents...
          </div>
        ) : agents.isError ? (
          <div className="text-destructive p-3 text-sm">
            Agents could not be loaded.
          </div>
        ) : agents.data?.length === 0 ? (
          <div className="rounded-md border p-6">
            <h2 className="font-bold">No registered agents yet</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Agents appear here when their stable identity is registered from
              execution metadata.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Last seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.data?.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell density="comfortable">
                      <Link
                        className="font-bold hover:underline"
                        href={`/project/${projectId}/agents/${agent.id}`}
                      >
                        {agent.name}
                      </Link>
                      <div className="text-muted-foreground font-mono text-xs">
                        {agent.stableKey}
                      </div>
                    </TableCell>
                    <TableCell density="comfortable">
                      {agent.version ? (
                        <Badge variant="outline">{agent.version}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell density="comfortable">
                      {agent.owner ?? "—"}
                    </TableCell>
                    <TableCell density="comfortable">
                      {agent.team ?? "—"}
                    </TableCell>
                    <TableCell density="comfortable">
                      {agent.lastSeenAt?.toLocaleString() ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Page>
  );
}
