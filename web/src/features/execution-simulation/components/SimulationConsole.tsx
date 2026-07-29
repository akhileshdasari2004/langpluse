import { useState } from "react";
import type {
  CustomerReplyIntent,
  SimulationCondition,
  SimulationConditionType,
} from "@langfuse/shared";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  FlaskConical,
  LoaderCircle,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Skeleton } from "@/src/components/ui/skeleton";
import { api } from "@/src/utils/api";
import { cn } from "@/src/utils/tailwind";
import { formatIntervalSeconds } from "@/src/utils/dates";
import { useRunProjection } from "../../agent-executions/components/RunProjectionContext";

const conditions: Array<{
  type: SimulationConditionType;
  label: string;
  description: string;
}> = [
  {
    type: "CRM_OFFLINE",
    label: "CRM offline",
    description: "Authoritative account context is unavailable.",
  },
  {
    type: "SLACK_FAILURE",
    label: "Slack failure",
    description: "Internal delivery fails without customer impact.",
  },
  {
    type: "ERP_TIMEOUT",
    label: "ERP timeout",
    description: "Contract verification does not return in time.",
  },
  {
    type: "MEMORY_MISSING",
    label: "Memory missing",
    description: "Relevant account context is withheld.",
  },
  {
    type: "CUSTOMER_REPLY",
    label: "Customer reply",
    description: "A reply changes the next best action.",
  },
  {
    type: "TOOL_FAILURE",
    label: "Tool failure",
    description: "The first available tool returns an error.",
  },
  {
    type: "RATE_LIMIT",
    label: "Rate limit",
    description: "A provider returns 429 with no retry budget.",
  },
  {
    type: "DIFFERENT_MODEL",
    label: "Different model",
    description: "Re-evaluate the path under an alternative model policy.",
  },
];

function simulationStatusPresentation(status: string) {
  switch (status) {
    case "SUCCEEDED":
      return {
        icon: CheckCircle2,
        label: "Ready",
        className: "text-emerald-600",
      };
    case "FAILED":
      return { icon: XCircle, label: "Failed", className: "text-red-600" };
    case "CANCELLED":
      return {
        icon: XCircle,
        label: "Cancelled",
        className: "text-muted-foreground",
      };
    default:
      return {
        icon: LoaderCircle,
        label: status.toLocaleLowerCase(),
        className: "text-amber-600",
      };
  }
}

