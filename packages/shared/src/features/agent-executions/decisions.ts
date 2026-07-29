import { z } from "zod";
import {
  AgentExecutionProvenance,
  AgentExecutionStatus,
  AgentIdentitySchema,
  type AgentExecutionEvent,
  type AgentExecutionProjection,
} from "./schema";

export const MISSION_CONTROL_DECISION_METADATA_KEYS = {
  selected: "mission_control.decision.selected",
  alternatives: "mission_control.decision.alternatives",
  risk: "mission_control.decision.risk",
  executionImpact: "mission_control.decision.execution_impact",
  dependencies: "mission_control.dependencies",
  legacyRejectedAlternatives: "mission_control.decision.rejected_alternatives",
} as const;

export const AgentDecisionDisposition = z.enum(["SELECTED", "REJECTED"]);
export type AgentDecisionDisposition = z.infer<typeof AgentDecisionDisposition>;

export const AgentDecisionRisk = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
  "UNKNOWN",
]);
export type AgentDecisionRisk = z.infer<typeof AgentDecisionRisk>;

export const AgentDecisionExecutionImpact = z.enum([
  "POSITIVE",
  "NEUTRAL",
  "NEGATIVE",
  "UNKNOWN",
]);
export type AgentDecisionExecutionImpact = z.infer<
  typeof AgentDecisionExecutionImpact
>;

export const InstrumentedDecisionAlternativeSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  disposition: z.enum(["selected", "rejected"]),
  reason: z.string().trim().min(1).nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  risk: z.enum(["low", "medium", "high", "critical"]).nullable().optional(),
  executionImpact: z
    .enum(["positive", "neutral", "negative"])
    .nullable()
    .optional(),
  dependencies: z.array(z.string().trim().min(1)).optional(),
});

export type InstrumentedDecisionAlternative = z.infer<
  typeof InstrumentedDecisionAlternativeSchema
>;

export const AgentDecisionAlternativeSchema = z.object({
  id: z.string().min(1),
  decisionId: z.string().min(1),
  title: z.string().min(1),
  disposition: AgentDecisionDisposition,
  reason: z.string().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  risk: AgentDecisionRisk,
  executionImpact: AgentDecisionExecutionImpact,
  dependencyIds: z.array(z.string()),
  provenance: AgentExecutionProvenance,
});

export type AgentDecisionAlternative = z.infer<
  typeof AgentDecisionAlternativeSchema
>;

export const AgentDecisionEvidenceSchema = z.object({
  id: z.string().min(1),
  eventId: z.string().min(1),
  eventName: z.string().min(1),
  startedAt: z.date(),
  selectedDecision: z.string().nullable(),
  reason: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  risk: AgentDecisionRisk,
  executionImpact: AgentDecisionExecutionImpact,
  dependencyIds: z.array(z.string()),
  dependencyProvenance: AgentExecutionProvenance,
  alternatives: z.array(AgentDecisionAlternativeSchema),
  provenance: AgentExecutionProvenance,
  agent: AgentIdentitySchema,
});

export type AgentDecisionEvidence = z.infer<typeof AgentDecisionEvidenceSchema>;

export const AgentDecisionProjectionSchema = z.object({
  runId: z.string().min(1),
  status: AgentExecutionStatus,
  decisions: z.array(AgentDecisionEvidenceSchema),
  selectedCount: z.number().int().nonnegative(),
  rejectedCount: z.number().int().nonnegative(),
  averageConfidence: z.number().min(0).max(1).nullable(),
  highRiskCount: z.number().int().nonnegative(),
});

export type AgentDecisionProjection = z.infer<
  typeof AgentDecisionProjectionSchema
>;

