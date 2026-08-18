---
baseline_commit: 5fe0b163c0c78fc2a883c8071bce86e35af50669
---
# Story 1.2: Database Engine & Prisma ORM Scaffolding

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Developer,
I want to set up a Docker compose configuration for PostgreSQL 18.x and initialize Prisma ORM 7.8.0,
so that we can model database entities and execute migrations.

## Acceptance Criteria

1. **Given** a backend service template
   **When** I configure docker-compose for a PostgreSQL 18.x container and run it
   **Then** the database is accessible locally.
2. **Given** the local PostgreSQL database container running
   **When** I configure Prisma ORM with schemas and database connection variables
   **Then** running `npx prisma db push` or `npx prisma migrate dev` successfully connects, models tables, and initializes database structure.

## Tasks / Subtasks

- [x] Configure Docker Compose Environment (AC: 1)
  - [x] Create `docker-compose.yml` in the project root directory.
  - [x] Add a `db` service using the official `postgres:18-alpine` Docker image.
  - [x] Configure container environment variables: `POSTGRES_DB=impactc_db`, `POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=postgres_secure_pass`.
  - [x] Add volume mapping `postgres_data:/var/lib/postgresql/data` for data persistence.
  - [x] Expose container port `5432` mapped to host port `5432`.
  - [x] Add a `healthcheck` to the `db` service to verify PostgreSQL readiness using `pg_isready -U postgres -d impactc_db`.
  - [x] Add a `redis` service using the official `redis:8.0-alpine` (or `redis:alpine`) Docker image.
  - [x] Expose Redis container port `6379` mapped to host port `6379`.
- [x] Initialize Prisma ORM in backend-service (AC: 2)
  - [x] Navigate to `backend-service/`.
  - [x] Install Prisma CLI as a devDependency: `npm i -D prisma@7.8.0`.
  - [x] Install Prisma Client as a runtime dependency: `npm i @prisma/client@7.8.0`.
  - [x] Initialize Prisma configuration: `npx prisma init`.
- [x] Configure Prisma Schema and Environment Variables (AC: 2)
  - [x] Set database connection string in `backend-service/.env`:
    `DATABASE_URL="postgresql://postgres:postgres_secure_pass@localhost:5432/impactc_db?schema=public"`
  - [x] Update `backend-service/.env.example` to document `DATABASE_URL`.
  - [x] Edit `backend-service/prisma/schema.prisma` to verify PostgreSQL provider setup.
  - [x] Define naming convention rules in Prisma (tables use plural, lowercase snake_case; columns use lowercase snake_case).
  - [x] Add a dummy placeholder model in `schema.prisma` for connectivity verification:
    ```prisma
    model MigrationTest {
      id        String   @id @default(uuid()) @db.Uuid
      name      String   @db.VarChar(100)
      createdAt DateTime @default(now()) @map("created_at")

      @@map("migration_tests")
    }
    ```
- [x] Configure Package Scripts and Seed Configuration (AC: 2)
  - [x] In `backend-service/package.json`, add the following helper scripts:
    * `"postinstall": "prisma generate"`
    * `"db:up": "docker compose -f ../docker-compose.yml up -d"`
    * `"db:down": "docker compose -f ../docker-compose.yml down"`
    * `"db:migrate": "prisma migrate dev"`
    * `"db:push": "prisma db push"`
    * `"db:studio": "prisma studio"`
  - [x] Add the Prisma seed configuration section in `backend-service/package.json`:
    ```json
    "prisma": {
      "seed": "ts-node prisma/seed.ts"
    }
    ```
- [x] Verify Connectivity and Database Initialization (AC: 1, 2)
  - [x] Start the Docker containers: `docker compose up -d` at root.
  - [x] Wait and verify PostgreSQL container health status is active.
  - [x] Run `npm run db:push` inside `backend-service/` to apply the initial schema.
  - [x] Verify that database table `migration_tests` is successfully created.
  - [x] Run `npx prisma generate` (or postinstall script) to build Prisma client typings.
  - [x] Verify the NestJS application builds and compiles successfully: `npm run build`.

