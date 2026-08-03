-- Durable, tenant-scoped human exception decisions for Mission Control runs.
-- Telemetry stays in ClickHouse; this table stores only mutable control-plane
-- state that an agent runtime may explicitly consume.
CREATE TYPE "AgentExecutionExceptionType" AS ENUM (
    'PO_FIELD_AMBIGUITY',
    'CUSTOMER_POLICY_CONFLICT',
    'TOOL_FAILURE',
    'DATA_MISMATCH',
    'DEADLINE_RISK'
);

CREATE TYPE "AgentExecutionExceptionSeverity" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);

CREATE TYPE "AgentExecutionExceptionStatus" AS ENUM (
    'OPEN',
    'APPROVED',
    'REJECTED',
    'ESCALATED'
);

CREATE TABLE "agent_execution_exceptions" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "event_id" TEXT,
    "dedupe_key" TEXT NOT NULL,
    "type" "AgentExecutionExceptionType" NOT NULL,
    "severity" "AgentExecutionExceptionSeverity" NOT NULL,
    "status" "AgentExecutionExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "proposed_action" TEXT,
    "evidence" JSONB,
    "source_event_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "resolution_reason" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_user_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_execution_exceptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agent_execution_exceptions_project_id_run_id_dedupe_key_key"
ON "agent_execution_exceptions"("project_id", "run_id", "dedupe_key");

CREATE INDEX "agent_execution_exceptions_project_id_run_id_created_at_id_idx"
ON "agent_execution_exceptions"("project_id", "run_id", "created_at" DESC, "id");

CREATE INDEX "agent_execution_exceptions_project_id_status_severity_created_at_id_idx"
ON "agent_execution_exceptions"("project_id", "status", "severity", "created_at" DESC, "id");

CREATE INDEX "agent_execution_exceptions_resolved_by_user_id_idx"
ON "agent_execution_exceptions"("resolved_by_user_id");

ALTER TABLE "agent_execution_exceptions"
ADD CONSTRAINT "agent_execution_exceptions_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_execution_exceptions"
ADD CONSTRAINT "agent_execution_exceptions_resolved_by_user_id_fkey"
FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
