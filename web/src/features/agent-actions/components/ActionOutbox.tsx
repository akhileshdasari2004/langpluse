import { Send } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { api } from "@/src/utils/api";
import { useRunProjection } from "../../agent-executions/components/RunProjectionContext";

export function ActionOutbox() {
  const run = useRunProjection();
  const utils = api.useUtils();
  const query = api.agentActions.listForRun.useQuery({
    projectId: run.projectId,
    runId: run.id,
  });
  const approve = api.agentActions.approve.useMutation({
    onSuccess: () =>
      utils.agentActions.listForRun.invalidate({
        projectId: run.projectId,
        runId: run.id,
      }),
  });
  return (
    <section className="bg-muted/10 min-h-0 flex-1 overflow-auto p-4">
      <div className="mx-auto max-w-5xl space-y-3">
        <h2 className="text-sm font-bold">Action outbox</h2>
        {query.data?.map((action) => (
          <article key={action.id} className="bg-card rounded-lg border p-4">
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-bold">
                  {action.actionType.replaceAll("_", " ")}
                </p>
                <p className="text-muted-foreground font-mono text-xs">
                  {action.idempotencyKey}
                </p>
              </div>
              <Badge variant="warning">{action.status}</Badge>
            </div>
            {action.status === "BLOCKED" && (
              <Button
                className="mt-3"
                onClick={() =>
                  approve.mutate({
                    projectId: run.projectId,
                    actionId: action.id,
                    expectedVersion: action.version,
                  })
                }
              >
                <Send className="mr-2 size-3.5" />
                Approve and queue
              </Button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
