import { useMemo, useState } from "react";
import {
  buildAgentDecisionProjection,
  type AgentDecisionAlternative,
  type AgentDecisionEvidence,
  type AgentExecutionProjection,
} from "@langfuse/shared";
import {
  CheckCircle2,
  CircleX,
  GitBranch,
  Radio,
  RotateCcw,
  Search,
  ShieldAlert,
  Target,
} from "lucide-react";
import { StringParam, useQueryParam } from "use-query-params";
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
import { cn } from "@/src/utils/tailwind";
import { useRunProjection } from "../components/RunProjectionContext";
import { useLiveRunStore } from "../live/LiveRunStoreProvider";
import { useActiveRunReplayEvent } from "../replay/RunReplayProvider";
import { DecisionInspector } from "./DecisionInspector";
import { DecisionTree } from "./DecisionTree";
import {
  filterDecisions,
  riskPresentation,
  type DecisionBranchFilter,
  type DecisionRiskFilter,
} from "./model";

function asBranch(value: string | null | undefined): DecisionBranchFilter {
  return value === "SELECTED" || value === "REJECTED" ? value : "ALL";
}

function asRisk(value: string | null | undefined): DecisionRiskFilter {
  return value === "LOW" ||
    value === "MEDIUM" ||
    value === "HIGH" ||
    value === "CRITICAL" ||
    value === "UNKNOWN"
    ? value
    : "ALL";
}

function DecisionSummaryCards({
  projection,
}: {
  projection: ReturnType<typeof buildAgentDecisionProjection>;
}) {
  const cards = [
    {
      label: "Recorded decisions",
      value: projection.decisions.length.toLocaleString(),
      icon: GitBranch,
      className: "text-indigo-700 dark:text-indigo-300",
    },
    {
      label: "Selected paths",
      value: projection.selectedCount.toLocaleString(),
      icon: CheckCircle2,
      className: "text-emerald-700 dark:text-emerald-300",
    },
    {
      label: "Rejected paths",
      value: projection.rejectedCount.toLocaleString(),
      icon: CircleX,
      className: "text-red-700 dark:text-red-300",
    },
    {
      label: "Avg. confidence",
      value:
        projection.averageConfidence === null
          ? "Not emitted"
          : `${Math.round(projection.averageConfidence * 100)}%`,
      icon: Target,
      className: "text-blue-700 dark:text-blue-300",
    },
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-card/80 rounded-lg border p-3 shadow-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-[10px] font-bold tracking-wide uppercase">
                {card.label}
              </p>
              <Icon className={cn("size-3.5", card.className)} />
            </div>
            <p className="mt-1 font-mono text-lg font-bold">{card.value}</p>
          </div>
        );
      })}
    </div>
  );
}

