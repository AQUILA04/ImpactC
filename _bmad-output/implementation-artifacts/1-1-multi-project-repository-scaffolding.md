---
baseline_commit: 9122dfd82c12bfcf7108a42b2451d3306788294b
---

# Story 1.1: Multi-Project Repository Scaffolding

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Developer,
I want to initialize the Next.js, NestJS, and Expo projects using standard bootstrap CLI scripts,
so that we have a clean decoupled workspace for all frontend and backend development.

## Acceptance Criteria

1. **Given** an empty repository directory
   **When** I run the Next.js, NestJS, and Expo CLI bootstrap commands as specified in the architecture decisions
   **Then** the project directories are successfully scaffolded with TypeScript and basic configurations
   **And** each project compiles and runs locally without errors.

## Tasks / Subtasks

- [x] Verify local system environments (AC: 1)
  - [x] Ensure Node.js (v18.x or v20.x+) and npm are installed.
  - [x] Verify root `.gitignore` ignores node_modules, build outputs, environment files, and IDE configuration directories.
  - [x] Set up basic workspace README at the root.
- [x] Scaffold Web Back-Office using Next.js 14 (AC: 1)
  - [x] Run command with `--help` flag first to inspect available CLI options before executing creation.
  - [x] Run the bootstrapping command (using `-y` to run non-interactively where applicable):
    ```bash
    npx -y create-next-app@latest backoffice-web --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
    ```
  - [x] Verify that the `backoffice-web` workspace folder compiles cleanly.
  - [x] Validate source folder layout (`src/app/`, `src/components/`, etc.) matches the architecture plan.
- [x] Scaffold Backend API Server using NestJS (AC: 1)
  - [x] Run command with `--help` flag first to inspect available options before executing creation.
  - [x] Run the bootstrapping command (using `-y` to run non-interactively where applicable):
    ```bash
    npx -y @nestjs/cli@latest new backend-service --package-manager npm --language TS --strict
    ```
  - [x] Ensure strict TypeScript flags are configured in `backend-service/tsconfig.json`.
  - [x] Verify backend server boots and resolves dependencies via `npm run start:dev`.
- [x] Scaffold Mobile Client using Expo React Native (AC: 1)
  - [x] Run command with `--help` flag first to inspect available options before executing creation.
  - [x] Run the bootstrapping command (using `-y` to run non-interactively where applicable):
    ```bash
    npx -y create-expo-app@latest mobile-client --template default --yes
    ```
  - [x] Verify that the `mobile-client` project configuration and scripts compile clean.
- [x] Multi-Project build verification (AC: 1)
  - [x] Run test builds across all three projects to guarantee zero TS compilations/linter failures.
  - [x] Ensure all projects are configured to use `npm` for lockfile consistency and unified dependency resolution.

## Dev Notes