## Dev Notes

- **Docker Versioning**: PostgreSQL 18.x is specified by the system architect. Use `postgres:18-alpine` as the base image for optimized container weight.
- **Database Schema Rules**:
  - Primary keys MUST use UUIDs (string data type in Prisma, annotated with `@db.Uuid` and `@default(uuid())` or similar).
  - Tables must follow the plural, snake_case convention. In Prisma, this is enforced using the `@@map("table_name")` block attribute.
  - Columns must follow the snake_case convention. In Prisma, map camelCase model fields to snake_case database columns using the `@map("column_name")` attribute.
  - *Local Sync Convention*: For client-created records synchronizing to the server, use a temporary UUID string as primary key on clients. Ensure server UUID schema compatibility when client records are synchronized and matched with numeric IDs returned by the server.
- **Logging Rule**: When writing backend logs, always use both `this.log.log()` and `console.log()` for the same message.
- **Angular Component Rule**: When editing any Angular components in the workspace (if any), do not remove `standalone: false` from `@Component` decorators.

### Project Structure Notes

- **File Locations**:
  - `docker-compose.yml` MUST be placed in the project root folder.
  - Prisma schema file must live at `backend-service/prisma/schema.prisma`.
  - Environment variables `.env` and `.env.example` must live in the `backend-service/` directory.

### References

- **Architecture Source**: [architecture.md:L142-146](file:///c:/Users/kahonsu/Documents/GitHub/ImpactC/_bmad-output/planning-artifacts/architecture.md#L142-L146)
- **PRD Addendum Schema**: [addendum.md:L37-102](file:///c:/Users/kahonsu/Documents/GitHub/ImpactC/_bmad-output/planning-artifacts/prds/prd-ImpactC-2026-06-19/addendum.md#L37-L102)

## Dev Agent Record

### Agent Model Used

Gemini 3.5 Flash (Medium)

### Debug Log References

- None. No issues encountered outside of standard port conflicts.

### Completion Notes List

- Configured `docker-compose.yml` with `postgres:18-alpine` (mapped to host port `5434` due to host port `5432` conflict) and `redis:8.0-alpine` (mapped to host port `6380` due to host port `6379` conflict).
- Installed `@prisma/client@7.8.0` and `prisma@7.8.0` in `backend-service/`.
- Configured `backend-service/.env` and `backend-service/.env.example` with standard database connection strings using host port `5434`.
- Configured `backend-service/prisma/schema.prisma` with the `MigrationTest` model. Removed the `url` parameter from `datasource db` inside `schema.prisma` since connection URLs in Prisma 7 must be defined in `prisma.config.ts`.
- Created package helper scripts in `backend-service/package.json` (e.g. `db:up`, `db:down`, `db:push`, etc.).
- Verified container health, schema synchronization via `npm run db:push`, and successful client generation.
- Verified NestJS application build and test suite execution.

### File List

- [NEW] [docker-compose.yml](file:///c:/Users/kahonsu/Documents/GitHub/ImpactC/docker-compose.yml)
- [MODIFY] [backend-service/package.json](file:///c:/Users/kahonsu/Documents/GitHub/ImpactC/backend-service/package.json)
- [MODIFY] [backend-service/package-lock.json](file:///c:/Users/kahonsu/Documents/GitHub/ImpactC/backend-service/package-lock.json)
- [NEW] [backend-service/.env](file:///c:/Users/kahonsu/Documents/GitHub/ImpactC/backend-service/.env)
- [MODIFY] [backend-service/.env.example](file:///c:/Users/kahonsu/Documents/GitHub/ImpactC/backend-service/.env.example)
- [NEW] [backend-service/prisma/schema.prisma](file:///c:/Users/kahonsu/Documents/GitHub/ImpactC/backend-service/prisma/schema.prisma)