function metadataString(event: AgentExecutionEvent, key: string) {
  const value = event.metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function metadataStringArray(event: AgentExecutionEvent, key: string) {
  const value = event.metadata[key];
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  return Array.isArray(parsed)
    ? parsed.filter(
        (item): item is string =>
          typeof item === "string" && item.trim() !== "",
      )
    : [];
}

function parseAlternatives(event: AgentExecutionEvent) {
  const value =
    event.metadata[MISSION_CONTROL_DECISION_METADATA_KEYS.alternatives];
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((item): InstrumentedDecisionAlternative[] => {
    const result = InstrumentedDecisionAlternativeSchema.safeParse(item);
    return result.success ? [result.data] : [];
  });
}

function asRisk(value: string | null): AgentDecisionRisk {
  switch (value?.trim().toUpperCase()) {
    case "LOW":
    case "MEDIUM":
    case "HIGH":
    case "CRITICAL":
      return value.trim().toUpperCase() as AgentDecisionRisk;
    default:
      return "UNKNOWN";
  }
}

function asImpact(value: string | null): AgentDecisionExecutionImpact {
  switch (value?.trim().toUpperCase()) {
    case "POSITIVE":
    case "NEUTRAL":
    case "NEGATIVE":
      return value.trim().toUpperCase() as AgentDecisionExecutionImpact;
    default:
      return "UNKNOWN";
  }
}

function average(values: number[]) {
  return values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildAgentDecisionProjection(
  projection: AgentExecutionProjection,
): AgentDecisionProjection {
  const eventIds = new Set(projection.events.map((event) => event.id));
  const decisions = projection.events
    .filter((event) => event.category === "DECISION")
    .sort(
      (left, right) =>
        left.startedAt.getTime() - right.startedAt.getTime() ||
        left.id.localeCompare(right.id),
    )
    .map((event): AgentDecisionEvidence => {
      const instrumentedAlternatives = parseAlternatives(event);
      const alternatives = instrumentedAlternatives.map(
        (alternative): AgentDecisionAlternative => ({
          id: `${event.id}:${alternative.id}`,
          decisionId: event.id,
          title: alternative.title,
          disposition:
            alternative.disposition === "selected" ? "SELECTED" : "REJECTED",
          reason: alternative.reason ?? null,
          confidence: alternative.confidence ?? null,
          risk: asRisk(alternative.risk ?? null),
          executionImpact: asImpact(alternative.executionImpact ?? null),
          dependencyIds: (alternative.dependencies ?? []).filter((id) =>
            eventIds.has(id),
          ),
          provenance: "EXPLICIT",
        }),
      );
      const legacyRejected = metadataStringArray(
        event,
        MISSION_CONTROL_DECISION_METADATA_KEYS.legacyRejectedAlternatives,
      );
      const hasInstrumentedAlternatives = alternatives.length > 0;
      if (!hasInstrumentedAlternatives) {
        for (const [index, title] of legacyRejected.entries()) {
          alternatives.push({
            id: `${event.id}:legacy-rejected-${index}`,
            decisionId: event.id,
            title,
            disposition: "REJECTED",
            reason: null,
            confidence: null,
            risk: "UNKNOWN",
            executionImpact: "UNKNOWN",
            dependencyIds: [],
            provenance: "EXPLICIT",
          });
        }
      }
      const selected = alternatives.find(
        (alternative) => alternative.disposition === "SELECTED",
      );
      const selectedDecision =
        selected?.title ??
        metadataString(event, MISSION_CONTROL_DECISION_METADATA_KEYS.selected);
      const dependencyIds = metadataStringArray(
        event,
        MISSION_CONTROL_DECISION_METADATA_KEYS.dependencies,
      ).filter((id) => eventIds.has(id) && id !== event.id);

      return {
        id: event.id,
        eventId: event.id,
        eventName: event.name,
        startedAt: event.startedAt,
        selectedDecision,
        reason: event.reasoningSummary,
        confidence: event.confidence,
        risk:
          selected?.risk ??
          asRisk(
            metadataString(event, MISSION_CONTROL_DECISION_METADATA_KEYS.risk),
          ),
        executionImpact:
          selected?.executionImpact ??
          asImpact(
            metadataString(
              event,
              MISSION_CONTROL_DECISION_METADATA_KEYS.executionImpact,
            ),
          ),
        dependencyIds,
        dependencyProvenance:
          dependencyIds.length > 0 ? "EXPLICIT" : event.categoryProvenance,
        alternatives,
        provenance:
          hasInstrumentedAlternatives || selectedDecision !== null
            ? "EXPLICIT"
            : event.categoryProvenance,
        agent: event.agent ?? projection.agent,
      };
    });

  const alternatives = decisions.flatMap((decision) => decision.alternatives);
  return {
    runId: projection.id,
    status: projection.status,
    decisions,
    selectedCount: alternatives.filter(
      (alternative) => alternative.disposition === "SELECTED",
    ).length,
    rejectedCount: alternatives.filter(
      (alternative) => alternative.disposition === "REJECTED",
    ).length,
    averageConfidence: average(
      decisions.map((decision) => decision.confidence),
    ),
    highRiskCount: decisions.filter(
      (decision) => decision.risk === "HIGH" || decision.risk === "CRITICAL",
    ).length,
  };
}
