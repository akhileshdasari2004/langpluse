import {
  createEventsCh,
  createObservation,
  createObservationsCh,
  createTrace,
  createTracesCh,
  type ObservationRecordInsertType,
} from "../../../src/server";
import type { ObservationType } from "../../../src/domain";
import { observationToEvent, traceToEvent } from "./event-mirror";
import { utcDayStartMs } from "./rng";
import {
  chunk,
  type ScenarioContext,
  type ScenarioDefinition,
  SeedError,
  type SeedSummary,
} from "./types";
import { countRows, runLink, sessionLink, traceLink } from "./verify";

type SalesEmailStep = {
  key: string;
  parentKey: string | null;
  type: ObservationType;
  name: string;
  category:
    | "task_received"
    | "planning"
    | "memory_retrieval"
    | "reasoning"
    | "decision"
    | "tool_call"
    | "observation"
    | "retry"
    | "failure"
    | "approval"
    | "completion";
  brainKind?:
    | "goal"
    | "plan"
    | "updated_plan"
    | "reasoning"
    | "decision"
    | "tool"
    | "observation"
    | "memory"
    | "retry"
    | "approval"
    | "error"
    | "completion";
  start: number;
  end: number;
  level?: "DEFAULT" | "ERROR" | "WARNING";
  statusMessage?: string;
  confidence?: number;
  toolUsed?: string;
  reasoningSummary?: string;
  promptSummary?: string;
  toolSelectionReason?: string;
  rejectedAlternatives?: string[];
  memoryUsed?: string[];
  dependencyKeys?: string[];
  inputTokens?: number;
  outputTokens?: number;
  agentKey?: string;
  agentName?: string;
  handoffSummary?: string;
  apiLatencyMs?: number;
  eventStatus?: "completed" | "failed";
  input?: unknown;
  output?: unknown;
};

