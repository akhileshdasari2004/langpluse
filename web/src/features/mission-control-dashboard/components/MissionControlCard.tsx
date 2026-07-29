import type { ReactNode } from "react";
import { AlertTriangle, Radio } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
import { cn } from "@/src/utils/tailwind";

export function MissionControlCard(props: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  isLoading?: boolean;
  isError?: boolean;
  live?: boolean;
  action?: ReactNode;
}) {
  return (
    <Card
      className={cn(
        "animate-in fade-in slide-in-from-bottom-1 flex h-full min-h-36 flex-col overflow-hidden duration-500 motion-reduce:animate-none",
        "hover:border-border-contrast transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0",
        props.className,
      )}
    >
      <CardHeader className="from-muted/45 flex-row items-start justify-between space-y-0 border-b bg-gradient-to-br to-transparent pb-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="flex items-center gap-2 text-sm tracking-normal">
            {props.title}
            {props.live ? (
              <span className="text-dark-green flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                </span>
                Live
              </span>
            ) : null}
          </CardTitle>
          <CardDescription className="line-clamp-2 text-xs">
            {props.description}
          </CardDescription>
        </div>
        {props.action}
      </CardHeader>
      <CardContent className={cn("min-h-0 flex-1 p-4", props.contentClassName)}>
        {props.isLoading ? (
          <DashboardCardSkeleton />
        ) : props.isError ? (
          <div
            className="text-muted-foreground flex h-full min-h-24 items-center justify-center gap-2 text-sm"
            role="alert"
          >
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Dashboard telemetry is temporarily unavailable.
          </div>
        ) : (
          props.children
        )}
      </CardContent>
    </Card>
  );
}

function DashboardCardSkeleton() {
  return (
    <div
      className="flex h-full min-h-24 flex-col justify-center gap-3"
      role="status"
      aria-label="Loading dashboard data"
    >
      <Skeleton className="h-8 w-2/5" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-3 w-3/5" />
    </div>
  );
}

export function SeededDataBadge() {
  return (
    <span
      className="text-muted-foreground flex shrink-0 items-center gap-1 text-[10px]"
      title="Data generated from the seeded Northstar Logistics renewal workflow"
    >
      <Radio className="h-3 w-3" />
      Seeded workflow
    </span>
  );
}
