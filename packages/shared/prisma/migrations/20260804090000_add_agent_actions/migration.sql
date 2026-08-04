CREATE TYPE "AgentActionStatus" AS ENUM ('BLOCKED', 'APPROVED', 'QUEUED', 'DISPATCHING', 'SUCCEEDED', 'FAILED', 'REQUIRES_RECONCILIATION', 'CANCELLED');
CREATE TYPE "AgentActionProvider" AS ENUM ('GMAIL', 'SALESFORCE', 'HUBSPOT', 'PRINTAVO');

CREATE TABLE "agent_actions" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "run_id" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "provider" "AgentActionProvider" NOT NULL,
  "action_type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "payload_hash" TEXT NOT NULL,
  "status" "AgentActionStatus" NOT NULL DEFAULT 'BLOCKED',
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "external_reference" TEXT,
  "failure_code" TEXT,
  "failure_summary" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "approved_at" TIMESTAMP(3),
  "approved_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_actions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agent_actions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "agent_actions_project_id_idempotency_key_key" ON "agent_actions"("project_id", "idempotency_key");
CREATE INDEX "agent_actions_project_id_run_id_created_at_id_idx" ON "agent_actions"("project_id", "run_id", "created_at" DESC, "id");
CREATE INDEX "agent_actions_project_id_status_created_at_id_idx" ON "agent_actions"("project_id", "status", "created_at" DESC, "id");

CREATE TABLE "agent_action_attempts" (
  "id" TEXT NOT NULL,
  "action_id" TEXT NOT NULL,
  "attempt" INTEGER NOT NULL,
  "outcome" TEXT NOT NULL,
  "summary" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_action_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agent_action_attempts_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "agent_actions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "agent_action_attempts_action_id_attempt_key" ON "agent_action_attempts"("action_id", "attempt");
CREATE INDEX "agent_action_attempts_action_id_created_at_id_idx" ON "agent_action_attempts"("action_id", "created_at" DESC, "id");