const STEPS: SalesEmailStep[] = [
  {
    key: "root",
    parentKey: null,
    type: "AGENT",
    name: "enterprise-sales-email-agent",
    category: "task_received",
    start: 0,
    end: 10_200,
    brainKind: "goal",
    confidence: 0.99,
    agentKey: "execution-orchestrator",
    agentName: "Execution Orchestrator",
    reasoningSummary:
      "Coordinate verified account context, approval, and delivery for renewal outreach.",
    promptSummary:
      "Draft and send an approved renewal email using verified enterprise account context.",
    input: {
      task: "Draft and send a renewal outreach email",
      account: "Northstar Logistics",
      contact: "Avery Morgan",
    },
    output: { status: "sent", messageId: "msg_mc_renewal_001" },
  },
  {
    key: "plan",
    parentKey: "root",
    type: "SPAN",
    name: "plan-renewal-outreach",
    category: "planning",
    start: 120,
    end: 720,
    brainKind: "plan",
    dependencyKeys: ["root"],
    agentKey: "planner-agent",
    agentName: "Planner Agent",
    confidence: 0.94,
    reasoningSummary:
      "Load account context, verify renewal constraints, draft, approve, and send.",
    promptSummary:
      "Create a bounded execution plan that verifies account and contract facts before drafting.",
    inputTokens: 214,
    outputTokens: 96,
    output: {
      steps: [
        "load account context",
        "select renewal angle",
        "draft email",
        "request approval",
        "send",
      ],
    },
  },
  {
    key: "crm",
    parentKey: "root",
    type: "TOOL",
    name: "salesforce.get-account",
    category: "tool_call",
    start: 780,
    end: 1_420,
    brainKind: "tool",
    dependencyKeys: ["plan"],
    agentKey: "tool-agent",
    agentName: "Tool Agent",
    handoffSummary:
      "Planner delegated authoritative account lookup to the tool agent.",
    confidence: 0.97,
    toolUsed: "Salesforce CRM",
    toolSelectionReason:
      "Salesforce is the authoritative source for account health, seats, and renewal ownership.",
    apiLatencyMs: 612,
    input: { accountId: "acct_northstar_001" },
    output: {
      plan: "Enterprise",
      renewalDate: "2026-09-30",
      seats: 240,
      health: "green",
    },
  },
  {
    key: "memory",
    parentKey: "root",
    type: "RETRIEVER",
    name: "retrieve-account-memory",
    category: "memory_retrieval",
    start: 800,
    end: 1_590,
    brainKind: "memory",
    dependencyKeys: ["plan"],
    agentKey: "memory-agent",
    agentName: "Memory Agent",
    handoffSummary:
      "Planner requested recent account preferences relevant to renewal outreach.",
    confidence: 0.92,
    reasoningSummary:
      "Retrieve recent account priorities that are safe to use in renewal outreach.",
    input: { query: "Northstar Logistics renewal priorities" },
    output: {
      memories: [
        "Interested in EU data residency",
        "Expanded automation team by 30%",
      ],
    },
  },
  {
    key: "erp-failure",
    parentKey: "root",
    type: "TOOL",
    name: "netsuite.verify-renewal",
    category: "failure",
    start: 1_640,
    end: 2_030,
    brainKind: "error",
    dependencyKeys: ["crm"],
    agentKey: "tool-agent",
    agentName: "Tool Agent",
    level: "ERROR",
    statusMessage: "NetSuite returned 429; retry budget remains.",
    confidence: 0.98,
    toolUsed: "NetSuite ERP",
    toolSelectionReason:
      "NetSuite is the authoritative source for contract eligibility and balance status.",
    apiLatencyMs: 388,
    eventStatus: "failed",
    input: { accountId: "acct_northstar_001", verify: "renewal_terms" },
    output: { status: 429, retryAfterMs: 350 },
  },
  {
    key: "erp-retry",
    parentKey: "root",
    type: "EVENT",
    name: "retry-netsuite-with-backoff",
    category: "retry",
    start: 2_050,
    end: 2_410,
    brainKind: "retry",
    dependencyKeys: ["erp-failure"],
    agentKey: "tool-agent",
    agentName: "Tool Agent",
    level: "WARNING",
    statusMessage: "Retry 1 of 2 completed after bounded backoff.",
    confidence: 0.96,
    reasoningSummary:
      "Retry the idempotent renewal verification after the provider backoff window.",
    output: { attempt: 1, maxAttempts: 2, backoffMs: 350 },
  },
  {
    key: "erp-success",
    parentKey: "root",
    type: "TOOL",
    name: "netsuite.verify-renewal",
    category: "tool_call",
    start: 2_430,
    end: 3_080,
    brainKind: "tool",
    dependencyKeys: ["erp-retry"],
    agentKey: "tool-agent",
    agentName: "Tool Agent",
    confidence: 0.98,
    toolUsed: "NetSuite ERP",
    toolSelectionReason:
      "Retry the same idempotent authoritative lookup after the provider backoff window.",
    apiLatencyMs: 624,
    input: { accountId: "acct_northstar_001", verify: "renewal_terms" },
    output: {
      renewalEligible: true,
      outstandingBalance: 0,
      contractCurrency: "USD",
    },
  },
  {
    key: "reason",
    parentKey: "root",
    type: "GENERATION",
    name: "reason-about-renewal-angle",
    category: "reasoning",
    start: 3_160,
    end: 4_740,
    brainKind: "reasoning",
    dependencyKeys: ["crm", "memory", "erp-success"],
    agentKey: "planner-agent",
    agentName: "Planner Agent",
    handoffSummary:
      "Tool and memory evidence returned to the planner for strategy synthesis.",
    confidence: 0.93,
    reasoningSummary:
      "Lead with verified EU data residency and team growth; avoid unsupported pricing claims.",
    promptSummary:
      "Synthesize verified CRM, ERP, and memory evidence into a safe renewal angle.",
    memoryUsed: [
      "Northstar interest in EU data residency",
      "Northstar automation team growth",
    ],
    inputTokens: 682,
    outputTokens: 188,
    input: {
      constraints: ["be concise", "cite verified account facts", "no discount"],
    },
    output: {
      summary:
        "Lead with EU data residency and scaled automation support; ask for a 20-minute renewal review.",
    },
  },
  {
    key: "decision",
    parentKey: "root",
    type: "EVENT",
    name: "select-email-strategy",
    category: "decision",
    start: 4_800,
    end: 4_840,
    brainKind: "decision",
    dependencyKeys: ["reason"],
    agentKey: "planner-agent",
    agentName: "Planner Agent",
    confidence: 0.91,
    reasoningSummary:
      "Select the value-led renewal strategy because verified operational context is stronger than a generic check-in.",
    promptSummary:
      "Choose the outreach strategy with the strongest verified evidence and lowest compliance risk.",
    rejectedAlternatives: [
      "discount-led — no approved commercial concession exists",
      "generic check-in — ignores verified account priorities",
    ],
    inputTokens: 246,
    outputTokens: 54,
    output: {
      selected: "value-led-renewal",
      alternatives: ["discount-led", "generic-check-in"],
      confidence: 0.91,
    },
  },
  {
    key: "policy-tool",
    parentKey: "root",
    type: "TOOL",
    name: "campaign-policy.evaluate",
    category: "tool_call",
    brainKind: "tool",
    start: 4_880,
    end: 5_260,
    dependencyKeys: ["decision"],
    agentKey: "tool-agent",
    agentName: "Tool Agent",
    handoffSummary:
      "Planner requested a policy check before committing to the selected strategy.",
    confidence: 0.99,
    toolUsed: "Campaign Policy Engine",
    toolSelectionReason:
      "The policy engine verifies claims, consent, and customer-contact constraints before drafting.",
    apiLatencyMs: 351,
    input: {
      strategy: "value-led-renewal",
      claims: ["EU data residency", "automation team growth"],
    },
    output: {
      allowed: true,
      blockedClaims: [],
      approvalRequired: true,
    },
  },
  {
    key: "policy-observation",
    parentKey: "root",
    type: "EVENT",
    name: "campaign-policy-observation",
    category: "observation",
    brainKind: "observation",
    start: 5_280,
    end: 5_320,
    dependencyKeys: ["policy-tool"],
    agentKey: "execution-orchestrator",
    agentName: "Execution Orchestrator",
    confidence: 0.99,
    reasoningSummary:
      "The selected strategy passed claim validation and requires manager approval before delivery.",
    output: {
      strategyApproved: true,
      approvalRequired: true,
      evidenceCoverage: "complete",
    },
  },
  {
    key: "updated-plan",
    parentKey: "root",
    type: "SPAN",
    name: "update-renewal-outreach-plan",
    category: "planning",
    brainKind: "updated_plan",
    start: 5_380,
    end: 5_720,
    dependencyKeys: ["policy-observation"],
    agentKey: "planner-agent",
    agentName: "Planner Agent",
    handoffSummary:
      "Execution observation returned to the planner for a policy-aware plan update.",
    confidence: 0.97,
    reasoningSummary:
      "Keep the value-led strategy, constrain the draft to validated claims, and insert manager approval.",
    promptSummary:
      "Update the plan using policy results without changing the approved customer objective.",
    inputTokens: 194,
    outputTokens: 76,
    output: {
      steps: ["draft with validated claims", "manager approval", "send"],
    },
  },
  {
    key: "delivery-decision",
    parentKey: "root",
    type: "EVENT",
    name: "select-approved-delivery-path",
    category: "decision",
    brainKind: "decision",
    start: 5_760,
    end: 5_800,
    dependencyKeys: ["updated-plan"],
    agentKey: "planner-agent",
    agentName: "Planner Agent",
    confidence: 0.96,
    reasoningSummary:
      "Select manager-approved email delivery because the policy engine requires human review.",
    rejectedAlternatives: [
      "automatic send — approval is required",
      "Slack-only follow-up — does not satisfy the customer outreach goal",
    ],
    output: {
      selected: "manager-approved-email",
      approvalRequired: true,
    },
  },
  {
    key: "draft",
    parentKey: "root",
    type: "GENERATION",
    name: "draft-renewal-email",
    category: "reasoning",
    start: 5_860,
    end: 7_340,
    brainKind: "reasoning",
    dependencyKeys: ["delivery-decision"],
    agentKey: "planner-agent",
    agentName: "Planner Agent",
    confidence: 0.95,
    reasoningSummary:
      "Draft a concise executive-ready message using only verified account facts.",
    promptSummary:
      "Produce an executive-ready renewal email constrained to the validated claims and approved strategy.",
    memoryUsed: [
      "Northstar interest in EU data residency",
      "Northstar automation team growth",
    ],
    inputTokens: 824,
    outputTokens: 164,
    output: {
      subject: "Planning Northstar's next phase of automation",
      body: "Hi Avery — with Northstar's automation team growing and EU data residency now available, I'd value 20 minutes to align the renewal with your next phase.",
    },
  },
  {
    key: "approval",
    parentKey: "root",
    type: "EVENT",
    name: "sales-manager-approval",
    category: "approval",
    start: 7_420,
    end: 8_920,
    brainKind: "approval",
    dependencyKeys: ["draft"],
    agentKey: "reviewer-agent",
    agentName: "Reviewer Agent",
    handoffSummary:
      "Planner submitted the customer-facing draft for required human review.",
    confidence: 1,
    reasoningSummary:
      "Require a sales manager to approve the customer-facing message before delivery.",
    output: { approved: true, approver: "sales-manager@mission-control.local" },
  },
  {
    key: "send",
    parentKey: "root",
    type: "TOOL",
    name: "email.send",
    category: "tool_call",
    start: 9_000,
    end: 9_560,
    brainKind: "tool",
    dependencyKeys: ["approval"],
    agentKey: "tool-agent",
    agentName: "Tool Agent",
    handoffSummary:
      "Reviewer approval authorized the tool agent to deliver the message.",
    confidence: 0.99,
    toolUsed: "SendGrid Delivery",
    toolSelectionReason:
      "SendGrid is the approved transactional delivery provider for audited customer outreach.",
    apiLatencyMs: 531,
    input: { to: "avery@northstar.example" },
    output: { status: "sent", messageId: "msg_mc_renewal_001" },
  },
  {
    key: "complete",
    parentKey: "root",
    type: "EVENT",
    name: "renewal-outreach-complete",
    category: "completion",
    start: 9_640,
    end: 9_680,
    brainKind: "completion",
    dependencyKeys: ["send"],
    agentKey: "execution-orchestrator",
    agentName: "Execution Orchestrator",
    handoffSummary:
      "Delivery confirmation returned to the orchestrator for terminal completion.",
    confidence: 1,
    reasoningSummary:
      "All required context, approval, and delivery checks completed successfully.",
    output: { status: "succeeded" },
  },
];

