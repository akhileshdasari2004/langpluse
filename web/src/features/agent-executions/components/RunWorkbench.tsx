import type { AgentExecutionProjection } from "@langfuse/shared";
import { TraceDetailBody } from "@/src/components/trace/TraceDetailBody";
import type { ComponentProps } from "react";
import { Activity, Workflow } from "lucide-react";
import { StringParam, useQueryParam } from "use-query-params";
import {
  TabsBar,
  TabsBarContent,
  TabsBarList,
  TabsBarTrigger,
} from "@/src/components/ui/tabs-bar";
import { RunProjectionProvider } from "./RunProjectionContext";
import { RunWorkbenchHeader } from "./RunWorkbenchHeader";
import { LiveExecutionConsole } from "./LiveExecutionConsole";
import { LiveRunStoreProvider } from "../live/LiveRunStoreProvider";

type Trace = ComponentProps<typeof TraceDetailBody>["trace"];

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
  const activeView = runViewParam === "trace" ? "trace" : "live";

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
          value="trace"
          className="mt-0 min-h-0 flex-1 overflow-hidden"
        >
          <TraceDetailBody trace={trace} context={context} />
        </TabsBarContent>
      </TabsBar>
    </div>
  );
}
