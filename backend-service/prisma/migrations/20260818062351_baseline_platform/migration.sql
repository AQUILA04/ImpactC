-- CreateEnum
CREATE TYPE "user_roles" AS ENUM ('CELIBATAIRE', 'RESPONSABLE', 'ADMIN');

-- CreateEnum
CREATE TYPE "profile_statuses" AS ENUM ('PENDING_VALIDATION', 'CELIBATAIRE_LIBRE', 'EN_CHEMINEMENT', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "genders" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "interest_statuses" AS ENUM ('ACTIVE', 'MATCHED', 'DECLINED');

-- CreateEnum
CREATE TYPE "journey_steps" AS ENUM ('STEP_1_FIRST_APPOINTMENT', 'STEP_2_ONE_MONTH_STUDY', 'STEP_3_THREE_MONTH_STUDY', 'STEP_4_FINAL');

-- CreateEnum
CREATE TYPE "journey_statuses" AS ENUM ('ACTIVE', 'TERMINATED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "consent_decisions" AS ENUM ('PENDING', 'CONTINUE', 'DECLINE');

-- CreateEnum
CREATE TYPE "notification_types" AS ENUM ('PROFILE_APPROVED', 'PROFILE_REJECTED', 'MATCH_CREATED', 'JOURNEY_EXPIRING', 'CONTACT_VIOLATION', 'APPOINTMENT_SCHEDULED');

-- CreateEnum
CREATE TYPE "gdpr_request_types" AS ENUM ('EXPORT', 'DELETION');

-- CreateEnum
CREATE TYPE "gdpr_request_statuses" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "user_roles" NOT NULL DEFAULT 'CELIBATAIRE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "celibataire_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "first_name" VARCHAR(80) NOT NULL,
    "last_name" VARCHAR(80) NOT NULL,
    "gender" "genders" NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "nationality" VARCHAR(80),
    "city" VARCHAR(120) NOT NULL,
    "church_department" VARCHAR(120) NOT NULL,
    "department_leader" VARCHAR(120) NOT NULL,
    "church_tenure_months" INTEGER,
    "profession" VARCHAR(120) NOT NULL,
    "activity_sector" VARCHAR(120),
    "financial_range" VARCHAR(80) NOT NULL,
    "profile_photo_url" VARCHAR(500) NOT NULL,
    "tagline" VARCHAR(180) NOT NULL,
    "personal_description" TEXT,
    "search_min_age" INTEGER NOT NULL,
    "search_max_age" INTEGER NOT NULL,
    "spiritual_criteria" TEXT,
    "professional_criteria" TEXT,
    "consent_accepted_at" TIMESTAMP(3) NOT NULL,
    "status" "profile_statuses" NOT NULL DEFAULT 'PENDING_VALIDATION',
    "moderation_note" TEXT,
    "moderated_at" TIMESTAMP(3),
    "moderated_by_id" UUID,
    "active_journey_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "celibataire_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_slots" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interests" (
    "id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "receiver_id" UUID NOT NULL,
    "status" "interest_statuses" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL,
    "partner_one_id" UUID NOT NULL,
    "partner_two_id" UUID NOT NULL,
    "assigned_leader_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journeys" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "partner_one_id" UUID NOT NULL,
    "partner_two_id" UUID NOT NULL,
    "assigned_leader_id" UUID NOT NULL,
    "current_step" "journey_steps" NOT NULL DEFAULT 'STEP_1_FIRST_APPOINTMENT',
    "status" "journey_statuses" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "chat_archived_at" TIMESTAMP(3),
    "terminated_at" TIMESTAMP(3),
    "termination_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "journey_id" UUID NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "location" VARCHAR(300) NOT NULL,
    "notes" TEXT,
    "partner_one_decision" "consent_decisions" NOT NULL DEFAULT 'PENDING',
    "partner_two_decision" "consent_decisions" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "journey_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "encrypted_content" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "is_flagged" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "journey_id" UUID,
    "type" "notification_types" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "target_type" VARCHAR(100) NOT NULL,
    "target_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "content" TEXT NOT NULL,
    "couple_names" VARCHAR(180) NOT NULL,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMP(3),
    "approved_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gdpr_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "gdpr_request_types" NOT NULL,
    "status" "gdpr_request_statuses" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gdpr_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_user_expires" ON "refresh_tokens"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "celibataire_profiles_user_id_key" ON "celibataire_profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_profiles_status_gender" ON "celibataire_profiles"("status", "gender");

-- CreateIndex
CREATE INDEX "idx_profiles_city" ON "celibataire_profiles"("city");

-- CreateIndex
CREATE INDEX "idx_availability_profile_weekday" ON "availability_slots"("profile_id", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "uq_availability_slot" ON "availability_slots"("profile_id", "weekday", "start_time", "end_time");

-- CreateIndex
CREATE INDEX "idx_interests_receiver_status" ON "interests"("receiver_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_interests_sender_receiver" ON "interests"("sender_id", "receiver_id");

-- CreateIndex
CREATE INDEX "idx_matches_assigned_leader" ON "matches"("assigned_leader_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_matches_partners" ON "matches"("partner_one_id", "partner_two_id");

-- CreateIndex
CREATE INDEX "idx_journeys_status_step" ON "journeys"("status", "current_step");

-- CreateIndex
CREATE INDEX "idx_journeys_leader_status" ON "journeys"("assigned_leader_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_journey_id_key" ON "appointments"("journey_id");

-- CreateIndex
CREATE INDEX "idx_appointments_scheduled_at" ON "appointments"("scheduled_at");

-- CreateIndex
CREATE INDEX "idx_messages_journey_sent_at" ON "messages"("journey_id", "sent_at");

-- CreateIndex
CREATE INDEX "idx_notifications_user_read" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "idx_audit_logs_action_created_at" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "idx_audit_logs_target" ON "audit_logs"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "idx_testimonials_approved" ON "testimonials"("is_approved", "approved_at");

-- CreateIndex
CREATE INDEX "idx_gdpr_requests_user_status" ON "gdpr_requests"("user_id", "status");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "celibataire_profiles" ADD CONSTRAINT "celibataire_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "celibataire_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interests" ADD CONSTRAINT "interests_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "celibataire_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interests" ADD CONSTRAINT "interests_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "celibataire_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_partner_one_id_fkey" FOREIGN KEY ("partner_one_id") REFERENCES "celibataire_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_partner_two_id_fkey" FOREIGN KEY ("partner_two_id") REFERENCES "celibataire_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_partner_one_id_fkey" FOREIGN KEY ("partner_one_id") REFERENCES "celibataire_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_partner_two_id_fkey" FOREIGN KEY ("partner_two_id") REFERENCES "celibataire_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_assigned_leader_id_fkey" FOREIGN KEY ("assigned_leader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "celibataire_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gdpr_requests" ADD CONSTRAINT "gdpr_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
