import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildAgentBrainGraph,
  buildAgentCommunicationGraph,
  type AgentBrainNode,
  type AgentCommunicationNode,
  type AgentExecutionProjection,
} from "@langfuse/shared";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type NodeMouseHandler,
  type NodeTypes,
  type ReactFlowInstance,
} from "@xyflow/react";
import { Bot, BrainCircuit, LocateFixed, Search, Sparkles } from "lucide-react";
import { StringParam, useQueryParam } from "use-query-params";
import { useTheme } from "next-themes";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Skeleton } from "@/src/components/ui/skeleton";
import { cn } from "@/src/utils/tailwind";
import { useRunProjection } from "../components/RunProjectionContext";
import { useLiveRunStore } from "../live/LiveRunStoreProvider";
import { AgentBrainInspector } from "./AgentBrainInspector";
import { AgentBrainNode as AgentBrainNodeComponent } from "./AgentBrainNode";
import { AgentCommunicationNode as AgentCommunicationNodeComponent } from "./AgentCommunicationNode";
import {
  toAgentReactFlowModel,
  toBrainReactFlowModel,
} from "./toReactFlowModel";
import type {
  AgentCommunicationFlowEdge,
  MissionControlFlowEdge,
  MissionControlFlowNode,
} from "./types";

type BrainViewMode = "execution" | "agents";
type CanvasEdge = MissionControlFlowEdge | AgentCommunicationFlowEdge;
type CanvasModel = {
  nodes: MissionControlFlowNode[];
  edges: CanvasEdge[];
  tooLarge: boolean;
  nodeCount: number;
  edgeCount: number;
};

const nodeTypes = {
  brain: AgentBrainNodeComponent,
  agent: AgentCommunicationNodeComponent,
} satisfies NodeTypes;

function searchableNodeText(node: MissionControlFlowNode) {
  if (node.type === "agent") {
    return [
      node.data.communicationNode.agent.name,
      node.data.communicationNode.agent.key,
      node.data.communicationNode.status,
    ]
      .join(" ")
      .toLocaleLowerCase();
  }
  const brainNode = node.data.brainNode;
  return [
    brainNode.title,
    brainNode.kind,
    brainNode.reasoning,
    brainNode.promptSummary,
    brainNode.toolSelectionReason,
    brainNode.event.toolUsed,
    brainNode.agent.name,
    ...brainNode.rejectedAlternatives,
    ...brainNode.memoryUsed,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

function AgentBrainSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-8 w-36" />
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border">
        <Skeleton className="absolute top-10 left-1/2 h-36 w-72 -translate-x-1/2 rounded-xl" />
        <Skeleton className="absolute top-64 left-1/3 h-36 w-72 -translate-x-1/2 rounded-xl" />
        <Skeleton className="absolute top-64 left-2/3 h-36 w-72 -translate-x-1/2 rounded-xl" />
      </div>
    </div>
  );
}

