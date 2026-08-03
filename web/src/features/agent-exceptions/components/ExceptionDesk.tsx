import type { ExecutionExceptionStatus } from "@langfuse/shared";
import {
  Check,
  CircleAlert,
  ExternalLink,
  GitPullRequestArrow,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Badge, type BadgeProps } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Textarea } from "@/src/components/ui/textarea";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { api } from "@/src/utils/api";
import { useRunProjection } from "../../agent-executions/components/RunProjectionContext";

const statusVariant: Record<ExecutionExceptionStatus, BadgeProps["variant"]> = {
  OPEN: "warning",
  APPROVED: "success",
  REJECTED: "error",
  ESCALATED: "secondary",
};

const severityVariant: Record<string, BadgeProps["variant"]> = {
  LOW: "secondary",
  MEDIUM: "outline",
  HIGH: "warning",
  CRITICAL: "error",
};

type Decision = "APPROVE" | "REJECT" | "ESCALATE";

const decisionPresentation: Record<
  Decision,
  {
    label: string;
    icon: typeof Check;
    variant: "default" | "destructive" | "outline";
  }
> = {
  APPROVE: {
    label: "Approve proposed action",
    icon: Check,
    variant: "default",
  },
  REJECT: { label: "Reject action", icon: X, variant: "destructive" },
  ESCALATE: {
    label: "Escalate to specialist",
    icon: GitPullRequestArrow,
    variant: "outline",
  },
};

