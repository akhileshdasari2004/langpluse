import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type {
  AgentDecisionAlternative,
  AgentDecisionEvidence,
} from "@langfuse/shared";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import { CheckCircle2, CircleX, GitBranch, ShieldAlert } from "lucide-react";
import { useTheme } from "next-themes";
import { Badge } from "@/src/components/ui/badge";
import { Skeleton } from "@/src/components/ui/skeleton";
import { computeGraphLayout } from "@/src/features/trace-graph-view/layout/elkLayout";
import type { GraphCanvasData } from "@/src/features/trace-graph-view/types";
import { cn } from "@/src/utils/tailwind";
import { riskPresentation } from "./model";

const DECISION_NODE_WIDTH = 282;
const DECISION_NODE_HEIGHT = 126;
const ALTERNATIVE_NODE_WIDTH = 256;
const ALTERNATIVE_NODE_HEIGHT = 142;

type DecisionFlowNodeData = {
  kind: "decision" | "alternative";
  decision: AgentDecisionEvidence;
  alternative: AgentDecisionAlternative | null;
  searchMatch: boolean;
  searchDimmed: boolean;
};

type DecisionFlowNode = Node<DecisionFlowNodeData, "decision-tree">;
type DecisionFlowEdge = Edge<
  { disposition: "SELECTED" | "REJECTED" },
  "smoothstep"
>;

type DecisionTreeModel = {
  nodes: DecisionFlowNode[];
  edges: DecisionFlowEdge[];
  tooLarge: boolean;
  nodeCount: number;
  edgeCount: number;
};

function DecisionTreeNode({ data, selected }: NodeProps<DecisionFlowNode>) {
  const alternative = data.alternative;
  const isSelectedPath = alternative?.disposition === "SELECTED";
  const Icon = alternative
    ? isSelectedPath
      ? CheckCircle2
      : CircleX
    : GitBranch;
  const title = alternative?.title ?? data.decision.eventName;
  const summary = alternative?.reason ?? data.decision.reason;

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="pointer-events-none! size-2! border-0! opacity-0"
      />
      <article
        className={cn(
          "bg-card/95 flex h-full w-full flex-col overflow-hidden rounded-xl border-2 p-3 shadow-lg backdrop-blur transition-[opacity,box-shadow,transform] duration-300",
          alternative
            ? isSelectedPath
              ? "border-emerald-500/70 shadow-emerald-500/10"
              : "border-red-500/55 shadow-red-500/5"
            : "border-primary-accent/65",
          selected &&
            "ring-primary-accent shadow-primary-accent/20 scale-[1.02] ring-2 ring-offset-2",
          data.searchMatch && "ring-2 ring-amber-400 ring-offset-2",
          data.searchDimmed && "opacity-25",
          isSelectedPath && "shadow-primary-accent/20",
        )}
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              alternative
                ? isSelectedPath
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "bg-red-500/10 text-red-700 dark:text-red-300"
                : "bg-primary-accent/10 text-primary-accent",
            )}
          >
            <Icon className={cn("size-4", isSelectedPath && "animate-pulse")} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant={
                  alternative
                    ? isSelectedPath
                      ? "success"
                      : "error"
                    : "outline"
                }
              >
                {alternative ? alternative.disposition : "DECISION"}
              </Badge>
              <Badge
                variant="outline"
                className={riskPresentation(
                  alternative?.risk ?? data.decision.risk,
                )}
              >
                {(alternative?.risk ?? data.decision.risk).toLocaleLowerCase()}{" "}
                risk
              </Badge>
            </div>
            <h3 className="mt-1.5 truncate text-sm font-bold" title={title}>
              {title}
            </h3>
          </div>
        </div>
        <p className="text-muted-foreground mt-2 line-clamp-2 min-h-8 text-xs leading-relaxed">
          {summary ?? "No rationale was emitted for this recorded path."}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2 font-mono text-[10px]">
          <span
            className="text-muted-foreground truncate"
            title={data.decision.agent.name}
          >
            {data.decision.agent.name}
          </span>
          <span>
            {Math.round(
              (alternative?.confidence ?? data.decision.confidence) * 100,
            )}
            %
          </span>
        </div>
      </article>
      <Handle
        type="source"
        position={Position.Bottom}
        className="pointer-events-none! size-2! border-0! opacity-0"
      />
    </>
  );
}