export function AgentBrainView() {
  const projection = useRunProjection();
  const buffer = useLiveRunStore((state) => state.buffer);
  const { resolvedTheme } = useTheme();
  const [modeParam, setModeParam] = useQueryParam("brainMode", StringParam);
  const [selectedNodeParam, setSelectedNodeParam] = useQueryParam(
    "brainNode",
    StringParam,
  );
  const [observationParam, setObservationParam] = useQueryParam(
    "observation",
    StringParam,
  );
  const [search, setSearch] = useState("");
  const [model, setModel] = useState<CanvasModel | null>(null);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const [isRelayouting, setIsRelayouting] = useState(false);
  const [flowInstance, setFlowInstance] = useState<
    ReactFlowInstance<MissionControlFlowNode, CanvasEdge> | undefined
  >();
  const userMovedViewport = useRef(false);
  const mode: BrainViewMode = modeParam === "agents" ? "agents" : "execution";

  const liveProjection = useMemo<AgentExecutionProjection>(
    () => ({
      ...projection,
      status: buffer.status,
      endedAt: buffer.endedAt,
      latencySeconds: buffer.endedAt
        ? Math.max(
            0,
            (buffer.endedAt.getTime() - projection.startedAt.getTime()) / 1_000,
          )
        : null,
      events: buffer.events,
    }),
    [buffer.endedAt, buffer.events, buffer.status, projection],
  );
  const brainGraph = useMemo(
    () => buildAgentBrainGraph(liveProjection),
    [liveProjection],
  );
  const communicationGraph = useMemo(
    () => buildAgentCommunicationGraph(brainGraph),
    [brainGraph],
  );

  useEffect(() => {
    let cancelled = false;
    setIsRelayouting(true);
    setLayoutError(null);
    const build =
      mode === "execution"
        ? toBrainReactFlowModel(brainGraph)
        : toAgentReactFlowModel(communicationGraph);
    build
      .then((nextModel) => {
        if (cancelled) return;
        setModel(nextModel);
      })
      .catch(() => {
        if (!cancelled) {
          setLayoutError(
            "The execution graph could not be laid out. Raw trace evidence remains available in Trace inspector.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsRelayouting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [brainGraph, communicationGraph, mode]);

  useEffect(() => {
    if (!flowInstance || !model || userMovedViewport.current) return;
    flowInstance.fitView({
      padding: 0.18,
      maxZoom: 1,
      duration: 450,
    });
  }, [flowInstance, model]);

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const matchingIds = useMemo(
    () =>
      normalizedSearch && model
        ? model.nodes
            .filter((node) =>
              searchableNodeText(node).includes(normalizedSearch),
            )
            .map((node) => node.id)
        : [],
    [model, normalizedSearch],
  );
  const matchSet = useMemo(() => new Set(matchingIds), [matchingIds]);
  const selectedId =
    selectedNodeParam ??
    (mode === "execution" &&
    brainGraph.nodes.some((node) => node.id === observationParam)
      ? observationParam
      : null);

  const displayNodes = useMemo(
    () =>
      (model?.nodes ?? []).map((node): MissionControlFlowNode => {
        const shared = {
          ...node,
          selected: node.id === selectedId,
        };
        if (node.type === "agent") {
          return {
            ...shared,
            type: "agent",
            data: {
              ...node.data,
              searchMatch: matchSet.has(node.id),
              searchDimmed:
                normalizedSearch.length > 0 && !matchSet.has(node.id),
            },
          };
        }
        return {
          ...shared,
          type: "brain",
          data: {
            ...node.data,
            searchMatch: matchSet.has(node.id),
            searchDimmed: normalizedSearch.length > 0 && !matchSet.has(node.id),
          },
        };
      }),
    [matchSet, model?.nodes, normalizedSearch.length, selectedId],
  );

  const selectNode = useCallback(
    (node: MissionControlFlowNode) => {
      setSelectedNodeParam(node.id);
      if (node.type === "brain") setObservationParam(node.id);
    },
    [setObservationParam, setSelectedNodeParam],
  );

  const handleNodeClick: NodeMouseHandler<MissionControlFlowNode> = useCallback(
    (_event, node) => selectNode(node),
    [selectNode],
  );

  const locateNextMatch = useCallback(() => {
    if (!flowInstance || matchingIds.length === 0) return;
    const currentIndex = selectedId ? matchingIds.indexOf(selectedId) : -1;
    const targetId = matchingIds[(currentIndex + 1) % matchingIds.length];
    const target = displayNodes.find((node) => node.id === targetId);
    if (!target) return;
    selectNode(target);
    flowInstance.fitView({
      nodes: [target],
      padding: 1.4,
      maxZoom: 1.15,
      duration: 500,
    });
  }, [displayNodes, flowInstance, matchingIds, selectNode, selectedId]);

  const selectedBrainNode: AgentBrainNode | null =
    mode === "execution"
      ? (brainGraph.nodes.find((node) => node.id === selectedId) ?? null)
      : null;
  const selectedCommunicationNode: AgentCommunicationNode | null =
    mode === "agents"
      ? (communicationGraph.nodes.find((node) => node.id === selectedId) ??
        null)
      : null;

  const switchMode = (nextMode: BrainViewMode) => {
    userMovedViewport.current = false;
    setSelectedNodeParam(undefined);
    setModeParam(nextMode === "execution" ? undefined : nextMode);
  };

  const clearSelection = () => {
    setSelectedNodeParam(undefined);
    if (selectedBrainNode?.id === observationParam) {
      setObservationParam(undefined);
    }
  };

  if (!model && !layoutError) return <AgentBrainSkeleton />;

  return (
    <section
      className="bg-muted/10 relative flex min-h-0 flex-1 flex-col overflow-hidden"
      aria-label="Agent Brain execution graph"
    >
      <header className="bg-background/95 z-10 flex shrink-0 flex-col gap-3 border-b p-3 backdrop-blur sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300">
                <BrainCircuit className="size-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Agent Brain</h2>
                <p className="text-muted-foreground text-xs">
                  Evidence-backed execution causality
                </p>
              </div>
              <Badge variant="outline" className="gap-1">
                <Sparkles className="size-3" />
                {brainGraph.nodes.length} steps
              </Badge>
              <Badge variant="outline">
                {communicationGraph.nodes.length} agents
              </Badge>
              {isRelayouting && (
                <Badge variant="secondary" className="animate-pulse">
                  Updating map
                </Badge>
              )}
            </div>
          </div>
          <div className="bg-muted/50 inline-flex h-8 rounded-md border p-0.5">
            <button
              type="button"
              onClick={() => switchMode("execution")}
              aria-pressed={mode === "execution"}
              className={cn(
                "flex items-center gap-1.5 rounded-sm px-2.5 text-xs font-bold transition-all",
                mode === "execution"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <BrainCircuit className="size-3.5" />
              Execution
            </button>
            <button
              type="button"
              onClick={() => switchMode("agents")}
              aria-pressed={mode === "agents"}
              className={cn(
                "flex items-center gap-1.5 rounded-sm px-2.5 text-xs font-bold transition-all",
                mode === "agents"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Bot className="size-3.5" />
              Agent map
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-2 left-2.5 size-4" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") locateNextMatch();
              }}
              placeholder={
                mode === "execution"
                  ? "Search goals, reasoning, tools, memories, agents…"
                  : "Search agents and execution status…"
              }
              aria-label="Search Agent Brain"
              className="pl-8"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={locateNextMatch}
            disabled={matchingIds.length === 0}
            className="gap-1.5"
          >
            <LocateFixed className="size-3.5" />
            {normalizedSearch
              ? `${matchingIds.length} match${matchingIds.length === 1 ? "" : "es"}`
              : "Locate"}
          </Button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="relative min-w-0 flex-1">
          {layoutError ? (
            <div className="flex h-full items-center justify-center p-6">
              <div className="max-w-md rounded-lg border bg-red-500/5 p-4 text-center">
                <p className="text-sm font-bold">Graph layout unavailable</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {layoutError}
                </p>
              </div>
            </div>
          ) : model?.tooLarge ? (
            <div className="flex h-full items-center justify-center p-6">
              <div className="max-w-md rounded-lg border bg-amber-500/5 p-4 text-center">
                <p className="text-sm font-bold">
                  Execution graph exceeds the safe layout budget
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {model.nodeCount.toLocaleString()} nodes and{" "}
                  {model.edgeCount.toLocaleString()} dependencies would block
                  the browser. Use Agent map for the production-safe aggregate
                  or Trace inspector for raw evidence.
                </p>
                {mode === "execution" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => switchMode("agents")}
                  >
                    Open Agent map
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <ReactFlow<MissionControlFlowNode, CanvasEdge>
              nodes={displayNodes}
              edges={model?.edges ?? []}
              nodeTypes={nodeTypes}
              onInit={setFlowInstance}
              onNodeClick={handleNodeClick}
              onPaneClick={clearSelection}
              onMoveStart={(event) => {
                if (event) userMovedViewport.current = true;
              }}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable
              fitView
              fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
              minZoom={0.12}
              maxZoom={1.8}
              onlyRenderVisibleElements
              colorMode={resolvedTheme === "dark" ? "dark" : "light"}
              proOptions={{ hideAttribution: true }}
              defaultEdgeOptions={{
                type: "smoothstep",
                interactionWidth: 18,
              }}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={18}
                size={1}
                className="opacity-60"
              />
              <MiniMap
                pannable
                zoomable
                position="bottom-right"
                className="bg-background/90! border! shadow-lg!"
                nodeColor={(node) =>
                  node.type === "agent" ? "rgb(168 85 247)" : "rgb(99 102 241)"
                }
                maskColor={
                  resolvedTheme === "dark"
                    ? "rgb(9 9 11 / 0.72)"
                    : "rgb(250 250 250 / 0.72)"
                }
              />
              <Controls
                showInteractive={false}
                position="bottom-left"
                className="bg-background/90! overflow-hidden! rounded-md! border! shadow-lg!"
                aria-label="Agent Brain viewport controls"
              />
            </ReactFlow>
          )}
        </div>

        <AgentBrainInspector
          brainNode={selectedBrainNode}
          communicationNode={selectedCommunicationNode}
          graph={brainGraph}
          onClose={clearSelection}
        />
      </div>
    </section>
  );
}
