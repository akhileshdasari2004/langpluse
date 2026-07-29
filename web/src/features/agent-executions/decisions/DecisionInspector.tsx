import type {
  AgentDecisionAlternative,
  AgentDecisionEvidence,
} from "@langfuse/shared";
import {
  BrainCircuit,
  CheckCircle2,
  CircleX,
  GitBranch,
  Network,
  ShieldAlert,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { JSONView } from "@/src/components/ui/CodeJsonViewer";
import { cn } from "@/src/utils/tailwind";
import { riskPresentation } from "./model";

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
    <section className="grid gap-1.5">
      <h3 className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-bold tracking-wide uppercase">
        <Icon className="size-3.5" />
        {label}
      </h3>
      {children}
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="bg-muted/30 rounded-lg border p-3">
      <p className="text-muted-foreground flex items-center gap-1 text-[10px] uppercase">
        <Icon className="size-3" />
        {label}
      </p>
      <p className={cn("mt-1 font-mono text-sm font-bold", className)}>
        {value}
      </p>
    </div>
  );
}

function PathCard({
  alternative,
  isActive,
  onSelect,
}: {
  alternative: AgentDecisionAlternative;
  isActive: boolean;
  onSelect: () => void;
}) {
  const selected = alternative.disposition === "SELECTED";
  const Icon = selected ? CheckCircle2 : CircleX;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      className={cn(
        "focus-visible:ring-primary-accent w-full rounded-lg border p-3 text-left transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-sm focus-visible:ring-2 focus-visible:outline-hidden",
        selected
          ? "border-emerald-500/45 bg-emerald-500/5"
          : "border-red-500/35 bg-red-500/5",
        isActive && "ring-primary-accent ring-2 ring-offset-1",
      )}
    >
      <div className="flex items-start gap-2">
        <Icon
          className={cn(
            "mt-0.5 size-4 shrink-0",
            selected ? "text-emerald-600" : "text-red-600",
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={selected ? "success" : "error"}>
              {alternative.disposition}
            </Badge>
            <Badge
              variant="outline"
              className={riskPresentation(alternative.risk)}
            >
              {alternative.risk.toLocaleLowerCase()} risk
            </Badge>
            <Badge variant="outline">
              {alternative.executionImpact.toLocaleLowerCase()} impact
            </Badge>
          </div>
          <p className="mt-1.5 text-sm font-bold">{alternative.title}</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            {alternative.reason ??
              "No explicit rationale was emitted for this path."}
          </p>
          <p className="text-muted-foreground mt-2 font-mono text-[10px]">
            {alternative.confidence === null
              ? "Confidence not emitted"
              : `${Math.round(alternative.confidence * 100)}% path confidence`}
          </p>
        </div>
      </div>
    </button>
  );
}

export function DecisionInspector({
  decision,
  selectedAlternative,
  decisionNamesByEventId,
  onSelectAlternative,
  onClose,
}: {
  decision: AgentDecisionEvidence | null;
  selectedAlternative: AgentDecisionAlternative | null;
  decisionNamesByEventId: Map<string, string>;
  onSelectAlternative: (alternative: AgentDecisionAlternative) => void;
  onClose: () => void;
}) {
  if (!decision) return null;
  const activeAlternative =
    selectedAlternative ??
    decision.alternatives.find(
      (alternative) => alternative.disposition === "SELECTED",
    ) ??
    decision.alternatives[0] ??
    null;

  return (
    <aside className="bg-background animate-in slide-in-from-right-4 absolute inset-y-0 right-0 z-10 flex w-full flex-col border-l shadow-2xl duration-300 2xl:relative 2xl:w-[430px] 2xl:shrink-0 2xl:shadow-none">
      <header className="flex items-start gap-3 border-b p-4">
        <div className="bg-primary-accent/10 text-primary-accent flex size-8 shrink-0 items-center justify-center rounded-lg">
          <GitBranch className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2
            className="line-clamp-2 text-sm font-bold"
            title={decision.eventName}
          >
            {decision.selectedDecision ?? decision.eventName}
          </h2>
          <p
            className="text-muted-foreground mt-1 truncate font-mono text-[10px]"
            title={decision.eventName}
          >
            {decision.eventName}
          </p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onClose}
          aria-label="Close decision detail"
          className="size-7 shrink-0"
        >
          <X className="size-4" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="grid gap-5">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{decision.provenance} evidence</Badge>
            <Badge variant="outline">{decision.agent.name}</Badge>
            <Badge variant="secondary">
              {decision.alternatives.length} recorded paths
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Metric
              icon={Target}
              label="Confidence"
              value={`${Math.round(decision.confidence * 100)}%`}
            />
            <Metric
              icon={ShieldAlert}
              label="Risk"
              value={decision.risk.toLocaleLowerCase()}
              className={riskPresentation(decision.risk)}
            />
            <Metric
              icon={Sparkles}
              label="Execution impact"
              value={decision.executionImpact.toLocaleLowerCase()}
            />
            <Metric
              icon={GitBranch}
              label="Decision time"
              value={decision.startedAt.toISOString().slice(11, 23) + " UTC"}
            />
          </div>

          <EvidenceSection
            icon={BrainCircuit}
            label="Why this decision was made"
          >
            <p className="text-sm leading-relaxed">
              {decision.reason ??
                "No reasoning summary was emitted. Langpluse does not infer private chain-of-thought."}
            </p>
          </EvidenceSection>

          <EvidenceSection icon={Network} label="Dependencies">
            {decision.dependencyIds.length > 0 ? (
              <div className="space-y-1.5">
                {decision.dependencyIds.map((dependencyId) => (
                  <div
                    key={dependencyId}
                    className="bg-muted/30 flex items-center justify-between gap-2 rounded-md border px-2.5 py-2"
                  >
                    <span
                      className="min-w-0 truncate text-xs"
                      title={
                        decisionNamesByEventId.get(dependencyId) ?? dependencyId
                      }
                    >
                      {decisionNamesByEventId.get(dependencyId) ?? dependencyId}
                    </span>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {decision.dependencyProvenance}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                No explicit dependencies were emitted for this decision.
              </p>
            )}
          </EvidenceSection>

          <EvidenceSection icon={GitBranch} label="Alternative path comparison">
            {decision.alternatives.length > 0 ? (
              <div className="grid gap-2">
                {decision.alternatives.map((alternative) => (
                  <PathCard
                    key={alternative.id}
                    alternative={alternative}
                    isActive={activeAlternative?.id === alternative.id}
                    onSelect={() => onSelectAlternative(alternative)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                This decision event did not emit considered alternatives.
              </p>
            )}
          </EvidenceSection>

          {activeAlternative ? (
            <EvidenceSection icon={Target} label="Selected comparison path">
              <JSONView
                title={activeAlternative.title}
                json={{
                  pathId: activeAlternative.id,
                  disposition: activeAlternative.disposition,
                  reason: activeAlternative.reason,
                  confidence: activeAlternative.confidence,
                  risk: activeAlternative.risk,
                  executionImpact: activeAlternative.executionImpact,
                  dependencyIds: activeAlternative.dependencyIds,
                  provenance: activeAlternative.provenance,
                }}
                collapseStringsAfterLength={300}
              />
            </EvidenceSection>
          ) : null}

          <JSONView
            title="Decision evidence"
            json={{
              eventId: decision.eventId,
              eventName: decision.eventName,
              startedAt: decision.startedAt,
              selectedDecision: decision.selectedDecision,
              provenance: decision.provenance,
              dependencyProvenance: decision.dependencyProvenance,
            }}
            collapseStringsAfterLength={300}
          />
        </div>
      </div>
    </aside>
  );
}
