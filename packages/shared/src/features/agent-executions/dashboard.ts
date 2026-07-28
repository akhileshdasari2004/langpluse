import { z } from "zod";

export const MissionControlDashboardInputSchema = z
  .object({
    projectId: z.string().min(1),
    from: z.date(),
    to: z.date(),
  })
  .refine(({ from, to }) => to.getTime() > from.getTime(), {
    message: "Dashboard end time must be after its start time",
    path: ["to"],
  })
  .refine(
    ({ from, to }) =>
      to.getTime() - from.getTime() <= 31 * 24 * 60 * 60 * 1_000,
    {
      message: "Dashboard time range cannot exceed 31 days",
      path: ["from"],
    },
  );

export type MissionControlDashboardInput = z.infer<
  typeof MissionControlDashboardInputSchema
>;

export type MissionControlMetricId =
  | "activeAgents"
  | "runningExecutions"
  | "successfulExecutions"
  | "failedExecutions"
  | "averageLatency"
  | "executionQuality"
  | "memoryRetrievalAccuracy"
  | "toolSuccessRate"
  | "averageCost";

export type MissionControlMetric = {
  value: number;
  previousValue: number;
  trend: "up" | "down" | "steady";
};

export type MissionControlExecutionStatus = "RUNNING" | "SUCCEEDED" | "FAILED";

export type MissionControlRecentExecution = {
  id: string;
  agent: string;
  workflow: string;
  account: string;
  status: MissionControlExecutionStatus;
  startedAt: Date;
  latencySeconds: number | null;
  qualityScore: number | null;
  costUsd: number;
};

export type MissionControlHealthService = {
  id: string;
  name: string;
  status: "OPERATIONAL" | "DEGRADED" | "INCIDENT";
  availability: number;
  latencyMs: number;
};

export type MissionControlRankedAgent = {
  name: string;
  team: string;
  failures: number;
  failureRate: number;
};

export type MissionControlRankedTool = {
  name: string;
  calls: number;
  successRate: number;
};

export type MissionControlTrendPoint = {
  timestamp: Date;
  successful: number;
  failed: number;
  running: number;
};

export type MissionControlActivity = {
  id: string;
  occurredAt: Date;
  agent: string;
  summary: string;
  category: "EXECUTION" | "TOOL" | "MEMORY" | "APPROVAL" | "FAILURE";
  status: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
};

export type MissionControlDashboardSnapshot = {
  generatedAt: Date;
  source: "SEEDED_ENTERPRISE_WORKFLOW";
  window: { from: Date; to: Date };
  workflow: {
    name: string;
    environment: string;
    region: string;
  };
  metrics: Record<MissionControlMetricId, MissionControlMetric>;
  recentExecutions: MissionControlRecentExecution[];
  systemHealth: MissionControlHealthService[];
  topFailingAgents: MissionControlRankedAgent[];
  topUsedTools: MissionControlRankedTool[];
  executionTrend: MissionControlTrendPoint[];
  activity: MissionControlActivity[];
};

const seededNumber = (projectId: string) =>
  [...projectId].reduce((total, character) => total + character.charCodeAt(0), 0);

const dateBefore = (now: Date, seconds: number) =>
  new Date(now.getTime() - seconds * 1_000);

/**
 * Deterministic enterprise demo snapshot for the seeded Sales Email workflow.
 * The five-second pulse changes operational counters while keeping the same
 * project and timestamp stable for tests and server rendering.
 */
