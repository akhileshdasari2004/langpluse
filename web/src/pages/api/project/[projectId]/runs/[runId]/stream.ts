import type { NextApiRequest, NextApiResponse } from "next";
import type {
  AgentExecutionEvent,
  AgentExecutionProjection,
} from "@langfuse/shared";
import { prisma } from "@langfuse/shared/src/db";
import { env } from "@langfuse/shared/src/env";
import {
  getAgentExecutionProjection,
  getTraceById,
  getTraceByIdFromEventsTable,
  logger,
} from "@langfuse/shared/src/server";
import { getServerAuthSession } from "@/src/server/auth";
import { sendAdminAccessWebhook } from "@/src/server/adminAccessWebhook";
import { throwIfNoProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import {
  RunStreamQuerySchema,
  type RunStreamMessage,
} from "@/src/features/agent-executions/live/schema";
import {
  createRunEventCursor,
  isEventAfterCursor,
} from "@/src/features/agent-executions/live/runEventBuffer";
import { resolveRunStreamAccess } from "@/src/features/agent-executions/live/server/access";

const POLL_INTERVAL_MS = 1_000;
const MAX_STREAM_LIFETIME_MS = 55_000;
const MAX_CONNECTIONS_PER_USER = 4;
const MAX_SNAPSHOT_EVENTS = 1_000;
const MAX_METADATA_BYTES = 12_000;
const activeConnections = new Map<string, number>();

type StreamEventName =
  | "snapshot"
  | "append"
  | "correction"
  | "heartbeat"
  | "completion"
  | "stream-error";

function singleQueryValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function formatSseMessage(
  eventName: StreamEventName,
  message: RunStreamMessage,
  id?: string,
) {
  return `${id ? `id: ${id}\n` : ""}event: ${eventName}\ndata: ${JSON.stringify(message)}\n\n`;
}

function compactMetadata(
  metadata: AgentExecutionEvent["metadata"],
): AgentExecutionEvent["metadata"] {
  const serialized = JSON.stringify(metadata);
  if (serialized.length <= MAX_METADATA_BYTES) return metadata;

  const compact = Object.fromEntries(
    Object.entries(metadata).filter(([key, value]) => {
      const isMissionControlField =
        key.startsWith("mission_control.") || key === "scenario";
      const isSmallScalar =
        (typeof value === "string" && value.length <= 1_000) ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null;
      return isMissionControlField || isSmallScalar;
    }),
  );

  return {
    ...compact,
    "mission_control.stream.metadata_truncated": true,
  };
}

function compactEvent(event: AgentExecutionEvent): AgentExecutionEvent {
  return { ...event, metadata: compactMetadata(event.metadata) };
}

function compactProjection(
  projection: AgentExecutionProjection,
  events = projection.events.slice(-MAX_SNAPSHOT_EVENTS),
): AgentExecutionProjection {
  return {
    ...projection,
    events: events.map(compactEvent),
  };
}

function eventFingerprint(event: AgentExecutionEvent): string {
  return JSON.stringify(event);
}

function waitForNextPoll(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
}

async function findTrace({
  projectId,
  runId,
  timestamp,
}: {
  projectId: string;
  runId: string;
  timestamp?: Date;
}) {
  const isEventsOnly = env.LANGFUSE_MIGRATION_V4_WRITE_MODE === "events_only";
  // The routing wrapper preserves compatibility for legacy and dual-write
  // projects while the explicit events-table fallback covers events-only runs.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  let trace = await getTraceById({
    projectId,
    traceId: runId,
    timestamp: isEventsOnly ? undefined : timestamp,
    fromTimestamp: isEventsOnly ? timestamp : undefined,
    excludeInputOutput: true,
  });

  if (
    !trace &&
    (isEventsOnly || env.LANGFUSE_MIGRATION_V4_WRITE_MODE === "dual")
  ) {
    trace = await getTraceByIdFromEventsTable({
      projectId,
      traceId: runId,
      fromTimestamp: timestamp,
      excludeInputOutput: true,
    });
  }

  return trace;
}

function isSeededSalesWorkflow(projection: AgentExecutionProjection) {
  return projection.events.some(
    (event) => event.metadata.scenario === "sales-email-agent",
  );
}

