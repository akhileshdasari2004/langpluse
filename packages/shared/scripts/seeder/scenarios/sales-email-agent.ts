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
    | "approval"
    | "completion";
  start: number;
  end: number;
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
    end: 8_400,
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
    input: { query: "Northstar Logistics renewal priorities" },
    output: {
      memories: [
        "Interested in EU data residency",
        "Expanded automation team by 30%",
      ],
    },
  },
  {
    key: "reason",
    parentKey: "root",
    type: "GENERATION",
    name: "reason-about-renewal-angle",
    category: "reasoning",
    start: 1_680,
    end: 3_260,
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
    start: 3_320,
    end: 3_360,
    output: {
      selected: "value-led-renewal",
      alternatives: ["discount-led", "generic-check-in"],
      confidence: 0.91,
    },
  },
  {
    key: "draft",
    parentKey: "root",
    type: "GENERATION",
    name: "draft-renewal-email",
    category: "reasoning",
    start: 3_440,
    end: 5_480,
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
    start: 5_560,
    end: 7_380,
    output: { approved: true, approver: "sales-manager@mission-control.local" },
  },
  {
    key: "send",
    parentKey: "root",
    type: "TOOL",
    name: "email.send",
    category: "tool_call",
    start: 7_460,
    end: 8_020,
    input: { to: "avery@northstar.example" },
    output: { status: "sent", messageId: "msg_mc_renewal_001" },
  },
  {
    key: "complete",
    parentKey: "root",
    type: "EVENT",
    name: "renewal-outreach-complete",
    category: "completion",
    start: 8_100,
    end: 8_140,
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
    release: "mission-control-m1",
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
      level: "DEFAULT",
      status_message: null,
      version: step.type === "AGENT" ? "1.0.0" : null,
      input: step.input === undefined ? null : JSON.stringify(step.input),
      output: step.output === undefined ? null : JSON.stringify(step.output),
      metadata: {
        scenario: "sales-email-agent",
        "mission_control.event.category": step.category,
        ...(step.type === "AGENT"
          ? {
              "mission_control.agent.key": "enterprise-sales-email-agent",
              "mission_control.agent.name": "Enterprise Sales Email Agent",
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