function DecisionList({
  decisions,
  selectedId,
  onSelect,
}: {
  decisions: AgentDecisionEvidence[];
  selectedId: string | null;
  onSelect: (decision: AgentDecisionEvidence) => void;
}) {
  return (
    <nav
      className="bg-card min-h-0 overflow-auto rounded-lg border p-2 shadow-xs"
      aria-label="Recorded decisions"
    >
      <div className="grid gap-1.5">
        {decisions.map((decision) => (
          <button
            key={decision.id}
            type="button"
            onClick={() => onSelect(decision)}
            aria-pressed={selectedId === decision.id}
            className={cn(
              "focus-visible:ring-primary-accent rounded-md border p-3 text-left transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-sm focus-visible:ring-2 focus-visible:outline-hidden",
              selectedId === decision.id
                ? "border-primary-accent bg-primary-accent/5 ring-primary-accent ring-1"
                : "hover:border-border border-transparent",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline">{decision.agent.name}</Badge>
              <span
                className={cn(
                  "font-mono text-[10px] font-bold",
                  riskPresentation(decision.risk),
                )}
              >
                {decision.risk.toLocaleLowerCase()} risk
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs font-bold">
              {decision.selectedDecision ?? decision.eventName}
            </p>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-[11px] leading-relaxed">
              {decision.reason ?? "No rationale emitted"}
            </p>
            <div className="text-muted-foreground mt-2 flex items-center justify-between gap-2 font-mono text-[10px]">
              <span>{decision.alternatives.length} paths</span>
              <span>{Math.round(decision.confidence * 100)}%</span>
            </div>
          </button>
        ))}
      </div>
    </nav>
  );
}

function DecisionEmptyState({
  isFiltered,
  onReset,
}: {
  isFiltered: boolean;
  onReset: () => void;
}) {
  return (
    <div className="bg-card flex min-h-[360px] flex-1 items-center justify-center rounded-lg border p-6 text-center shadow-xs">
      <div className="max-w-md">
        <GitBranch className="text-muted-foreground mx-auto size-9" />
        <h3 className="mt-3 text-sm font-bold">
          {isFiltered
            ? "No decisions match these filters"
            : "No decision evidence recorded"}
        </h3>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {isFiltered
            ? "Broaden the branch, risk, or local search filter to inspect more recorded decision paths."
            : "This run did not emit decision events. Langpluse does not infer considered alternatives from unrelated spans."}
        </p>
        {isFiltered ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 gap-1.5"
            onClick={onReset}
          >
            <RotateCcw className="size-3.5" />
            Reset filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function DecisionExplorer() {
  const projection = useRunProjection();
  const buffer = useLiveRunStore((state) => state.buffer);
  const replayEvent = useActiveRunReplayEvent();
  const [decisionParam, setDecisionParam] = useQueryParam(
    "decision",
    StringParam,
  );
  const [alternativeParam, setAlternativeParam] = useQueryParam(
    "decisionAlternative",
    StringParam,
  );
  const [branchParam, setBranchParam] = useQueryParam(
    "decisionBranch",
    StringParam,
  );
  const [riskParam, setRiskParam] = useQueryParam("decisionRisk", StringParam);
  const [search, setSearch] = useState("");
  const branch = asBranch(branchParam);
  const risk = asRisk(riskParam);
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
  const decisionProjection = useMemo(
    () => buildAgentDecisionProjection(liveProjection),
    [liveProjection],
  );
  const filteredDecisions = useMemo(
    () =>
      filterDecisions({
        decisions: decisionProjection.decisions,
        search,
        branch,
        risk,
      }),
    [branch, decisionProjection.decisions, risk, search],
  );
  const selectedDecision =
    filteredDecisions.find((decision) => decision.id === decisionParam) ??
    filteredDecisions.find(
      (decision) => decision.eventId === replayEvent?.id,
    ) ??
    filteredDecisions[0] ??
    null;
  const selectedAlternative =
    selectedDecision?.alternatives.find(
      (alternative) => alternative.id === alternativeParam,
    ) ?? null;
  const eventNamesById = useMemo(
    () => new Map(liveProjection.events.map((event) => [event.id, event.name])),
    [liveProjection.events],
  );
  const hasFilters =
    search.trim().length > 0 || branch !== "ALL" || risk !== "ALL";

  const selectDecision = (decision: AgentDecisionEvidence) => {
    setDecisionParam(decision.id);
    setAlternativeParam(undefined);
  };
  const selectAlternative = (
    decision: AgentDecisionEvidence,
    alternative: AgentDecisionAlternative,
  ) => {
    setDecisionParam(decision.id);
    setAlternativeParam(alternative.id);
  };
  const resetFilters = () => {
    setSearch("");
    setBranchParam(undefined);
    setRiskParam(undefined);
  };

  return (
    <section
      className="bg-muted/10 relative flex min-h-0 flex-1 flex-col overflow-hidden"
      aria-label="Decision Explorer"
    >
      <header className="bg-background/95 grid shrink-0 gap-3 border-b p-3 backdrop-blur sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="bg-primary-accent/10 text-primary-accent flex size-9 shrink-0 items-center justify-center rounded-lg">
              <GitBranch className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold">Decision Explorer</h2>
                <Badge variant="outline">
                  {decisionProjection.decisions.length.toLocaleString()}{" "}
                  decisions
                </Badge>
                {decisionProjection.status === "RUNNING" ? (
                  <Badge variant="warning" className="gap-1">
                    <Radio className="size-3 animate-pulse" />
                    Live evidence
                  </Badge>
                ) : null}
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Evidence-backed selection, rejected paths, risk, and downstream
                impact
              </p>
            </div>
          </div>
          {decisionProjection.highRiskCount > 0 ? (
            <Badge variant="error" className="gap-1.5">
              <ShieldAlert className="size-3.5" />
              {decisionProjection.highRiskCount} high-risk decision
              {decisionProjection.highRiskCount === 1 ? "" : "s"}
            </Badge>
          ) : null}
        </div>

        <DecisionSummaryCards projection={decisionProjection} />

        <div className="grid gap-2 lg:grid-cols-[minmax(240px,1fr)_170px_170px]">
          <div className="relative min-w-0">
            <Search className="text-muted-foreground pointer-events-none absolute top-2 left-2.5 size-4" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search decisions, paths, rationale, risk…"
              aria-label="Search decision evidence"
              className="pl-8"
            />
          </div>
          <Select
            value={branch}
            onValueChange={(value) =>
              setBranchParam(value === "ALL" ? undefined : value)
            }
          >
            <SelectTrigger aria-label="Filter decision branch">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All paths</SelectItem>
              <SelectItem value="SELECTED">Selected path</SelectItem>
              <SelectItem value="REJECTED">Rejected path</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={risk}
            onValueChange={(value) =>
              setRiskParam(value === "ALL" ? undefined : value)
            }
          >
            <SelectTrigger aria-label="Filter decision risk">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Any risk</SelectItem>
              <SelectItem value="LOW">Low risk</SelectItem>
              <SelectItem value="MEDIUM">Medium risk</SelectItem>
              <SelectItem value="HIGH">High risk</SelectItem>
              <SelectItem value="CRITICAL">Critical risk</SelectItem>
              <SelectItem value="UNKNOWN">Risk not emitted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {filteredDecisions.length === 0 ? (
        <DecisionEmptyState isFiltered={hasFilters} onReset={resetFilters} />
      ) : (
        <div className="relative grid min-h-0 flex-1 gap-3 overflow-hidden p-3 xl:grid-cols-[280px_minmax(0,1fr)] xl:p-4">
          <DecisionList
            decisions={filteredDecisions}
            selectedId={selectedDecision?.id ?? null}
            onSelect={selectDecision}
          />
          <DecisionTree
            decisions={filteredDecisions}
            selectedDecisionId={selectedDecision?.id ?? null}
            selectedAlternativeId={selectedAlternative?.id ?? null}
            search={search}
            onSelectDecision={selectDecision}
            onSelectAlternative={selectAlternative}
          />
          <DecisionInspector
            decision={selectedDecision}
            selectedAlternative={selectedAlternative}
            decisionNamesByEventId={eventNamesById}
            onSelectAlternative={(alternative) => {
              if (selectedDecision)
                selectAlternative(selectedDecision, alternative);
            }}
            onClose={() => {
              setDecisionParam(undefined);
              setAlternativeParam(undefined);
            }}
          />
        </div>
      )}
    </section>
  );
}
