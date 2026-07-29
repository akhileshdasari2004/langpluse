-- Additive control-plane records for isolated Mission Control simulations.
-- Raw execution telemetry remains in ClickHouse; this stores only scenario
-- configuration and the compact simulated projection/result.
CREATE TABLE "simulation_scenarios" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "source_run_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "definition_version" INTEGER NOT NULL DEFAULT 1,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulation_scenarios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "simulation_runs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "scenario_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "deterministic_seed" TEXT NOT NULL,
    "model" TEXT,
    "result" JSONB,
    "error" TEXT,
    "cancel_requested_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "triggered_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulation_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "simulation_scenarios_project_id_created_at_id_idx"
ON "simulation_scenarios"("project_id", "created_at" DESC, "id");

CREATE INDEX "simulation_scenarios_project_id_source_run_id_created_at_id_idx"
ON "simulation_scenarios"("project_id", "source_run_id", "created_at" DESC, "id");

CREATE INDEX "simulation_runs_project_id_status_created_at_id_idx"
ON "simulation_runs"("project_id", "status", "created_at" DESC, "id");

CREATE INDEX "simulation_runs_scenario_id_created_at_id_idx"
ON "simulation_runs"("scenario_id", "created_at" DESC, "id");

ALTER TABLE "simulation_scenarios"
ADD CONSTRAINT "simulation_scenarios_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "simulation_scenarios"
ADD CONSTRAINT "simulation_scenarios_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "simulation_runs"
ADD CONSTRAINT "simulation_runs_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "simulation_runs"
ADD CONSTRAINT "simulation_runs_scenario_id_fkey"
FOREIGN KEY ("scenario_id") REFERENCES "simulation_scenarios"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "simulation_runs"
ADD CONSTRAINT "simulation_runs_triggered_by_user_id_fkey"
FOREIGN KEY ("triggered_by_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
