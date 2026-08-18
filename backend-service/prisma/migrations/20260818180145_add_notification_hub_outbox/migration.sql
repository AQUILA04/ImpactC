-- CreateEnum
CREATE TYPE "notification_hub_outbox_statuses" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "notification_hub_outbox" (
    "id" UUID NOT NULL,
    "idempotency_key" VARCHAR(180) NOT NULL,
    "recipient_email" VARCHAR(254) NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "priority" VARCHAR(16) NOT NULL DEFAULT 'NORMAL',
    "metadata" JSONB,
    "status" "notification_hub_outbox_statuses" NOT NULL DEFAULT 'PENDING',
    "hub_notification_id" UUID,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_hub_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_hub_outbox_idempotency_key_key" ON "notification_hub_outbox"("idempotency_key");

-- CreateIndex
CREATE INDEX "idx_notification_hub_outbox_status_created" ON "notification_hub_outbox"("status", "created_at");