async function streamSeededReplay({
  req,
  res,
  projection,
  lastEventId,
}: {
  req: NextApiRequest;
  res: NextApiResponse;
  projection: AgentExecutionProjection;
  lastEventId: string | null;
}) {
  let aborted = false;
  req.once("close", () => {
    aborted = true;
  });

  const allEvents = projection.events;
  const resumeIndex = lastEventId
    ? allEvents.findIndex(
        (event) => createRunEventCursor(event) === lastEventId,
      ) + 1
    : 0;
  const initialCount = Math.max(1, resumeIndex);
  const initialEvents = allEvents.slice(0, initialCount);
  let cursor = initialEvents.at(-1)
    ? createRunEventCursor(initialEvents.at(-1)!)
    : null;

  res.write(
    formatSseMessage(
      "snapshot",
      {
        type: "snapshot",
        cursor,
        replace: !lastEventId,
        projection: compactProjection(
          {
            ...projection,
            status: "RUNNING",
            endedAt: null,
            latencySeconds: null,
          },
          initialEvents,
        ),
      },
      cursor ?? undefined,
    ),
  );

  for (const event of allEvents.slice(initialCount)) {
    if (aborted) return;
    await new Promise((resolve) => setTimeout(resolve, 650));
    if (aborted) return;
    cursor = createRunEventCursor(event);
    res.write(
      formatSseMessage(
        "append",
        {
          type: "append",
          cursor,
          event: compactEvent(event),
        },
        cursor,
      ),
    );
  }

  if (!aborted) {
    const status = projection.status === "FAILED" ? "FAILED" : "SUCCEEDED";
    res.write(
      formatSseMessage("completion", {
        type: "completion",
        cursor,
        status,
        endedAt: projection.endedAt ?? new Date(),
      }),
    );
  }
}