export function ExceptionDesk() {
  const run = useRunProjection();
  const hasWriteAccess = useHasProjectAccess({
    projectId: run.projectId,
    scope: "project:update",
  });
  const capture = usePostHogClientCapture();
  const utils = api.useUtils();
  const exceptions = api.agentExceptions.listForRun.useQuery({
    projectId: run.projectId,
    runId: run.id,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const resolve = api.agentExceptions.resolve.useMutation({
    onSuccess: (resolved, variables) => {
      capture("agent_exception:resolved", {
        decision: variables.decision,
        severity: resolved.severity,
      });
      setSelectedId(resolved.id);
      setReason("");
      void utils.agentExceptions.listForRun.invalidate({
        projectId: run.projectId,
        runId: run.id,
      });
      toast.success(`Exception ${resolved.status.toLowerCase()}.`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (exceptions.isPending) return <ExceptionDeskSkeleton />;
  if (exceptions.isError) {
    return (
      <ExceptionDeskFrame>
        <EmptyState
          title="Exception evidence is unavailable"
          detail="The run remains available in the other workbench views. Retry after the project connection is restored."
        />
      </ExceptionDeskFrame>
    );
  }

  const records = exceptions.data;
  if (records.length === 0) {
    return (
      <ExceptionDeskFrame>
        <EmptyState
          title="No intervention is required"
          detail="This run has no recorded ambiguity, policy conflict, or blocked action."
        />
      </ExceptionDeskFrame>
    );
  }

  const selected =
    records.find((exception) => exception.id === selectedId) ?? records[0];

  return (
    <ExceptionDeskFrame>
      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(280px,0.7fr)_minmax(0,1.3fr)]">
        <nav
          aria-label="Run exceptions"
          className="space-y-2 overflow-auto pr-1 xl:max-h-[calc(100vh-18rem)]"
        >
          {records.map((exception) => (
            <button
              aria-current={selected.id === exception.id ? "true" : undefined}
              className="border-border-contrast bg-card hover:bg-accent focus-visible:ring-ring w-full rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
              key={exception.id}
              onClick={() => {
                setSelectedId(exception.id);
                setReason("");
              }}
              type="button"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="line-clamp-2 text-sm font-bold">
                  {exception.title}
                </span>
                <Badge variant={statusVariant[exception.status]}>
                  {exception.status.toLowerCase()}
                </Badge>
              </div>
              <div className="text-muted-foreground mt-2 flex flex-wrap gap-1.5 text-xs">
                <Badge variant={severityVariant[exception.severity]}>
                  {exception.severity.toLowerCase()}
                </Badge>
                <span>{exception.type.toLowerCase().replaceAll("_", " ")}</span>
              </div>
            </button>
          ))}
        </nav>
        <ExceptionDetail
          exception={selected}
          hasWriteAccess={hasWriteAccess}
          isResolving={resolve.isPending}
          onReasonChange={setReason}
          onResolve={(decision) => {
            if (
              (decision === "REJECT" || decision === "ESCALATE") &&
              reason.trim().length < 4
            ) {
              toast.error(
                "Provide an operator reason before rejecting or escalating.",
              );
              return;
            }
            resolve.mutate({
              projectId: run.projectId,
              exceptionId: selected.id,
              expectedVersion: selected.version,
              decision,
              ...(reason.trim() ? { resolutionReason: reason.trim() } : {}),
            });
          }}
          reason={reason}
        />
      </div>
    </ExceptionDeskFrame>
  );
}

function ExceptionDeskFrame({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="Exception Desk"
      className="bg-muted/10 min-h-0 flex-1 overflow-auto p-3 sm:p-4"
    >
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-primary size-4" />
              <h2 className="text-sm font-bold">Exception Desk</h2>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Review ambiguous or unsafe agent actions before a connected
              runtime consumes an operator decision.
            </p>
          </div>
          <Badge variant="outline">Audited control boundary</Badge>
        </header>
        {children}
      </div>
    </section>
  );
}

function ExceptionDetail({
  exception,
  hasWriteAccess,
  reason,
  onReasonChange,
  onResolve,
  isResolving,
}: {
  exception: {
    id: string;
    eventId: string | null;
    type: string;
    severity: string;
    status: ExecutionExceptionStatus;
    title: string;
    summary: string;
    proposedAction: string | null;
    evidence: unknown;
    sourceEventIds: string[];
    resolutionReason: string | null;
    resolvedAt: Date | null;
    resolvedByUserId: string | null;
    version: number;
  };
  hasWriteAccess: boolean;
  reason: string;
  onReasonChange: (value: string) => void;
  onResolve: (decision: Decision) => void;
  isResolving: boolean;
}) {
  const isOpen = exception.status === "OPEN";
  const evidenceEntries = asEvidenceEntries(exception.evidence);

  return (
    <Card className="min-w-0">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{exception.title}</CardTitle>
            <CardDescription className="mt-1">
              {exception.type.toLowerCase().replaceAll("_", " ")} · version{" "}
              {exception.version}
            </CardDescription>
          </div>
          <div className="flex gap-1.5">
            <Badge variant={severityVariant[exception.severity]}>
              {exception.severity.toLowerCase()}
            </Badge>
            <Badge variant={statusVariant[exception.status]}>
              {exception.status.toLowerCase()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <DetailSection label="Why the run stopped">
          <p className="text-sm leading-6">{exception.summary}</p>
        </DetailSection>
        {exception.proposedAction && (
          <DetailSection label="Proposed action">
            <p className="text-sm leading-6">{exception.proposedAction}</p>
          </DetailSection>
        )}
        {exception.sourceEventIds.length > 0 && (
          <DetailSection label="Affected execution evidence">
            <ul className="space-y-1.5">
              {exception.sourceEventIds.map((eventId) => (
                <li
                  className="text-muted-foreground flex items-center gap-1.5 text-sm"
                  key={eventId}
                >
                  <ExternalLink className="size-3.5" />
                  <code className="max-w-full truncate">{eventId}</code>
                </li>
              ))}
            </ul>
          </DetailSection>
        )}
        {evidenceEntries.length > 0 && (
          <DetailSection label="Trusted instrumentation evidence">
            <dl className="grid gap-2 sm:grid-cols-2">
              {evidenceEntries.map(([key, value]) => (
                <div className="bg-muted/50 rounded-md p-2.5" key={key}>
                  <dt className="text-muted-foreground text-xs font-medium">
                    {key.replaceAll("_", " ")}
                  </dt>
                  <dd className="mt-1 text-sm break-words">{value}</dd>
                </div>
              ))}
            </dl>
          </DetailSection>
        )}
        {isOpen ? (
          <ResolutionControls
            hasWriteAccess={hasWriteAccess}
            isResolving={isResolving}
            onReasonChange={onReasonChange}
            onResolve={onResolve}
            reason={reason}
          />
        ) : (
          <DetailSection label="Recorded operator decision">
            <p className="text-sm">
              {exception.status.toLowerCase()} by{" "}
              {exception.resolvedByUserId
                ? "an authorized operator"
                : "system policy"}
              {exception.resolvedAt
                ? ` on ${exception.resolvedAt.toLocaleString()}`
                : ""}
              .
            </p>
            {exception.resolutionReason && (
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                {exception.resolutionReason}
              </p>
            )}
          </DetailSection>
        )}
      </CardContent>
    </Card>
  );
}

function ResolutionControls({
  hasWriteAccess,
  reason,
  onReasonChange,
  onResolve,
  isResolving,
}: {
  hasWriteAccess: boolean;
  reason: string;
  onReasonChange: (value: string) => void;
  onResolve: (decision: Decision) => void;
  isResolving: boolean;
}) {
  return (
    <DetailSection label="Operator decision">
      {hasWriteAccess ? (
        <>
          <Textarea
            aria-label="Operator decision reason"
            className="min-h-20"
            maxLength={1_000}
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="Required for rejection or escalation. This is saved to the audit log."
            value={reason}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(decisionPresentation) as Decision[]).map(
              (decision) => {
                const presentation = decisionPresentation[decision];
                const Icon = presentation.icon;
                return (
                  <Button
                    key={decision}
                    loading={isResolving}
                    onClick={() => onResolve(decision)}
                    size="sm"
                    variant={presentation.variant}
                  >
                    <Icon className="mr-1.5 size-3.5" />
                    {presentation.label}
                  </Button>
                );
              },
            )}
          </div>
          <p className="text-muted-foreground mt-3 text-xs leading-5">
            This records an auditable decision only. A connected agent runtime
            must independently validate and consume it before any external
            action.
          </p>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          You can inspect this exception, but project update permission is
          required to record a decision.
        </p>
      )}
    </DetailSection>
  );
}

function DetailSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-bold">{label}</h3>
      {children}
    </section>
  );
}

function asEvidenceEntries(value: unknown): Array<[string, string]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).map(([key, entry]) => [
    key,
    entry === null ? "Not provided" : String(entry),
  ]);
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <Card>
      <CardContent className="flex min-h-56 flex-col items-center justify-center p-6 text-center">
        <CircleAlert className="text-muted-foreground size-7" />
        <h3 className="mt-3 text-sm font-bold">{title}</h3>
        <p className="text-muted-foreground mt-1 max-w-md text-sm leading-6">
          {detail}
        </p>
      </CardContent>
    </Card>
  );
}

function ExceptionDeskSkeleton() {
  return (
    <ExceptionDeskFrame>
      <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.7fr)_minmax(0,1.3fr)]">
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton className="h-24 rounded-lg" key={index} />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    </ExceptionDeskFrame>
  );
}