- **Architecture Compliance**:
  - Keep the projects decoupled in the three distinct directories (`backoffice-web`, `backend-service`, `mobile-client`).
  - Follow the specified naming and project structure patterns outlined in [architecture.md](file:///c:/Users/kahonsu/Documents/GitHub/ImpactC/_bmad-output/planning-artifacts/architecture.md).
- **Critical Quality Constraints**:
  - Always use both `this.log.log()` and `console.log()` for logging the same message.
  - Never remove the `standalone: false` property from the `@Component` decorator if modifying Angular components (though this project uses Next.js/Nest/Expo, this is a global rule to obey).
  - When changing or referencing service names, verify the service exists first and do not assume it's a typo.
  - Rest API response wrapping must envelope successful REST calls in NestJS:
    ```json
    {
      "status": "OK",
      "statusCode": 200,
      "message": "default.message.success",
      "service": "OPTIMIZE-SERVICE",
      "data": { ... }
    }
    ```
- **Project Structure Notes**:
  - Next.js Feature Components: Group feature components under `backoffice-web/src/components/features/[feature-name]/`.
  - NestJS Modules: Group controllers, modules, and services under `backend-service/src/modules/[feature-name]/`.
  - Co-locate unit tests alongside implementation code using `.spec.ts` naming conventions.

### References

- **Epics Source**: [epics.md:L136-147](file:///c:/Users/kahonsu/Documents/GitHub/ImpactC/_bmad-output/planning-artifacts/epics.md#L136-L147)
- **Architecture Source**: [architecture.md:L73-123](file:///c:/Users/kahonsu/Documents/GitHub/ImpactC/_bmad-output/planning-artifacts/architecture.md#L73-L123)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (Thinking)

### Debug Log References

- `mobile-client` Expo scaffold had 2 TS errors from template CSS imports (`@/global.css` side-effect and `.module.css`). Fixed by creating `expo-env.d.ts` (required Expo type reference) and `src/types/css.d.ts` (CSS/CSS Module type declarations). All three projects now compile at exit 0.
- Expo scaffold process hung after completing (12+ min after "Your project is ready!") due to interactive git prompt — answered "Y" to skip git init, then killed the stalled process. Project was fully scaffolded.
- `EBADENGINE` warnings from metro packages requiring Node `^20.19.4` vs installed `v20.19.3` are non-blocking warnings only; installation succeeded.
- Used `--disable-git` / `--skip-git` flags on Next.js and NestJS to avoid nested git repos since root git was initialized first.

### Completion Notes List

- ✅ Node.js v20.19.3 and npm 10.8.2 confirmed (satisfies v18.x or v20.x+ requirement).
- ✅ Root `.gitignore` created covering node_modules, build outputs (.next/, dist/, out/, .expo/), environment files (.env.*), and IDE config (.idea/, .vscode/).
- ✅ Root `README.md` created with project overview, prerequisites, setup instructions, and directory structure.
- ✅ `backoffice-web` scaffolded with Next.js 14 App Router, TypeScript, Tailwind CSS, ESLint, src/ directory layout, and `@/*` import alias. `tsc --noEmit` exits 0.
- ✅ `backend-service` scaffolded with NestJS strict TypeScript (`strictNullChecks: true`, `noImplicitAny: true`). `tsc --noEmit` exits 0.
- ✅ `mobile-client` scaffolded with Expo React Native default template, TypeScript strict mode. `tsc --noEmit` exits 0 after fixing template CSS type declarations.
- ✅ All three projects use `package-lock.json` (npm); no yarn.lock or pnpm-lock.yaml present.
- ✅ All three projects compile clean: `backoffice-web` exit 0, `backend-service` exit 0, `mobile-client` exit 0.
- ✅ AC 1 fully satisfied: directories scaffolded with TypeScript configurations, all compile without errors.

### File List

- `.gitignore` (new)
- `README.md` (new)
- `backoffice-web/` (new — full Next.js 14 App Router scaffold)
- `backoffice-web/src/app/layout.tsx` (new)
- `backoffice-web/src/app/page.tsx` (new)
- `backoffice-web/tsconfig.json` (new)
- `backoffice-web/tailwind.config.ts` (new)
- `backoffice-web/package-lock.json` (new)
- `backend-service/` (new — full NestJS strict TS scaffold)
- `backend-service/src/main.ts` (new)
- `backend-service/src/app.module.ts` (new)
- `backend-service/src/app.controller.ts` (new)
- `backend-service/src/app.service.ts` (new)
- `backend-service/src/app.controller.spec.ts` (new)
- `backend-service/tsconfig.json` (new)
- `backend-service/nest-cli.json` (new)
- `backend-service/package-lock.json` (new)
- `mobile-client/` (new — full Expo React Native default template scaffold)
- `mobile-client/expo-env.d.ts` (new — required Expo type reference)
- `mobile-client/src/types/css.d.ts` (new — CSS/CSS module type declarations for web targets)
- `mobile-client/tsconfig.json` (new)
- `mobile-client/app.json` (new)
- `mobile-client/package-lock.json` (new)

### Change Log

- 2026-06-19: Initialized git repository at project root with initial `.gitignore` commit (9122dfd).
- 2026-06-19: Scaffolded `backoffice-web` (Next.js 14 App Router + TypeScript + Tailwind + ESLint).
- 2026-06-19: Scaffolded `backend-service` (NestJS strict TypeScript).
- 2026-06-19: Scaffolded `mobile-client` (Expo React Native default template); fixed TS errors from CSS imports in web-targeted template files.
- 2026-06-19: Verified all three projects compile clean (`tsc --noEmit` exit 0); confirmed npm lockfile consistency across all projects.
