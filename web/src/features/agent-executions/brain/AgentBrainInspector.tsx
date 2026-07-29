import type {
  AgentBrainGraph,
  AgentBrainNode,
  AgentCommunicationNode,
} from "@langfuse/shared";
import {
  BrainCircuit,
  Clock3,
  Database,
  GitBranch,
  Network,
  Sparkles,
  Timer,
  Wrench,
  X,
} from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { JSONView } from "@/src/components/ui/CodeJsonViewer";
import { formatIntervalSeconds } from "@/src/utils/dates";

function EvidenceSection({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof BrainCircuit;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-bold tracking-wide uppercase">
        <Icon className="size-3.5" />
        {label}
      </h3>
      <div className="text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function EmptyEvidence({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground text-xs leading-relaxed">{children}</p>
  );
}

function BrainNodeInspector({
  node,
  graph,
}: {
  node: AgentBrainNode;
  graph: AgentBrainGraph;
}) {
  const nodeById = new Map(
    graph.nodes.map((candidate) => [candidate.id, candidate]),
  );
  const totalTokens = node.tokenUsage.total;

  return (
    <div className="space-y-5 p-4">
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline">{node.kind.replaceAll("_", " ")}</Badge>
        <Badge
          variant={
            node.event.status === "FAILED"
              ? "error"
              : node.event.status === "COMPLETED"
                ? "success"
                : "warning"
          }
        >
          {node.event.status.replaceAll("_", " ")}
        </Badge>
        <Badge variant="secondary">
          {Math.round(node.event.confidence * 100)}% confidence
        </Badge>
        <Badge variant="outline">{node.agent.name}</Badge>
      </div>

      <EvidenceSection icon={BrainCircuit} label="Reasoning">
        {node.reasoning ? (
          <p>{node.reasoning}</p>
        ) : (
          <EmptyEvidence>
            No reasoning summary was emitted. Mission Control does not infer
            private chain-of-thought.
          </EmptyEvidence>
        )}
      </EvidenceSection>

      <EvidenceSection icon={Sparkles} label="Prompt summary">
        {node.promptSummary ? (
          <p>{node.promptSummary}</p>
        ) : (
          <EmptyEvidence>
            This step did not emit a prompt summary.
          </EmptyEvidence>
        )}
      </EvidenceSection>

      <EvidenceSection icon={Wrench} label="Tool selection">
        {node.event.toolUsed || node.toolSelectionReason ? (
          <div className="space-y-1">
            {node.event.toolUsed && (
              <p className="font-mono text-xs">{node.event.toolUsed}</p>
            )}
            {node.toolSelectionReason && (
              <p className="text-muted-foreground text-xs">
                {node.toolSelectionReason}
              </p>
            )}
          </div>
        ) : (
          <EmptyEvidence>This step did not select a tool.</EmptyEvidence>
        )}
      </EvidenceSection>

      <EvidenceSection icon={GitBranch} label="Rejected alternatives">
        {node.rejectedAlternatives.length > 0 ? (
          <ul className="space-y-1.5">
            {node.rejectedAlternatives.map((alternative) => (
              <li key={alternative} className="flex gap-2 text-xs">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-red-500" />
                {alternative}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyEvidence>
            No rejected alternatives were instrumented for this step.
          </EmptyEvidence>
        )}
      </EvidenceSection>

      <EvidenceSection icon={Database} label="Memory used">
        {node.memoryUsed.length > 0 ? (
          <ul className="space-y-1.5">
            {node.memoryUsed.map((memory) => (
              <li key={memory} className="flex gap-2 text-xs">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-purple-500" />
                {memory}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyEvidence>
            No memory references were attached to this step.
          </EmptyEvidence>
        )}
      </EvidenceSection>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-muted/40 rounded-lg border p-3">
          <p className="text-muted-foreground flex items-center gap-1 text-[10px] uppercase">
            <Timer className="size-3" />
            Duration
          </p>
          <p className="mt-1 font-mono text-sm font-bold">
            {node.executionDurationSeconds === null
              ? "Running"
              : formatIntervalSeconds(node.executionDurationSeconds, 3)}
          </p>
        </div>
        <div className="bg-muted/40 rounded-lg border p-3">
          <p className="text-muted-foreground flex items-center gap-1 text-[10px] uppercase">
            <Clock3 className="size-3" />
            API latency
          </p>
          <p className="mt-1 font-mono text-sm font-bold">
            {node.event.apiLatencyMs === null
              ? "Not applicable"
              : `${Math.round(node.event.apiLatencyMs)} ms`}
          </p>
        </div>
        <div className="bg-muted/40 col-span-2 rounded-lg border p-3">
          <p className="text-muted-foreground text-[10px] uppercase">
            Token usage
          </p>
          <p className="mt-1 font-mono text-sm font-bold">
            {totalTokens === null
              ? "Not emitted"
              : `${totalTokens.toLocaleString()} total · ${(node.tokenUsage.input ?? 0).toLocaleString()} in · ${(node.tokenUsage.output ?? 0).toLocaleString()} out`}
          </p>
        </div>
      </div>

      <EvidenceSection icon={Network} label="Dependencies">
        {node.dependencyIds.length > 0 ? (
          <div className="space-y-1.5">
            {node.dependencyIds.map((dependencyId) => (
              <div
                key={dependencyId}
                className="bg-muted/40 flex items-center justify-between gap-2 rounded-md border px-2.5 py-2"
              >
                <span
                  className="min-w-0 truncate text-xs"
                  title={nodeById.get(dependencyId)?.title ?? dependencyId}
                >
                  {nodeById.get(dependencyId)?.title ?? dependencyId}
                </span>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {node.dependencyProvenance}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <EmptyEvidence>
            This is the root of the execution graph.
          </EmptyEvidence>
        )}
      </EvidenceSection>

      <JSONView
        title="Execution metadata"
        json={{
          eventId: node.event.id,
          sequence: node.sequence + 1,
          category: node.event.category,
          categoryProvenance: node.event.categoryProvenance,
          observationType: node.event.observationType,
          startedAt: node.event.startedAt,
          endedAt: node.event.endedAt,
          metadata: node.event.metadata,
        }}
        collapseStringsAfterLength={300}
      />
    </div>
  );
}

function CommunicationNodeInspector({
  node,
}: {
  node: AgentCommunicationNode;
}) {
  return (
    <div className="space-y-5 p-4">
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline">{node.agent.provenance} identity</Badge>
        <Badge variant="secondary">{node.eventCount} events</Badge>
        <Badge variant="secondary">
          {Math.round(node.averageConfidence * 100)}% confidence
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-muted/40 rounded-lg border p-3">
          <p className="text-muted-foreground text-[10px] uppercase">
            Execution time
          </p>
          <p className="mt-1 font-mono text-sm font-bold">
            {formatIntervalSeconds(node.totalDurationSeconds, 2)}
          </p>
        </div>
        <div className="bg-muted/40 rounded-lg border p-3">
          <p className="text-muted-foreground text-[10px] uppercase">Version</p>
          <p className="mt-1 font-mono text-sm font-bold">
            {node.agent.version ?? "Unversioned"}
          </p>
        </div>
      </div>
      <EvidenceSection icon={Network} label="Owned execution events">
        <div className="max-h-64 space-y-1 overflow-auto">
          {node.eventIds.map((eventId) => (
            <p
              key={eventId}
              className="bg-muted/40 truncate rounded border px-2 py-1.5 font-mono text-[11px]"
              title={eventId}
            >
              {eventId}
            </p>
          ))}
        </div>
      </EvidenceSection>
    </div>
  );
}

export function AgentBrainInspector({
  brainNode,
  communicationNode,
  graph,
  onClose,
}: {
  brainNode: AgentBrainNode | null;
  communicationNode: AgentCommunicationNode | null;
  graph: AgentBrainGraph;
  onClose: () => void;
}) {
  if (!brainNode && !communicationNode) return null;
  const title = brainNode?.title ?? communicationNode!.agent.name;
  const subtitle = brainNode
    ? `Step ${brainNode.sequence + 1} · ${brainNode.event.startedAt.toISOString()}`
    : communicationNode!.agent.key;

  return (
    <aside className="bg-background animate-in slide-in-from-right-4 absolute inset-y-0 right-0 z-30 flex w-full flex-col border-l shadow-2xl duration-300 sm:w-[390px] xl:relative xl:z-auto xl:w-[390px] xl:shrink-0 xl:shadow-none">
      <header className="flex items-start gap-3 border-b p-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold" title={title}>
            {title}
          </h2>
          <p
            className="text-muted-foreground mt-0.5 truncate font-mono text-[10px]"
            title={subtitle}
          >
            {subtitle}
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          aria-label="Close node inspector"
          className="size-7 shrink-0"
        >
          <X className="size-4" />
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        {brainNode ? (
          <BrainNodeInspector node={brainNode} graph={graph} />
        ) : (
          <CommunicationNodeInspector node={communicationNode!} />
        )}
      </div>
    </aside>
  );
}
