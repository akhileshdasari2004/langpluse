import type { AgentExecutionProjection } from "@langfuse/shared";
import { TraceDetailBody } from "@/src/components/trace/TraceDetailBody";
import type { ComponentProps } from "react";
import {
  Activity,
  BrainCircuit,
  Database,
  GitBranch,
  Workflow,
} from "lucide-react";
import { StringParam, useQueryParam } from "use-query-params";
import {
  TabsBar,
  TabsBarContent,
  TabsBarList,
  TabsBarTrigger,
} from "@/src/components/ui/tabs-bar";
import {
  RunProjectionProvider,
  useRunProjection,
} from "./RunProjectionContext";
import { RunWorkbenchHeader } from "./RunWorkbenchHeader";
import { LiveExecutionConsole } from "./LiveExecutionConsole";
import { LiveRunStoreProvider } from "../live/LiveRunStoreProvider";
import { useRunEventStream } from "../live/useRunEventStream";
import { AgentBrainView } from "../brain/AgentBrainView";
import { MemoryExplorer } from "../memory/MemoryExplorer";
import { DecisionExplorer } from "../decisions/DecisionExplorer";

type Trace = NonNullable<ComponentProps<typeof TraceDetailBody>["trace"]>;

export function RunWorkbench({
  projection,
  trace,
  context,
}: {
  projection: AgentExecutionProjection;
  trace: Trace;
  context: ComponentProps<typeof TraceDetailBody>["context"];
}) {
  return (
    <RunProjectionProvider projection={projection}>
      <LiveRunStoreProvider projection={projection}>
        <RunWorkbenchContent trace={trace} context={context} />
      </LiveRunStoreProvider>
    </RunProjectionProvider>
  );
}

function RunWorkbenchContent({
  trace,
  context,
}: {
  trace: Trace;
  context: ComponentProps<typeof TraceDetailBody>["context"];
}) {
  const [runViewParam, setRunViewParam] = useQueryParam("runView", StringParam);
  const projection = useRunProjection();
  const activeView =
    runViewParam === "trace" ||
    runViewParam === "brain" ||
    runViewParam === "memory" ||
    runViewParam === "decisions"
      ? runViewParam
      : "live";
  const isSeededDemo = projection.events.some(
    (event) => event.metadata.scenario === "sales-email-agent",
  );

  useRunEventStream({
    projectId: projection.projectId,
    runId: projection.id,
    timestamp: projection.startedAt,
    demo: isSeededDemo,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <RunWorkbenchHeader />
      <TabsBar
        value={activeView}
        onValueChange={(value) => {
          setRunViewParam(value === "live" ? undefined : value);
        }}
        className="min-h-0 flex-1"
      >
        <TabsBarList className="bg-background shrink-0 px-3">
          <TabsBarTrigger value="live" className="gap-1.5">
            <Activity className="size-3.5" />
            Live timeline
          </TabsBarTrigger>
          <TabsBarTrigger value="brain" className="gap-1.5">
            <BrainCircuit className="size-3.5" />
            Agent Brain
          </TabsBarTrigger>
          <TabsBarTrigger value="memory" className="gap-1.5">
            <Database className="size-3.5" />
            Memory
          </TabsBarTrigger>
          <TabsBarTrigger value="decisions" className="gap-1.5">
            <GitBranch className="size-3.5" />
            Decisions
          </TabsBarTrigger>
          <TabsBarTrigger value="trace" className="gap-1.5">
            <Workflow className="size-3.5" />
            Trace inspector
          </TabsBarTrigger>
        </TabsBarList>
        <TabsBarContent
          value="live"
          className="mt-0 flex min-h-0 flex-1 overflow-hidden"
        >
          <LiveExecutionConsole />
        </TabsBarContent>
        <TabsBarContent
          value="brain"
          className="mt-0 flex min-h-0 flex-1 overflow-hidden"
        >
          <AgentBrainView />
        </TabsBarContent>
        <TabsBarContent
          value="memory"
          className="mt-0 flex min-h-0 flex-1 overflow-hidden"
        >
          <MemoryExplorer
            projectId={trace.projectId}
            traceId={trace.id}
            observations={trace.observations}
          />
        </TabsBarContent>
        <TabsBarContent
          value="decisions"
          className="mt-0 flex min-h-0 flex-1 overflow-hidden"
        >
          <DecisionExplorer />
        </TabsBarContent>
        <TabsBarContent
          value="trace"
          className="mt-0 min-h-0 flex-1 overflow-hidden"
        >
          <TraceDetailBody trace={trace} context={context} />
        </TabsBarContent>
      </TabsBar>
    </div>
  );
}