const run = async (
  ctx: ScenarioContext,
  params: Record<string, string | number | boolean>,
): Promise<SeedSummary> => {
  const startedAt = Date.now();
  const withV4 = params["v4"] as boolean;
  const traceId = `${ctx.idPrefix}-sales-email-run`;
  const sessionId = `${ctx.idPrefix}-sales-campaign`;
  const traceTimestamp = utcDayStartMs();
  const links = [
    runLink(ctx, traceId, traceTimestamp),
    traceLink(ctx, traceId, traceTimestamp),
    sessionLink(ctx, sessionId),
  ];

  if (ctx.dryRun) {
    return {
      scenario: "sales-email-agent",
      target: "clickhouse",
      params,
      projectId: ctx.projectId,
      environment: ctx.environment,
      traceIds: [traceId],
      sessionIds: [sessionId],
      counts: {
        traces: 1,
        observations: STEPS.length,
        events: withV4 ? STEPS.length + 1 : 0,
      },
      verified: {},
      links,
      dryRun: true,
      durationMs: Date.now() - startedAt,
    };
  }

  const root = STEPS[0];
  const trace = createTrace({
    id: traceId,
    project_id: ctx.projectId,
    environment: ctx.environment,
    name: "enterprise-sales-email-agent",
    timestamp: traceTimestamp,
    user_id: "sales-ops@mission-control.local",
    session_id: sessionId,
    release: "mission-control-m4",
    version: "sales-email-v1",
    tags: ["mission-control", "sales", "enterprise"],
    public: false,
    bookmarked: false,
    metadata: {
      scenario: "sales-email-agent",
      "mission_control.agent.key": "enterprise-sales-email-agent",
      "mission_control.agent.name": "Enterprise Sales Email Agent",
      "mission_control.agent.version": "1.0.0",
    },
    input: JSON.stringify(root.input),
    output: JSON.stringify(root.output),
    created_at: traceTimestamp,
    updated_at: traceTimestamp + root.end,
    event_ts: traceTimestamp + root.end,
  });

  const keyToId = new Map(
    STEPS.map((step, index) => [
      step.key,
      `${ctx.idPrefix}-sales-email-${index}`,
    ]),
  );
  const observations: ObservationRecordInsertType[] = STEPS.map((step) =>
    createObservation({
      id: keyToId.get(step.key)!,
      trace_id: traceId,
      project_id: ctx.projectId,
      environment: ctx.environment,
      type: step.type,
      parent_observation_id:
        step.parentKey === null ? null : (keyToId.get(step.parentKey) ?? null),
      name: step.name,
      start_time: traceTimestamp + step.start,
      end_time: traceTimestamp + step.end,
      completion_start_time: null,
      level: step.level ?? "DEFAULT",
      status_message: step.statusMessage ?? null,
      version: step.type === "AGENT" ? "1.0.0" : null,
      input: step.input === undefined ? null : JSON.stringify(step.input),
      output: step.output === undefined ? null : JSON.stringify(step.output),
      metadata: {
        scenario: "sales-email-agent",
        "mission_control.event.category": step.category,
        ...(step.confidence === undefined
          ? {}
          : {
              "mission_control.event.confidence": String(step.confidence),
            }),
        ...(step.toolUsed
          ? { "mission_control.tool.name": step.toolUsed }
          : {}),
        ...(step.reasoningSummary
          ? {
              "mission_control.reasoning.summary": step.reasoningSummary,
            }
          : {}),
        ...(step.brainKind
          ? { "mission_control.brain.kind": step.brainKind }
          : {}),
        ...(step.promptSummary
          ? { "mission_control.prompt.summary": step.promptSummary }
          : {}),
        ...(step.toolSelectionReason
          ? {
              "mission_control.tool.selection_reason": step.toolSelectionReason,
            }
          : {}),
        ...(step.rejectedAlternatives
          ? {
              "mission_control.decision.rejected_alternatives": JSON.stringify(
                step.rejectedAlternatives,
              ),
            }
          : {}),
        ...(step.memoryUsed
          ? {
              "mission_control.memory.used": JSON.stringify(step.memoryUsed),
            }
          : {}),
        ...(step.dependencyKeys
          ? {
              "mission_control.dependencies": JSON.stringify(
                step.dependencyKeys.map((key) => keyToId.get(key)!),
              ),
            }
          : {}),
        ...(step.inputTokens === undefined
          ? {}
          : { "mission_control.tokens.input": String(step.inputTokens) }),
        ...(step.outputTokens === undefined
          ? {}
          : { "mission_control.tokens.output": String(step.outputTokens) }),
        ...(step.agentKey
          ? {
              "mission_control.agent.key": step.agentKey,
              "mission_control.agent.name": step.agentName ?? step.agentKey,
              "mission_control.agent.version": "1.0.0",
            }
          : {}),
        ...(step.handoffSummary
          ? { "mission_control.handoff.summary": step.handoffSummary }
          : {}),
        ...(step.apiLatencyMs === undefined
          ? {}
          : {
              "mission_control.api.latency_ms": String(step.apiLatencyMs),
            }),
        ...(step.eventStatus
          ? { "mission_control.event.status": step.eventStatus }
          : {}),
        ...(step.type === "AGENT"
          ? {
              "mission_control.agent.key":
                step.agentKey ?? "enterprise-sales-email-agent",
              "mission_control.agent.name":
                step.agentName ?? "Enterprise Sales Email Agent",
              "mission_control.agent.version": "1.0.0",
            }
          : {}),
      },
      provided_model_name: step.type === "GENERATION" ? "gpt-4.1-mini" : null,
      internal_model_id: null,
      model_parameters:
        step.type === "GENERATION"
          ? JSON.stringify({ temperature: 0.2 })
          : "{}",
      provided_usage_details: {},
      usage_details: {},
      provided_cost_details: {},
      cost_details: {},
      total_cost: null,
      prompt_id: null,
      prompt_name: null,
      prompt_version: null,
      created_at: traceTimestamp + step.start,
      updated_at: traceTimestamp + step.end,
      event_ts: traceTimestamp + step.end,
    }),
  );
  const events = withV4
    ? [
        traceToEvent(trace),
        ...observations.map((observation) =>
          observationToEvent(observation, trace),
        ),
      ]
    : [];

  await createTracesCh([trace]);
  for (const batch of chunk(observations, 1_000)) {
    await createObservationsCh(batch);
  }
  for (const batch of chunk(events, 500)) {
    await createEventsCh(batch);
  }

  const verified = {
    traces: await countRows(
      "traces",
      "project_id = {projectId: String} AND id = {traceId: String}",
      { projectId: ctx.projectId, traceId },
      "uniqExact(id)",
    ),
    observations: await countRows(
      "observations",
      "project_id = {projectId: String} AND trace_id = {traceId: String}",
      { projectId: ctx.projectId, traceId },
      "uniqExact(id)",
    ),
    ...(withV4
      ? {
          events: await countRows(
            "events_full",
            "project_id = {projectId: String} AND trace_id = {traceId: String}",
            { projectId: ctx.projectId, traceId },
            "uniqExact(span_id)",
          ),
        }
      : {}),
  };

  if (verified.traces < 1 || verified.observations < observations.length) {
    throw new SeedError(
      `Readback mismatch for sales-email run ${traceId}: ${JSON.stringify(verified)}`,
    );
  }
  if (withV4 && (verified.events ?? 0) < events.length) {
    throw new SeedError(
      `Readback mismatch: expected ${events.length} events, found ${verified.events ?? 0}`,
    );
  }

  return {
    scenario: "sales-email-agent",
    target: "clickhouse",
    params,
    projectId: ctx.projectId,
    environment: ctx.environment,
    traceIds: [traceId],
    sessionIds: [sessionId],
    counts: {
      traces: 1,
      observations: observations.length,
      events: events.length,
    },
    verified,
    links,
    dryRun: false,
    durationMs: Date.now() - startedAt,
  };
};

export const salesEmailAgentScenario: ScenarioDefinition = {
  name: "sales-email-agent",
  description:
    "One deterministic enterprise sales-email run with explicit Mission Control agent identity and semantic task, plan, memory, reasoning, decision, approval, tool, and completion events.",
  supportsV4: true,
  flags: [
    {
      flag: "v4",
      type: "boolean",
      default: false,
      description: "also mirror into v4 events_full/events_core",
    },
  ],
  run,
};