async function streamLiveRun({
  req,
  res,
  trace,
  initialProjection,
  useEventsTable,
  lastEventId,
}: {
  req: NextApiRequest;
  res: NextApiResponse;
  trace: NonNullable<Awaited<ReturnType<typeof findTrace>>>;
  initialProjection: AgentExecutionProjection;
  useEventsTable: boolean;
  lastEventId: string | null;
}) {
  let aborted = false;
  req.once("close", () => {
    aborted = true;
  });

  const knownEvents = new Map(
    initialProjection.events.map((event) => [
      event.id,
      eventFingerprint(event),
    ]),
  );
  let cursor =
    initialProjection.events.at(-1) !== undefined
      ? createRunEventCursor(initialProjection.events.at(-1)!)
      : null;

  res.write(
    formatSseMessage(
      "snapshot",
      {
        type: "snapshot",
        cursor,
        replace: false,
        projection: compactProjection(
          initialProjection,
          lastEventId
            ? initialProjection.events.filter((event) =>
                isEventAfterCursor(event, lastEventId),
              )
            : undefined,
        ),
      },
      cursor ?? undefined,
    ),
  );

  if (
    initialProjection.status === "SUCCEEDED" ||
    initialProjection.status === "FAILED"
  ) {
    res.write(
      formatSseMessage("completion", {
        type: "completion",
        cursor,
        status: initialProjection.status,
        endedAt: initialProjection.endedAt ?? new Date(),
      }),
    );
    return;
  }

  const expiresAt = Date.now() + MAX_STREAM_LIFETIME_MS;
  while (!aborted && Date.now() < expiresAt) {
    await waitForNextPoll();
    if (aborted) return;

    const queryStartedAt = Date.now();
    const projection = await getAgentExecutionProjection({
      trace,
      useEventsTable,
    });

    for (const event of projection.events) {
      const fingerprint = eventFingerprint(event);
      const knownFingerprint = knownEvents.get(event.id);
      if (knownFingerprint === fingerprint) continue;

      knownEvents.set(event.id, fingerprint);
      const nextCursor = createRunEventCursor(event);
      const advancesCursor = !cursor || isEventAfterCursor(event, cursor);
      if (advancesCursor) cursor = nextCursor;
      res.write(
        formatSseMessage(
          knownFingerprint ? "correction" : "append",
          {
            type: knownFingerprint ? "correction" : "append",
            cursor: cursor ?? nextCursor,
            event: compactEvent(event),
          },
          advancesCursor ? (cursor ?? undefined) : undefined,
        ),
      );
    }

    res.write(
      formatSseMessage("heartbeat", {
        type: "heartbeat",
        cursor,
        serverTime: new Date(),
        queryLatencyMs: Date.now() - queryStartedAt,
      }),
    );

    if (projection.status === "SUCCEEDED" || projection.status === "FAILED") {
      res.write(
        formatSseMessage("completion", {
          type: "completion",
          cursor,
          status: projection.status,
          endedAt: projection.endedAt ?? new Date(),
        }),
      );
      return;
    }
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).end();
    return;
  }

  const parsed = RunStreamQuerySchema.safeParse({
    projectId: singleQueryValue(req.query.projectId),
    runId: singleQueryValue(req.query.runId),
    timestamp: singleQueryValue(req.query.timestamp),
    demo: singleQueryValue(req.query.demo),
  });
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid stream request" });
    return;
  }

  const session = await getServerAuthSession({ req, res });
  const access = resolveRunStreamAccess(session, parsed.data.projectId);
  if (access.kind === "unauthorized") {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  if (access.kind === "forbidden") {
    res.status(403).json({ message: "Not a member of this project" });
    return;
  }

  let projectRole = access.kind === "member" ? access.role : undefined;
  let organizationId =
    access.kind === "member" ? access.organizationId : undefined;
  if (access.kind === "admin") {
    const project = await prisma.project.findFirst({
      where: { id: parsed.data.projectId, deletedAt: null },
      select: { orgId: true },
    });
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    projectRole = "OWNER";
    organizationId = project.orgId;
  }

  if (!projectRole) {
    res.status(403).json({ message: "Insufficient project access" });
    return;
  }
  try {
    throwIfNoProjectAccess({
      role: projectRole,
      admin: session?.user?.admin,
      scope: "project:read",
    });
  } catch {
    res.status(403).json({ message: "Insufficient project access" });
    return;
  }

  if (session?.user?.admin === true && organizationId) {
    await sendAdminAccessWebhook({
      email: session.user.email,
      projectId: parsed.data.projectId,
      orgId: organizationId,
    });
  }

  const userId = session!.user!.id;
  const connectionCount = activeConnections.get(userId) ?? 0;
  if (connectionCount >= MAX_CONNECTIONS_PER_USER) {
    res.status(429).json({ message: "Too many active run streams" });
    return;
  }
  activeConnections.set(userId, connectionCount + 1);

  try {
    const trace = await findTrace({
      projectId: parsed.data.projectId,
      runId: parsed.data.runId,
      timestamp: parsed.data.timestamp,
    });
    if (!trace) {
      res.status(404).json({ message: "Run not found" });
      return;
    }

    const useEventsTable =
      env.LANGFUSE_MIGRATION_V4_WRITE_MODE === "events_only" ||
      session?.user?.v4BetaEnabled === true;
    const projection = await getAgentExecutionProjection({
      trace,
      useEventsTable,
    });

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    res.write("retry: 1500\n\n");

    const lastEventId =
      singleQueryValue(req.headers["last-event-id"])?.slice(0, 500) ?? null;
    if (parsed.data.demo && isSeededSalesWorkflow(projection)) {
      await streamSeededReplay({
        req,
        res,
        projection,
        lastEventId,
      });
    } else {
      await streamLiveRun({
        req,
        res,
        trace,
        initialProjection: projection,
        useEventsTable,
        lastEventId,
      });
    }
  } catch (error) {
    logger.error("[run-stream] Streaming failed", {
      error: error instanceof Error ? error.message : String(error),
      projectId: parsed.data.projectId,
      runId: parsed.data.runId,
    });
    if (!res.headersSent) {
      res.status(500).json({ message: "Unable to stream this run" });
    } else {
      res.write(
        formatSseMessage("stream-error", {
          type: "error",
          message: "Live updates are temporarily unavailable",
          retryable: true,
        }),
      );
    }
  } finally {
    const remaining = (activeConnections.get(userId) ?? 1) - 1;
    if (remaining > 0) activeConnections.set(userId, remaining);
    else activeConnections.delete(userId);
    res.end();
  }
}