const nodeTypes = {
  "decision-tree": memo(DecisionTreeNode),
} satisfies NodeTypes;

function searchableNodeText(node: DecisionFlowNode) {
  const alternative = node.data.alternative;
  return [
    node.data.decision.eventName,
    node.data.decision.selectedDecision,
    node.data.decision.reason,
    node.data.decision.agent.name,
    alternative?.title,
    alternative?.reason,
    alternative?.risk,
    alternative?.executionImpact,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

async function buildDecisionTreeModel(
  decisions: AgentDecisionEvidence[],
): Promise<DecisionTreeModel> {
  const canvas: GraphCanvasData = {
    nodes: decisions.flatMap((decision) => [
      {
        id: decision.id,
        label: decision.eventName,
        type: "DECISION",
        width: DECISION_NODE_WIDTH,
        height: DECISION_NODE_HEIGHT,
      },
      ...decision.alternatives.map((alternative) => ({
        id: alternative.id,
        label: alternative.title,
        type: "ALTERNATIVE",
        width: ALTERNATIVE_NODE_WIDTH,
        height: ALTERNATIVE_NODE_HEIGHT,
      })),
    ]),
    edges: decisions.flatMap((decision) =>
      decision.alternatives.map((alternative) => ({
        from: decision.id,
        to: alternative.id,
      })),
    ),
  };
  const layout = await computeGraphLayout(canvas, {}, "DOWN", false);
  const positions = new Map(layout.nodes.map((node) => [node.id, node]));
  const decisionsById = new Map(
    decisions.map((decision) => [decision.id, decision]),
  );
  const alternativesById = new Map(
    decisions.flatMap((decision) =>
      decision.alternatives.map(
        (alternative) => [alternative.id, alternative] as const,
      ),
    ),
  );

  return {
    nodes: canvas.nodes.flatMap((canvasNode): DecisionFlowNode[] => {
      const position = positions.get(canvasNode.id);
      if (!position) return [];
      const alternative = alternativesById.get(canvasNode.id) ?? null;
      const decision = alternative
        ? decisionsById.get(alternative.decisionId)
        : decisionsById.get(canvasNode.id);
      if (!decision) return [];
      return [
        {
          id: canvasNode.id,
          type: "decision-tree",
          position: { x: position.x, y: position.y },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
          data: {
            kind: alternative ? "alternative" : "decision",
            decision,
            alternative,
            searchMatch: false,
            searchDimmed: false,
          },
          style: {
            width: alternative ? ALTERNATIVE_NODE_WIDTH : DECISION_NODE_WIDTH,
            height: alternative
              ? ALTERNATIVE_NODE_HEIGHT
              : DECISION_NODE_HEIGHT,
          },
          draggable: false,
          connectable: false,
          selectable: true,
          focusable: true,
          ariaLabel: alternative
            ? `${alternative.disposition.toLocaleLowerCase()} alternative: ${alternative.title}`
            : `Decision: ${decision.eventName}`,
        },
      ];
    }),
    edges: decisions.flatMap((decision) =>
      decision.alternatives.map(
        (alternative): DecisionFlowEdge => ({
          id: `${decision.id}->${alternative.id}`,
          source: decision.id,
          target: alternative.id,
          type: "smoothstep",
          animated: alternative.disposition === "SELECTED",
          focusable: true,
          markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
          data: { disposition: alternative.disposition },
          className:
            alternative.disposition === "SELECTED"
              ? "mission-control-decision-selected-edge"
              : "mission-control-decision-rejected-edge",
          ariaLabel: `${alternative.disposition.toLocaleLowerCase()} path to ${alternative.title}`,
        }),
      ),
    ),
    tooLarge: Boolean(layout.tooLarge),
    nodeCount: layout.nodeCount ?? canvas.nodes.length,
    edgeCount: layout.edgeCount ?? canvas.edges.length,
  };
}

function DecisionTreeSkeleton() {
  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-lg border p-4">
      <Skeleton className="absolute top-8 left-1/2 h-28 w-72 -translate-x-1/2 rounded-xl" />
      <Skeleton className="absolute top-52 left-1/3 h-32 w-64 -translate-x-1/2 rounded-xl" />
      <Skeleton className="absolute top-52 left-2/3 h-32 w-64 -translate-x-1/2 rounded-xl" />
    </div>
  );
}

export function DecisionTree({
  decisions,
  selectedDecisionId,
  selectedAlternativeId,
  search,
  onSelectDecision,
  onSelectAlternative,
}: {
  decisions: AgentDecisionEvidence[];
  selectedDecisionId: string | null;
  selectedAlternativeId: string | null;
  search: string;
  onSelectDecision: (decision: AgentDecisionEvidence) => void;
  onSelectAlternative: (
    decision: AgentDecisionEvidence,
    alternative: AgentDecisionAlternative,
  ) => void;
}) {
  const { resolvedTheme } = useTheme();
  const [model, setModel] = useState<DecisionTreeModel | null>(null);
  const [layoutError, setLayoutError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLayoutError(null);
    buildDecisionTreeModel(decisions)
      .then((nextModel) => {
        if (!cancelled) setModel(nextModel);
      })
      .catch(() => {
        if (!cancelled) {
          setLayoutError(
            "The decision tree could not be laid out. Decision evidence remains available in the comparison panel.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [decisions]);

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const matchingIds = useMemo(
    () =>
      normalizedSearch
        ? (model?.nodes ?? [])
            .filter((node) =>
              searchableNodeText(node).includes(normalizedSearch),
            )
            .map((node) => node.id)
        : [],
    [model?.nodes, normalizedSearch],
  );
  const matches = useMemo(() => new Set(matchingIds), [matchingIds]);
  const displayNodes = useMemo(
    () =>
      (model?.nodes ?? []).map((node) => ({
        ...node,
        selected:
          node.id === selectedDecisionId || node.id === selectedAlternativeId,
        data: {
          ...node.data,
          searchMatch: matches.has(node.id),
          searchDimmed: normalizedSearch.length > 0 && !matches.has(node.id),
        },
      })),
    [
      matches,
      model?.nodes,
      normalizedSearch.length,
      selectedAlternativeId,
      selectedDecisionId,
    ],
  );
  const onNodeClick: NodeMouseHandler<DecisionFlowNode> = useCallback(
    (_event, node) => {
      if (node.data.alternative) {
        onSelectAlternative(node.data.decision, node.data.alternative);
      } else {
        onSelectDecision(node.data.decision);
      }
    },
    [onSelectAlternative, onSelectDecision],
  );

  if (!model && !layoutError) return <DecisionTreeSkeleton />;

  if (layoutError) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border p-6 text-center">
        <div className="max-w-md">
          <ShieldAlert className="mx-auto size-8 text-amber-600" />
          <h3 className="mt-2 text-sm font-bold">Decision tree unavailable</h3>
          <p className="text-muted-foreground mt-1 text-xs">{layoutError}</p>
        </div>
      </div>
    );
  }

  if (model?.tooLarge) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border p-6 text-center">
        <div className="max-w-md">
          <ShieldAlert className="mx-auto size-8 text-amber-600" />
          <h3 className="mt-2 text-sm font-bold">
            Decision tree exceeds the safe layout budget
          </h3>
          <p className="text-muted-foreground mt-1 text-xs">
            {model.nodeCount.toLocaleString()} nodes and{" "}
            {model.edgeCount.toLocaleString()} paths would block the browser.
            Use the decision list and comparison panel to inspect this run
            safely.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card relative min-h-[420px] flex-1 overflow-hidden rounded-lg border">
      <ReactFlow<DecisionFlowNode, DecisionFlowEdge>
        nodes={displayNodes}
        edges={model?.edges ?? []}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        nodesDraggable={false}
        nodesConnectable={false}
        fitView
        fitViewOptions={{ padding: 0.22, maxZoom: 1 }}
        minZoom={0.16}
        maxZoom={1.8}
        onlyRenderVisibleElements
        colorMode={resolvedTheme === "dark" ? "dark" : "light"}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: "smoothstep", interactionWidth: 18 }}
        aria-label="Decision branching tree"
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
          nodeColor={(node) => {
            const data = node.data as DecisionFlowNodeData;
            return data.alternative?.disposition === "SELECTED"
              ? "rgb(16 185 129)"
              : data.alternative?.disposition === "REJECTED"
                ? "rgb(239 68 68)"
                : "rgb(99 102 241)";
          }}
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
          aria-label="Decision tree viewport controls"
        />
      </ReactFlow>
    </div>
  );
}
