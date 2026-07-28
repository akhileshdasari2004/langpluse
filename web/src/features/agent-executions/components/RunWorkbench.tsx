import type { AgentExecutionProjection } from "@langfuse/shared";
import { TraceDetailBody } from "@/src/components/trace/TraceDetailBody";
import type { ComponentProps } from "react";
import {
  RunProjectionProvider,
  useRunProjection,
} from "./RunProjectionContext";
import { RunWorkbenchHeader } from "./RunWorkbenchHeader";

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
      <RunWorkbenchContent trace={trace} context={context} />
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
  useRunProjection();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <RunWorkbenchHeader />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <TraceDetailBody trace={trace} context={context} />
      </div>
    </div>
  );
}
