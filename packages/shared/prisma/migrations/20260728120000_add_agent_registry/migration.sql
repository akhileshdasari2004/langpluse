-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "stable_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT,
    "owner" TEXT,
    "team" TEXT,
    "metadata" JSONB,
    "first_seen_at" TIMESTAMP(3),
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agents_project_id_stable_key_key"
ON "agents"("project_id", "stable_key");

-- CreateIndex
CREATE INDEX "agents_project_id_last_seen_at_id_idx"
ON "agents"("project_id", "last_seen_at" DESC, "id");

-- CreateIndex
CREATE INDEX "agents_created_by_idx" ON "agents"("created_by");

-- CreateIndex
CREATE INDEX "agents_updated_by_idx" ON "agents"("updated_by");

-- AddForeignKey
ALTER TABLE "agents"
ADD CONSTRAINT "agents_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents"
ADD CONSTRAINT "agents_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents"
ADD CONSTRAINT "agents_updated_by_fkey"
FOREIGN KEY ("updated_by") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
