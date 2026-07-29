import { memo } from "react";
import { Bot, CheckCircle2, CircleDot, CircleX, Clock3 } from "lucide-react";
import { Handle, type NodeProps, Position } from "@xyflow/react";
import { Badge, type BadgeProps } from "@/src/components/ui/badge";
import { cn } from "@/src/utils/tailwind";
import { formatIntervalSeconds } from "@/src/utils/dates";
import type { AgentFlowNode } from "./types";

const statusVariant: Record<
  AgentFlowNode["data"]["communicationNode"]["status"],
  BadgeProps["variant"]
> = {
  RUNNING: "warning",
  SUCCEEDED: "success",
  FAILED: "error",
  UNKNOWN: "secondary",
};

const statusIcon = {
  RUNNING: CircleDot,
  SUCCEEDED: CheckCircle2,
  FAILED: CircleX,
  UNKNOWN: CircleDot,
} as const;

function AgentCommunicationNodeComponent({
  data,
  selected,
}: NodeProps<AgentFlowNode>) {
  const { communicationNode, searchMatch, searchDimmed } = data;
  const StatusIcon = statusIcon[communicationNode.status];

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="pointer-events-none! opacity-0"
      />
      <article
        className={cn(
          "bg-card/95 flex h-full w-full flex-col rounded-xl border-2 border-purple-500/50 p-4 shadow-lg backdrop-blur transition-[opacity,box-shadow,transform] duration-300",
          selected &&
            "ring-primary-accent shadow-primary-accent/20 scale-[1.02] ring-2 ring-offset-2",
          searchMatch && "ring-2 ring-amber-400 ring-offset-2",
          searchDimmed && "opacity-25",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300">
            <Bot className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className="truncate text-sm font-bold"
              title={communicationNode.agent.name}
            >
              {communicationNode.agent.name}
            </h3>
            <p
              className="text-muted-foreground truncate font-mono text-[10px]"
              title={communicationNode.agent.key}
            >
              {communicationNode.agent.key}
            </p>
          </div>
          <Badge
            variant={statusVariant[communicationNode.status]}
            className="gap-1"
          >
            <StatusIcon
              className={cn(
                "size-3",
                communicationNode.status === "RUNNING" && "animate-pulse",
              )}
            />
            {communicationNode.status}
          </Badge>
        </div>
        <div className="mt-auto grid grid-cols-3 gap-2 pt-3 text-center">
          <div>
            <p className="text-sm font-bold">{communicationNode.eventCount}</p>
            <p className="text-muted-foreground text-[10px]">events</p>
          </div>
          <div>
            <p className="text-sm font-bold">
              {Math.round(communicationNode.averageConfidence * 100)}%
            </p>
            <p className="text-muted-foreground text-[10px]">confidence</p>
          </div>
          <div>
            <p className="flex items-center justify-center gap-1 text-sm font-bold">
              <Clock3 className="size-3" />
              {formatIntervalSeconds(communicationNode.totalDurationSeconds, 1)}
            </p>
            <p className="text-muted-foreground text-[10px]">compute</p>
          </div>
        </div>
      </article>
      <Handle
        type="source"
        position={Position.Right}
        className="pointer-events-none! opacity-0"
      />
    </>
  );
}

export const AgentCommunicationNode = memo(AgentCommunicationNodeComponent);