export function buildMissionControlDashboardSnapshot(params: {
  projectId: string;
  from: Date;
  to: Date;
  now?: Date;
}): MissionControlDashboardSnapshot {
  const now = params.now ?? new Date();
  const seed = seededNumber(params.projectId);
  const pulse = Math.floor(now.getTime() / 5_000) % 11;
  const previousPulse = (pulse + 10) % 11;
  const metric = (
    value: number,
    previousValue: number,
  ): MissionControlMetric => ({
    value,
    previousValue,
    trend:
      value === previousValue ? "steady" : value > previousValue ? "up" : "down",
  });

  const trendBase = Math.floor(now.getTime() / (60 * 60 * 1_000));
  const executionTrend = Array.from({ length: 24 }, (_, index) => {
    const hour = trendBase - (23 - index);
    const wave = Math.round(Math.sin((hour + seed) / 2.4) * 7);
    return {
      timestamp: new Date(hour * 60 * 60 * 1_000),
      successful: 43 + ((hour + seed) % 16) + wave,
      failed: 1 + Math.abs((hour + seed) % 4),
      running: 3 + Math.abs((hour + seed) % 7),
    };
  });

  return {
    generatedAt: now,
    source: "SEEDED_ENTERPRISE_WORKFLOW",
    window: { from: params.from, to: params.to },
    workflow: {
      name: "Enterprise Sales Email",
      environment: "production",
      region: "us-east-1",
    },
    metrics: {
      activeAgents: metric(12, 11),
      runningExecutions: metric(7 + (pulse % 3), 7 + (previousPulse % 3)),
      successfulExecutions: metric(
        1_248 + pulse * 3,
        1_248 + previousPulse * 3,
      ),
      failedExecutions: metric(37 + (pulse % 2), 37 + (previousPulse % 2)),
      averageLatency: metric(1.84 + (pulse % 3) * 0.03, 1.9),
      executionQuality: metric(94.2 + (pulse % 2) * 0.1, 93.8),
      memoryRetrievalAccuracy: metric(91.8, 90.9),
      toolSuccessRate: metric(98.6 - (pulse % 2) * 0.1, 98.2),
      averageCost: metric(0.084 + (pulse % 3) * 0.001, 0.088),
    },
    recentExecutions: [
      {
        id: "sales-email-acme-renewal",
        agent: "Sales Email Orchestrator",
        workflow: "Renewal outreach",
        account: "Acme Manufacturing",
        status: "RUNNING",
        startedAt: dateBefore(now, 18),
        latencySeconds: null,
        qualityScore: null,
        costUsd: 0.041,
      },
      {
        id: "sales-email-northstar-expansion",
        agent: "Account Research Agent",
        workflow: "Expansion signal research",
        account: "Northstar Health",
        status: "SUCCEEDED",
        startedAt: dateBefore(now, 76),
        latencySeconds: 2.14,
        qualityScore: 96.4,
        costUsd: 0.092,
      },
      {
        id: "sales-email-contoso-follow-up",
        agent: "Personalization Agent",
        workflow: "Executive follow-up",
        account: "Contoso Energy",
        status: "SUCCEEDED",
        startedAt: dateBefore(now, 143),
        latencySeconds: 1.72,
        qualityScore: 94.8,
        costUsd: 0.078,
      },
      {
        id: "sales-email-globex-recovery",
        agent: "CRM Enrichment Agent",
        workflow: "Pipeline recovery",
        account: "Globex Retail",
        status: "FAILED",
        startedAt: dateBefore(now, 228),
        latencySeconds: 3.96,
        qualityScore: null,
        costUsd: 0.063,
      },
      {
        id: "sales-email-umbrella-intro",
        agent: "Compliance Review Agent",
        workflow: "Regulated-industry intro",
        account: "Umbrella Financial",
        status: "SUCCEEDED",
        startedAt: dateBefore(now, 312),
        latencySeconds: 2.43,
        qualityScore: 97.1,
        costUsd: 0.104,
      },
      {
        id: "sales-email-initech-reengagement",
        agent: "Sales Email Orchestrator",
        workflow: "Dormant lead re-engagement",
        account: "Initech Systems",
        status: "SUCCEEDED",
        startedAt: dateBefore(now, 451),
        latencySeconds: 1.58,
        qualityScore: 93.7,
        costUsd: 0.069,
      },
    ],
    systemHealth: [
      {
        id: "orchestrator",
        name: "Agent Orchestrator",
        status: "OPERATIONAL",
        availability: 99.99,
        latencyMs: 42,
      },
      {
        id: "memory",
        name: "Vector Memory",
        status: "OPERATIONAL",
        availability: 99.97,
        latencyMs: 68,
      },
      {
        id: "tool-gateway",
        name: "Tool Gateway",
        status: "OPERATIONAL",
        availability: 99.95,
        latencyMs: 91,
      },
      {
        id: "model-provider",
        name: "Model Provider",
        status: pulse === 7 ? "DEGRADED" : "OPERATIONAL",
        availability: 99.91,
        latencyMs: 318 + pulse * 4,
      },
    ],
    topFailingAgents: [
      {
        name: "CRM Enrichment Agent",
        team: "Revenue Operations",
        failures: 14,
        failureRate: 3.8,
      },
      {
        name: "Account Research Agent",
        team: "Sales Intelligence",
        failures: 9,
        failureRate: 2.1,
      },
      {
        name: "Compliance Review Agent",
        team: "Trust & Safety",
        failures: 7,
        failureRate: 1.6,
      },
      {
        name: "Personalization Agent",
        team: "Growth Engineering",
        failures: 5,
        failureRate: 0.9,
      },
    ],
    topUsedTools: [
      { name: "Salesforce CRM", calls: 3_842 + pulse, successRate: 99.1 },
      { name: "Company Intelligence", calls: 2_914, successRate: 98.7 },
      { name: "Vector Memory Search", calls: 2_506, successRate: 97.9 },
      { name: "Email Policy Validator", calls: 1_988, successRate: 99.8 },
      { name: "SendGrid Delivery", calls: 1_427, successRate: 99.4 },
    ],
    executionTrend,
    activity: [
      {
        id: `activity-${pulse}-1`,
        occurredAt: dateBefore(now, 4),
        agent: "Sales Email Orchestrator",
        summary: "Started renewal outreach for Acme Manufacturing",
        category: "EXECUTION",
        status: "INFO",
      },
      {
        id: `activity-${pulse}-2`,
        occurredAt: dateBefore(now, 19),
        agent: "Account Research Agent",
        summary: "Found three expansion signals in account research",
        category: "MEMORY",
        status: "SUCCESS",
      },
      {
        id: `activity-${pulse}-3`,
        occurredAt: dateBefore(now, 47),
        agent: "Compliance Review Agent",
        summary: "Approved regulated-industry email policy checks",
        category: "APPROVAL",
        status: "SUCCESS",
      },
      {
        id: `activity-${pulse}-4`,
        occurredAt: dateBefore(now, 81),
        agent: "CRM Enrichment Agent",
        summary: "Salesforce enrichment timed out after the final retry",
        category: "FAILURE",
        status: "ERROR",
      },
      {
        id: `activity-${pulse}-5`,
        occurredAt: dateBefore(now, 126),
        agent: "Personalization Agent",
        summary: "Generated executive-ready email with a 96 quality score",
        category: "TOOL",
        status: "SUCCESS",
      },
    ],
  };
}