export function SimulationConsole() {
  const run = useRunProjection();
  const [selected, setSelected] = useState<SimulationCondition[]>([]);
  const [customerReplyIntent, setCustomerReplyIntent] =
    useState<CustomerReplyIntent>("NEGOTIATION");
  const [model, setModel] = useState("Claude 4.1 Opus");
  const utils = api.useUtils();
  const runs = api.executionSimulation.listRuns.useQuery(
    { projectId: run.projectId },
    {
      refetchInterval: (query) =>
        query.state.data?.some((item) =>
          ["QUEUED", "RUNNING"].includes(item.status),
        )
          ? 1_000
          : false,
    },
  );
  const createScenario = api.executionSimulation.createScenario.useMutation();
  const start = api.executionSimulation.start.useMutation({
    onSuccess: () =>
      utils.executionSimulation.listRuns.invalidate({
        projectId: run.projectId,
      }),
  });
  const cancel = api.executionSimulation.cancel.useMutation({
    onSuccess: () =>
      utils.executionSimulation.listRuns.invalidate({
        projectId: run.projectId,
      }),
  });
  const latest =
    runs.data?.find((item) => item.status === "SUCCEEDED") ?? runs.data?.[0];
  const isStarting = createScenario.isPending || start.isPending;

  const toggleCondition = (type: SimulationConditionType) => {
    setSelected((current) => {
      const existing = current.find((condition) => condition.type === type);
      if (existing)
        return current.filter((condition) => condition.type !== type);
      return [
        ...current,
        {
          type,
          ...(type === "CUSTOMER_REPLY" ? { customerReplyIntent } : {}),
          ...(type === "DIFFERENT_MODEL" ? { model } : {}),
        },
      ];
    });
  };

  const startSimulation = async () => {
    if (selected.length === 0) return;
    const normalizedConditions = selected.map((condition) => ({
      ...condition,
      ...(condition.type === "CUSTOMER_REPLY" ? { customerReplyIntent } : {}),
      ...(condition.type === "DIFFERENT_MODEL" ? { model } : {}),
    }));
    const scenario = await createScenario.mutateAsync({
      projectId: run.projectId,
      name: `${run.name} simulation`,
      definition: { sourceRunId: run.id, conditions: normalizedConditions },
    });
    await start.mutateAsync({
      projectId: run.projectId,
      scenarioId: scenario.id,
    });
  };

  return (
    <section
      className="bg-muted/10 min-h-0 flex-1 overflow-auto p-3 sm:p-4"
      aria-label="Execution simulation"
    >
      <div className="mx-auto grid max-w-7xl gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <div className="space-y-4">
          <header className="bg-card rounded-lg border p-4 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <FlaskConical className="text-primary-accent size-5" />
                  <h2 className="text-base font-bold tracking-tight">
                    Simulation lab
                  </h2>
                  <Badge variant="outline">Isolated</Badge>
                </div>
                <p className="text-muted-foreground mt-1 max-w-2xl text-xs leading-relaxed">
                  Re-run this recorded execution under controlled failures. The
                  simulation uses fixture-backed tool outcomes; it never calls
                  the source run’s tools, credentials, or network destinations.
                </p>
              </div>
              <Badge
                variant="outline"
                className="gap-1.5 font-mono text-[10px]"
              >
                <ShieldCheck className="size-3.5" /> no external side effects
              </Badge>
            </div>
          </header>

          <div className="grid gap-2 sm:grid-cols-2">
            {conditions.map((condition) => {
              const active = selected.some(
                (item) => item.type === condition.type,
              );
              return (
                <button
                  key={condition.type}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleCondition(condition.type)}
                  className={cn(
                    "bg-card rounded-lg border p-3 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-hidden",
                    active
                      ? "border-primary-accent bg-primary-accent/5 ring-primary-accent ring-1"
                      : "border-border",
                  )}
                >
                  <span className="text-sm font-bold">{condition.label}</span>
                  <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
                    {condition.description}
                  </span>
                </button>
              );
            })}
          </div>

          {selected.some((condition) => condition.type === "CUSTOMER_REPLY") ? (
            <div className="bg-card rounded-lg border p-3">
              <label
                className="text-xs font-bold"
                htmlFor="simulation-customer-reply"
              >
                Customer reply intent
              </label>
              <Select
                value={customerReplyIntent}
                onValueChange={(value) =>
                  setCustomerReplyIntent(value as CustomerReplyIntent)
                }
              >
                <SelectTrigger
                  id="simulation-customer-reply"
                  className="mt-2 w-full sm:w-72"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POSITIVE">Positive response</SelectItem>
                  <SelectItem value="NEGOTIATION">
                    Negotiation request
                  </SelectItem>
                  <SelectItem value="UNSUBSCRIBE">
                    Unsubscribe request
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {selected.some(
            (condition) => condition.type === "DIFFERENT_MODEL",
          ) ? (
            <div className="bg-card rounded-lg border p-3">
              <label className="text-xs font-bold" htmlFor="simulation-model">
                Alternative model policy
              </label>
              <Input
                id="simulation-model"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                className="mt-2"
                maxLength={160}
              />
              <p className="text-muted-foreground mt-1 text-[11px]">
                This identifies the policy under comparison; no provider request
                is made without a separately configured, approved model
                execution policy.
              </p>
            </div>
          ) : null}

          <div className="bg-background/50 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-3">
            <p className="text-muted-foreground text-xs">
              {selected.length === 0
                ? "Select one or more conditions to create a new reasoning path."
                : `${selected.length} condition${selected.length === 1 ? "" : "s"} selected`}
            </p>
            <Button
              type="button"
              onClick={startSimulation}
              disabled={
                selected.length === 0 ||
                isStarting ||
                (selected.some(
                  (condition) => condition.type === "DIFFERENT_MODEL",
                ) &&
                  model.trim().length === 0)
              }
              className="gap-1.5"
            >
              {isStarting ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <Bot className="size-3.5" />
              )}
              Generate reasoning path
            </Button>
          </div>
        </div>

        <SimulationComparison
          run={latest}
          loading={runs.isLoading}
          onCancel={(simulationRunId) =>
            cancel.mutate({ projectId: run.projectId, simulationRunId })
          }
        />
      </div>
    </section>
  );
}

