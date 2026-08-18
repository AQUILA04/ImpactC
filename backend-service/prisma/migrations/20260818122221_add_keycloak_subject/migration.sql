/*
  Warnings:

  - A unique constraint covering the columns `[keycloak_subject]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "keycloak_subject" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "users_keycloak_subject_key" ON "users"("keycloak_subject");
