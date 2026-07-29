import type {
  AgentMemoryEvidence,
  AgentMemoryProjection,
} from "@langfuse/shared";
import {
  BrainCircuit,
  CheckCircle2,
  CircleX,
  Clock3,
  Database,
  FileJson,
  Fingerprint,
  Network,
  ShieldCheck,
  Timer,
  X,
} from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { JSONView } from "@/src/components/ui/CodeJsonViewer";
import { Skeleton } from "@/src/components/ui/skeleton";
import { useParsedObservation } from "@/src/hooks/useParsedObservation";
import type { ObservationReturnTypeWithMetadata } from "@/src/server/api/routers/traces";
import { formatMemoryFreshness, getMemoryFreshnessBand } from "./model";

function EvidenceSection({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Database;
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

function EvidenceAbsence({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground text-xs leading-relaxed">{children}</p>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Database;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-muted/30 rounded-lg border p-3">
      <p className="text-muted-foreground flex items-center gap-1 text-[10px] uppercase">
        <Icon className="size-3" />
        {label}
      </p>
      <p className="mt-1 font-mono text-sm font-bold">{value}</p>
    </div>
  );
}

function RawRetrievalEvidence({
  memory,
  observation,
  projectId,
  traceId,
}: {
  memory: AgentMemoryEvidence;
  observation?: ObservationReturnTypeWithMetadata;
  projectId: string;
  traceId: string;
}) {
  const {
    parsedInput,
    parsedOutput,
    isLoadingObservation,
    isWaitingForParsing,
    parseError,
  } = useParsedObservation({
    observationId: memory.eventId,
    traceId,
    projectId,
    startTime: observation?.startTime ?? memory.eventStartedAt,
    baseObservation: observation,
  });
  const isLoading = isLoadingObservation || isWaitingForParsing;

  if (parseError) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
        <p className="text-xs font-bold">Raw retrieval payload unavailable</p>
        <p className="text-muted-foreground mt-1 text-xs">{parseError}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-2">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <JSONView
        title="Retrieval query"
        json={parsedInput}
        collapseStringsAfterLength={300}
      />
      <JSONView
        title="Raw retrieval output"
        json={parsedOutput}
        collapseStringsAfterLength={300}
      />
    </div>
  );
}

export function MemoryDetail({
  memory,
  projection,
  observation,
  projectId,
  traceId,
  onClose,
}: {
  memory: AgentMemoryEvidence;
  projection: AgentMemoryProjection;
  observation?: ObservationReturnTypeWithMetadata;
  projectId: string;
  traceId: string;
  onClose: () => void;
}) {
  const StatusIcon =
    memory.disposition === "RETRIEVED" ? CheckCircle2 : CircleX;
  const relatedById = new Map(
    projection.memories.map((candidate) => [candidate.id, candidate]),
  );

  return (
    <aside className="bg-background animate-in slide-in-from-right-4 absolute inset-y-0 right-0 z-10 flex w-full flex-col border-l shadow-2xl duration-300 sm:w-[420px] xl:relative xl:w-[420px] xl:shrink-0 xl:shadow-none">
      <header className="flex items-start gap-3 border-b p-4">
        <div
          className={
            memory.disposition === "RETRIEVED"
              ? "flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600"
              : "flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600"
          }
        >
          <StatusIcon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2
            className="line-clamp-2 text-sm font-bold"
            title={memory.content ?? memory.eventName}
          >
            {memory.content ?? memory.eventName}
          </h2>
          <p
            className="text-muted-foreground mt-1 truncate font-mono text-[10px]"
            title={memory.memoryId}
          >
            {memory.memoryId}
          </p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onClose}
          aria-label="Close memory detail"
          className="size-7 shrink-0"
        >
          <X className="size-4" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="grid gap-5">
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={memory.disposition === "RETRIEVED" ? "success" : "error"}
            >
              {memory.disposition}
            </Badge>
            <Badge variant="outline">{memory.provenance} evidence</Badge>
            <Badge variant="secondary">
              {getMemoryFreshnessBand(memory.freshnessSeconds)}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Metric
              icon={Fingerprint}
              label="Similarity"
              value={
                memory.similarity === null
                  ? "Not emitted"
                  : `${Math.round(memory.similarity * 100)}%`
              }
            />
            <Metric
              icon={ShieldCheck}
              label="Confidence"
              value={`${Math.round(memory.confidence * 100)}%`}
            />
            <Metric
              icon={Database}
              label="Embedding distance"
              value={
                memory.embeddingDistance === null
                  ? "Not emitted"
                  : memory.embeddingDistance.toFixed(3)
              }
            />
            <Metric
              icon={Timer}
              label="Retrieval time"
              value={
                memory.retrievalTimeMs === null
                  ? "Not emitted"
                  : `${Math.round(memory.retrievalTimeMs)} ms`
              }
            />
          </div>

          <EvidenceSection icon={Clock3} label="Freshness">
            <p className="text-sm font-bold">
              {formatMemoryFreshness(memory.freshnessSeconds)}
            </p>
            <p className="text-muted-foreground font-mono text-[10px]">
              Retrieved {memory.retrievedAt.toISOString()}
            </p>
            {memory.createdAt ? (
              <p className="text-muted-foreground font-mono text-[10px]">
                Source record {memory.createdAt.toISOString()}
              </p>
            ) : null}
          </EvidenceSection>

          <EvidenceSection icon={Database} label="Source">
            {memory.source ? (
              <p className="text-sm">{memory.source}</p>
            ) : (
              <EvidenceAbsence>
                The memory system did not emit a source.
              </EvidenceAbsence>
            )}
            {memory.businessContext ? (
              <p className="bg-muted/30 rounded-md border p-2.5 text-xs leading-relaxed">
                {memory.businessContext}
              </p>
            ) : null}
          </EvidenceSection>

          <EvidenceSection
            icon={BrainCircuit}
            label={
              memory.disposition === "RETRIEVED"
                ? "Reason used"
                : "Reason ignored"
            }
          >
            {memory.disposition === "RETRIEVED" && memory.reasonUsed ? (
              <p className="text-sm leading-relaxed">{memory.reasonUsed}</p>
            ) : memory.disposition === "REJECTED" && memory.reasonIgnored ? (
              <p className="text-sm leading-relaxed">{memory.reasonIgnored}</p>
            ) : (
              <EvidenceAbsence>
                No selection rationale was emitted for this memory.
              </EvidenceAbsence>
            )}
          </EvidenceSection>

          <EvidenceSection icon={Network} label="Memory relationships">
            {memory.relationshipIds.length > 0 ? (
              <div className="grid gap-1.5">
                {memory.relationshipIds.map((relatedId) => {
                  const related = relatedById.get(relatedId);
                  return (
                    <div
                      key={relatedId}
                      className="bg-muted/30 flex items-center justify-between gap-2 rounded-md border px-2.5 py-2"
                    >
                      <span
                        className="min-w-0 truncate text-xs"
                        title={related?.content ?? relatedId}
                      >
                        {related?.content ?? relatedId}
                      </span>
                      {related ? (
                        <Badge
                          variant={
                            related.disposition === "RETRIEVED"
                              ? "success"
                              : "error"
                          }
                          className="shrink-0"
                        >
                          {related.disposition}
                        </Badge>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EvidenceAbsence>
                No explicit relationships were emitted for this memory.
              </EvidenceAbsence>
            )}
          </EvidenceSection>

          <EvidenceSection icon={FileJson} label="Retrieval evidence">
            <RawRetrievalEvidence
              memory={memory}
              observation={observation}
              projectId={projectId}
              traceId={traceId}
            />
          </EvidenceSection>
        </div>
      </div>
    </aside>
  );
}
