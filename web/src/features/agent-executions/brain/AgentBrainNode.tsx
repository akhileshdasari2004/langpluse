import { memo } from "react";
import type { AgentBrainNodeKind } from "@langfuse/shared";
import {
  BrainCircuit,
  CheckCircle2,
  CircleDot,
  CircleX,
  ClipboardCheck,
  Database,
  Flag,
  GitBranch,
  Hand,
  ListRestart,
  RefreshCcw,
  Route,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Handle, type NodeProps, Position } from "@xyflow/react";
import { Badge, type BadgeProps } from "@/src/components/ui/badge";
import { cn } from "@/src/utils/tailwind";
import { formatIntervalSeconds } from "@/src/utils/dates";
import type { BrainFlowNode } from "./types";

const nodePresentation: Record<
  AgentBrainNodeKind,
  {
    label: string;
    icon: typeof Flag;
    border: string;
    surface: string;
  }
> = {
  GOAL: {
    label: "Goal",
    icon: Flag,
    border: "border-blue-500/60",
    surface: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  PLAN: {
    label: "Plan",
    icon: Route,
    border: "border-violet-500/60",
    surface: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  UPDATED_PLAN: {
    label: "Updated plan",
    icon: ListRestart,
    border: "border-violet-500/60",
    surface: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  REASONING: {
    label: "Reasoning",
    icon: BrainCircuit,
    border: "border-purple-500/60",
    surface: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  },
  DECISION: {
    label: "Decision",
    icon: GitBranch,
    border: "border-pink-500/60",
    surface: "bg-pink-500/10 text-pink-700 dark:text-pink-300",
  },
  TOOL: {
    label: "Selected tool",
    icon: Wrench,
    border: "border-blue-500/60",
    surface: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  OBSERVATION: {
    label: "Observation",
    icon: Sparkles,
    border: "border-teal-500/60",
    surface: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  },
  MEMORY: {
    label: "Memory",
    icon: Database,
    border: "border-purple-500/60",
    surface: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  },
  RETRY: {
    label: "Retry",
    icon: RefreshCcw,
    border: "border-orange-500/60",
    surface: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  APPROVAL: {
    label: "Approval",
    icon: Hand,
    border: "border-amber-500/60",
    surface: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  HANDOFF: {
    label: "Handoff",
    icon: ClipboardCheck,
    border: "border-teal-500/60",
    surface: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  },
  ERROR: {
    label: "Error",
    icon: CircleX,
    border: "border-red-500/60",
    surface: "bg-red-500/10 text-red-700 dark:text-red-300",
  },
  COMPLETION: {
    label: "Completion",
    icon: CheckCircle2,
    border: "border-emerald-500/60",
    surface: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
};

const statusVariant: Record<
  BrainFlowNode["data"]["brainNode"]["event"]["status"],
  BadgeProps["variant"]
> = {
  RUNNING: "warning",
  COMPLETED: "success",
  FAILED: "error",
  WAITING_APPROVAL: "warning",
};

function AgentBrainNodeComponent({ data, selected }: NodeProps<BrainFlowNode>) {
  const { brainNode, searchMatch, searchDimmed, replayActive } = data;
  const presentation = nodePresentation[brainNode.kind];
  const Icon = presentation.icon;
  const duration =
    brainNode.executionDurationSeconds === null
      ? "Running"
      : formatIntervalSeconds(brainNode.executionDurationSeconds, 2);

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
          presentation.border,
          selected &&
            "ring-primary-accent shadow-primary-accent/20 scale-[1.02] ring-2 ring-offset-2",
          searchMatch && "ring-2 ring-amber-400 ring-offset-2",
          searchDimmed && "opacity-25",
          replayActive && "ring-2 ring-emerald-400 ring-offset-2",
          brainNode.event.status === "RUNNING" &&
            "shadow-[0_0_24px_hsl(var(--primary-accent)/0.24)]",
        )}
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              presentation.surface,
            )}
          >
            <Icon
              className={cn(
                "size-4",
                (brainNode.event.status === "RUNNING" ||
                  brainNode.kind === "RETRY") &&
                  "animate-pulse",
              )}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={presentation.surface}>
                {presentation.label}
              </Badge>
              <Badge variant={statusVariant[brainNode.event.status]}>
                {brainNode.event.status.replaceAll("_", " ")}
              </Badge>
            </div>
            <h3
              className="mt-1.5 truncate text-sm font-bold"
              title={brainNode.title}
            >
              {brainNode.title}
            </h3>
          </div>
        </div>

        <p className="text-muted-foreground mt-2 line-clamp-2 min-h-8 text-xs leading-relaxed">
          {brainNode.reasoning ??
            brainNode.promptSummary ??
            "No private reasoning was emitted for this execution step."}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2 font-mono text-[10px]">
          <span
            className="text-muted-foreground truncate"
            title={brainNode.agent.name}
          >
            {brainNode.agent.name}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span>{Math.round(brainNode.event.confidence * 100)}%</span>
            <span>{duration}</span>
            <CircleDot className="size-2.5 opacity-50" />
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

export const AgentBrainNode = memo(AgentBrainNodeComponent);