function SimulationComparison({
  run,
  loading,
  onCancel,
}: {
  run: ReturnType<
    typeof api.executionSimulation.listRuns.useQuery
  >["data"] extends Array<infer Item> | undefined
    ? Item | undefined
    : never;
  loading: boolean;
  onCancel: (simulationRunId: string) => void;
}) {
  if (loading) return <SimulationComparisonSkeleton />;
  if (!run)
    return (
      <div className="bg-card flex min-h-[420px] items-center justify-center rounded-lg border p-6 text-center shadow-xs">
        <div className="max-w-sm">
          <FlaskConical className="text-muted-foreground mx-auto size-9" />
          <h3 className="mt-3 text-sm font-bold">No simulated execution yet</h3>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Choose a condition to generate an isolated reasoning path and
            inspect its differences here.
          </p>
        </div>
      </div>
    );
  const presentation = simulationStatusPresentation(run.status);
  const StatusIcon = presentation.icon;
  const result = run.result;
  return (
    <aside className="bg-card min-h-[420px] rounded-lg border p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold">Baseline ↔ simulated</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Latest isolated run
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn("gap-1.5", presentation.className)}
        >
          <StatusIcon
            className={cn(
              "size-3.5",
              run.status === "RUNNING" || run.status === "QUEUED"
                ? "animate-spin"
                : "",
            )}
          />
          {presentation.label}
        </Badge>
      </div>
      {["QUEUED", "RUNNING"].includes(run.status) ? (
        <div className="mt-8 text-center">
          <LoaderCircle className="text-primary-accent mx-auto size-7 animate-spin" />
          <p className="mt-3 text-sm font-bold">Generating simulation</p>
          <p className="text-muted-foreground mt-1 text-xs">
            The isolated worker is compiling the new reasoning path.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => onCancel(run.id)}
          >
            Cancel simulation
          </Button>
        </div>
      ) : result ? (
        <div className="mt-5 space-y-4">
          <div className="bg-muted/50 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-md p-3 text-center">
            <div>
              <p className="text-muted-foreground text-[10px] font-bold uppercase">
                Original
              </p>
              <p className="mt-1 text-sm font-bold">
                {result.comparison.baselineStatus}
              </p>
              <p className="text-muted-foreground mt-1 text-[11px]">
                {result.comparison.baselineDurationSeconds === null
                  ? "Duration unknown"
                  : formatIntervalSeconds(
                      result.comparison.baselineDurationSeconds,
                    )}
              </p>
            </div>
            <ArrowRight className="text-muted-foreground size-4" />
            <div>
              <p className="text-muted-foreground text-[10px] font-bold uppercase">
                Simulated
              </p>
              <p className="mt-1 text-sm font-bold">
                {result.comparison.simulatedStatus}
              </p>
              <p className="text-muted-foreground mt-1 text-[11px]">
                {result.comparison.simulatedDurationSeconds === null
                  ? "Duration unknown"
                  : formatIntervalSeconds(
                      result.comparison.simulatedDurationSeconds,
                    )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md border p-2.5">
            <Clock3 className="text-muted-foreground size-4" />
            <div>
              <p className="text-xs font-bold">
                {result.comparison.addedReasoningEventIds.length} new reasoning
                steps
              </p>
              <p className="text-muted-foreground text-[11px]">
                Fixture-policy generated; explicitly labeled in each simulated
                event.
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold">Execution differences</p>
            <ul className="mt-2 space-y-2">
              {result.comparison.changedEvents.map((difference) => (
                <li
                  key={difference.eventId}
                  className="rounded-md border p-2.5"
                >
                  <Badge variant="outline" className="text-[10px]">
                    {difference.kind.toLocaleLowerCase()}
                  </Badge>
                  <p className="mt-1 text-xs leading-relaxed">
                    {difference.summary}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="mt-8 text-center">
          <XCircle className="text-destructive mx-auto size-7" />
          <p className="mt-3 text-sm font-bold">
            Simulation could not complete
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {run.error ?? "The simulation result is unavailable."}
          </p>
        </div>
      )}
    </aside>
  );
}

function SimulationComparisonSkeleton() {
  return (
    <aside className="bg-card min-h-[420px] rounded-lg border p-4 shadow-xs">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-6 h-24 w-full" />
      <Skeleton className="mt-4 h-16 w-full" />
      <Skeleton className="mt-4 h-24 w-full" />
    </aside>
  );
}
