---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-06-19'
project_name: 'ImpactC'
user_name: 'Francis'
date: '2026-06-19'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## 1. Project Context Analysis

### Requirements Overview

**Functional Requirements:**
- **Onboarding & Profile Management (FR-1 to FR-3)**: Multi-step onboarding for church singles, manual validation queues for church leaders, and weekly availability schedule inputs.
- **Discovery Feed (FR-4 to FR-5)**: Segmented, gender-segregated discovery feed of other single profiles (only showing active Célibataire Libre members).
- **Interest & Match Detection (FR-6 to FR-7)**: Completely blind interest expression mechanism that registers matches in the leader dashboard when reciprocal.
- **Supervised Journey Lifecycle (FR-8 to FR-12)**: A 4-stage relationship path (supervised first meeting, 30-day chat study, 90-day physical/family study, final engagement/marriage prep), where step transitions require mutual consent and relationship leader validation.
- **Secure Chat with Anti-Contact Filtering (FR-13 to FR-14)**: Private chat channel for matched couples in study stages, running real-time Socket.io communication with server-side regex filtering to block telephone, email, and social networks handles, alerting leaders immediately.
- **Back-Office Tools & Dashboards (FR-15 to FR-18)**: Interactive leader console with KPI metrics, match grid, couples' step progression Kanban board, user moderation directory, and relationship audit logs.
- **Testimonial System (FR-19 to FR-20)**: Public unauthenticated success stories page and leader moderation tools.

**Non-Functional Requirements:**
- **Security & Privacy**: RBAC (Single, Responsable, Admin) to prevent singles from accessing back-office, short-lived JWTs (15 min) + HTTP-only cookies, data-at-rest encryption for chat logs, TLS 1.3, XSS, CSRF, and rate limiting.
- **Performance**: WS chat latency <300ms, page load time <1.5s, Redis caching for fast reads.
- **Accessibility**: WCAG 2.1 AA compliance (contrast ratios, keyboard focus, alt text).
- **Form-Factor**: Mobile-first responsive web wrapper for Célibataires, desktop web console for Responsables.

**Scale & Complexity:**
- Primary domain: Full-Stack (Mobile & Web Shell + REST/WS Backend)
- Complexity level: Medium-High
- Estimated architectural components: 4 (Mobile responsive client, Web admin portal, NestJS API/Socket server, PostgreSQL/Redis database layer)

### Technical Constraints & Dependencies
- Decoupled client/server architectures (React Native / Next.js clients communicating with NestJS backend via HTTPS/WSS).
- PostgreSQL database access handled via Prisma ORM.
- Real-time Socket.io gateways for the study chat.
- Redis-backed Bull task queues for background expiration checks and notification deliveries.
- AWS S3 & Cloudinary for secure storage and auto-formatting (4:5 crop) of profile media.

### Cross-Cutting Concerns Identified
- **Anti-Contact Chat Filter**: A middleware intercepting and inspecting all messages in real-time, blocking matches, throwing warnings, and triggering high-priority alerts on leader dashboards.
- **Journey State Machine**: Complex, time-bound lifecycle transitions requiring mutual user approval and leader verification, with automatic expiration alerts at 30 days (Step 2) and 90 days (Step 3).
- **Role Isolation (RBAC)**: Ensuring absolute separation of access control between Célibataires and the back-office management grids.

---

## 2. Starter Template Evaluation

### Primary Technology Domain
**Full-Stack Decoupled Application** based on project requirements analysis:
- **Mobile responsive client** for Célibataires.
- **Web responsive back-office** for Responsables.
- **REST & Real-Time API Server** for business logic, WebSocket chat, background workflows, and database interactions.

### Starter Options Considered
1. **Next.js 14 App Router** (Web Back-office):
   - *Pros*: Built-in routing, server component speed, standard Tailwind and ESLint integrations.
   - *Cons*: Highly structured, opinionated file routing.
2. **NestJS CLI** (Backend Server):
   - *Pros*: Strict modules, controllers, and service patterns; built-in Socket.io and RxJS integrations; out-of-the-box Jest testing.
   - *Cons*: Heavy framework abstraction with dependency injection.
3. **Expo CLI** (Mobile Client):
   - *Pros*: Cross-platform iOS/Android code sharing, Expo Go environment for rapid on-device testing.
   - *Cons*: Native dependency additions require custom development builds.

### Selected Starters & Initialization Commands

#### 1. Web Back-Office (Next.js)
**Selected Starter**: Next.js 14 App Router.
- **Rationale**: Best-in-class framework for dashboard administration (SSR support, routing structure).
- **Initialization Command**:
```bash
npx create-next-app@latest backoffice-web --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```

#### 2. Backend Server (NestJS)
**Selected Starter**: NestJS TypeScript App.
- **Rationale**: Enforces a strict domain-driven modular architecture perfect for scaling matching services and Socket.io gateways.
- **Initialization Command**:
```bash
npx @nestjs/cli@latest new backend-service --package-manager npm --language TS --strict
```

#### 3. Mobile Client (Expo)
**Selected Starter**: Expo React Native Default.
- **Rationale**: Allows compilation of a mobile-first web wrapper that can be smoothly ported to native iOS/Android formats later.
- **Initialization Command**:
```bash
npx create-expo-app@latest mobile-client --template default --yes
```

### Architectural Decisions Provided by Starters

**Language & Runtime:**
- **TypeScript**: Configured globally across all three codebases (`tsconfig.json`) using strict compiling parameters (`strictNullChecks`, `noImplicitAny`) in NestJS and Next.js.

**Styling Solution:**
- **Tailwind CSS**: Pre-configured in Next.js (`tailwind.config.js`) for utility-first layouts, integrated with standard post-CSS preprocessing. Native styling constructs (or Tailwind Native) are used in Expo.

**Build Tooling:**
- Next.js utilizes Webpack/Turbopack optimization. NestJS runs Webpack compilation for server runtime modules. Expo utilizes Metro bundler configurations.

**Testing Framework:**
- NestJS provides **Jest** and **Supertest** unit/integration scaffolds. Next.js leaves testing configuration optional, which will be manually added via Jest/React Testing Library if required.

**Code Organization:**
- **Next.js**: Organizes views within `src/app/` using directory-based routing.
- **NestJS**: Follows `src/module-name/` structure grouping controllers, services, modules, and DTOs together.
- **Expo**: Standard React Native component hierarchy.

**Development Experience:**
- Hot reloading support (HMR) for instant rendering updates on developers' layouts.

**Note:** Project initialization using these commands should be the first implementation story.

---

## 3. Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- **Decoupled Three-Tier Stack**: Enforcing client separation (Next.js web back-office, Expo mobile client) from NestJS API server.
- **Relational Data Mapping**: Database choice set to PostgreSQL 18.x accessed via Prisma ORM 7.x.
- **Real-Time Gateway & Middleware Interceptor**: Chat implemented via WebSockets/Socket.io, checking regex patterns in server-side interceptors to prevent off-platform contact sharing.

**Important Decisions (Shape Architecture):**
- **Token-Based Authentication**: JWT access tokens (15-min life) with HTTP-only refresh cookies.
- **Role-Based Access Control (RBAC)**: Enforced via custom NestJS Guards mapping user roles (`celibataire`, `responsable`, `admin`) to route clearance levels.
- **Task Scheduling & Expiration Queue**: Bull MQ backed by Redis 8.x for async 30-day (Step 2) and 90-day (Step 3) journey expiration checks.

**Deferred Decisions (Post-MVP):**
- **Calendar API Synchronization**: Deferring Google/Outlook calendar auto-sync for appointment planners. Manual scheduling grids inside the web console serve as the MVP baseline.

### Data Architecture
- **Database Engine**: **PostgreSQL 18.x** (latest stable release). Handles structured users, profiles, interests, journeys, and messages.
- **Object Relational Mapper**: **Prisma ORM 7.8.0** for type-safe schema modeling, relational checking, and automated typescript interfaces generation.
- **Caching & Queue Storage**: **Redis 8.8** for websocket session mapping, discovery feed caching, and Bull task queue management.
- **Data Validation**: **Zod** for schema validation on the frontend client inputs, and `class-validator` decorators on NestJS DTO payloads.

### Authentication & Security
- **Identity & Authentication**: Custom **JWT generation and payload verification** handled natively in the NestJS Auth module.
- **Authorization**: Custom NestJS **Guards & Roles Decorators** to isolate endpoints (e.g. preventing Célibataires from accessing the leader validation queue).
- **Session Lifecycles**: Short-lived JWTs (15 min) stored in memory, and HttpOnly cookies for refresh tokens.
- **Data Encryption**: **Bcrypt** for password hashing (cost factor 12); **AES-256-GCM** encryption for chat database tables (`messages.content`) at rest.

### API & Communication Patterns
- **Transport Layers**: Decoupled HTTP REST endpoints for administrative, onboarding, and profile browsing workflows; stateful WebSockets (Socket.io) for study chat channels.
- **API Documentation**: Automated **OpenAPI (Swagger)** integration in NestJS (`@nestjs/swagger`) generating interactive API routes guides.
- **Inter-service Communication**: Single monolithic NestJS server hosting REST API and WS gateways, avoiding microservice network complexities for the initial MVP.

### Frontend Architecture
- **State Management**: **TanStack Query (React Query) v5** for API fetch caching, pagination, and invalidation. Local client context handles authenticated user details.
- **UI & Styling**: **Tailwind CSS** (Next.js back-office) and **NativeWind** (Expo mobile shell) for unified styling tokens.
- **Component Libraries**: **Shadcn/ui** and **Radix UI** primitives ensuring WCAG accessibility compliance.

### Infrastructure & Deployment
- **API Server Hosting**: **AWS ECS (Fargate)** executing Dockerized NestJS containers behind an Application Load Balancer.
- **Database Hosting**: **AWS RDS PostgreSQL** instance with automated daily backup configurations.
- **Caching Hosting**: **AWS ElastiCache Redis** cluster.
- **Web App Hosting**: **Vercel** for Next.js web application deployment.
- **Media Hosting**: **AWS S3** bucket paired with **CloudFront** CDN for cached, responsive image delivery.
- **Monitoring**: **Sentry** for client-side and backend runtime exception tracking.

### Decision Impact Analysis

**Implementation Sequence:**
1. Initialize repositories and run CLI bootstrap commands for Next.js, NestJS, and Expo.
2. Build PostgreSQL docker container, define Prisma schema models, and run migrations.
3. Configure NestJS JWT auth module, CORS, and role-mapping decorators.
4. Establish the Socket.io websocket gateway and server-side Anti-Contact Filter checks.
5. Create UI views (onboarding forms, discovery feed, backoffice grids, Kanban board).

**Cross-Component Dependencies:**
- Frontend clients depend on NestJS Swagger endpoints to map DTOs.
- Socket.io gateway initialization depends on Redis cache readiness.
- Background journey expiration tasks depend on Bull queue container setups.

---

## 4. Implementation Patterns & Consistency Rules

### Naming Patterns

#### Database Naming Conventions
- **Tables**: Snake case, lowercase, plural (e.g. `users`, `celibataire_profiles`, `interests`, `journeys`, `messages`).
- **Columns**: Snake case, lowercase (e.g. `user_id`, `first_name`, `date_of_birth`).
- **Foreign Keys**: `[singular_related_table]_id` (e.g. `user_id` FK in `celibataire_profiles` pointing to `users.id`).
- **Indexes**: `idx_[table_name]_[column_name]` (e.g. `idx_interests_sender_id`).

#### API Naming Conventions
- **REST Paths**: Lowercase, plural nouns for collection resources, with API prefix (e.g. `/api/profiles`, `/api/interests`, `/api/journeys`).
- **Path Parameters**: CamelCase prefixed with colons in routes (e.g. `/api/profiles/:profileId`).
- **Query Parameters**: CamelCase (e.g. `/api/profiles?churchDepartment=choir`).

#### Code Naming Conventions
- **Components & Classes**: PascalCase (e.g. `ProfileCard.tsx`, `ChatGateway.ts`, `AuthService.ts`).
- **Variables & Functions**: camelCase (e.g. `getUserProfile()`, `isJourneyActive`).
- **Interfaces & Types**: PascalCase prefixed with `I` for interfaces or plain for types (e.g. `IUserProfile`, `JourneyStatus`).

### Structure Patterns

#### Project Organization
- **NestJS Modules**: Grouped feature-by-feature under `src/modules/[feature-name]/`. Each folder houses the Module, Controller, Service, and associated DTO definitions.
- **Next.js Features**: Grouped under `src/components/features/[feature-name]/` (e.g. `journey-kanban.tsx`, `profile-moderator.tsx`).
- **Tests**: Unit tests are co-located in the same directory as their implementation file using `.spec.ts` extensions. Integration and E2E tests live in a dedicated `test/` directory at the component root level.

### Format Patterns

#### API Response Wrapper
To remain structurally consistent with the project's global conventions, all successful NestJS HTTP responses MUST be wrapped in the following JSON format:
```json
{
  "status": "OK",
  "statusCode": 200,
  "message": "default.message.success",
  "service": "OPTIMIZE-SERVICE",
  "data": { ... }
}
```
*Note: The actual payload returned by NestJS controller methods must be encapsulated inside the `data` field. Error filters must return matching status and message shapes.*

#### Data Exchange Formats
- **Dates**: Exchanged strictly as **ISO 8601 UTC strings** (e.g. `"2026-06-19T15:30:00.000Z"`).
- **JSON keys**: Standard camelCase.

### Communication Patterns

#### Event System (Socket.io)
- **Namespace**: `/chat` namespace restricts socket connections.
- **Event Naming**: `[domain]:[action]` (e.g. `message:send`, `message:receive`, `chat:error`).
- **Payload format**: Structured JSON containing `journeyId`, `senderId`, and `content`.

### Process Patterns

#### Error & Loading States
- **NestJS Exception Filters**: Intercept global HTTP exceptions, format validation errors from class-validator packages, and map them to HTTP responses.
- **Shimmer Effect UI**: Loading states render skeleton card elements rather than general spinner overlays.

#### Anti-Contact Interception Flow
1. Single client sends chat string via Socket.io.
2. NestJS message interceptor matches content against telephone, email, and social regex parameters.
3. If flag triggers: message delivery blocks, database transaction aborts, client receives a warning event, and a high-priority action card is appended to the leader's dashboard.

---

## 5. Project Structure & Boundaries

### Complete Project Directory Structure

```
ImpactC-Matrimonial/
├── README.md
├── package.json
├── docker-compose.yml
├── .gitignore
├── .github/
│   └── workflows/
│       └── ci-cd.yml
├── backoffice-web/             (Next.js Web Portal)
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── next.config.js
│   ├── public/
│   │   └── assets/
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── dashboard/
│       │   │   └── page.tsx
│       │   ├── journeys/
│       │   │   ├── page.tsx
│       │   │   └── [id]/
│       │   │       └── page.tsx
│       │   ├── profiles/
│       │   │   └── page.tsx
│       │   ├── matches/
│       │   │   └── page.tsx
│       │   └── testimonials/
│       │       └── page.tsx
│       ├── components/
│       │   ├── ui/
│       │   │   ├── button.tsx
│       │   │   ├── card.tsx
│       │   │   ├── dialog.tsx
│       │   │   └── table.tsx
│       │   └── features/
│       │       ├── dashboard-kpis.tsx
│       │       ├── journey-kanban.tsx
│       │       └── profile-moderator.tsx
│       └── lib/
│           ├── api-client.ts
│           └── utils.ts
├── mobile-client/             (Expo Mobile App)
│   ├── package.json
│   ├── tsconfig.json
│   ├── app.json
│   └── src/
│       ├── app/
│       │   ├── (tabs)/
│       │   │   ├── index.tsx (Discovery Feed)
│       │   │   ├── journey.tsx (Active Journey/Chat)
│       │   │   ├── profile.tsx (Edit Profile)
│       │   │   └── notifications.tsx
│       │   ├── onboarding.tsx
│       │   └── _layout.tsx
│       ├── components/
│       │   ├── ProfileCard.tsx
│       │   ├── ChatWindow.tsx
│       │   └── Stepper.tsx
│       └── services/
│           ├── api.ts
│           └── socket.ts
└── backend-service/           (NestJS Backend Service)
    ├── package.json
    ├── tsconfig.json
    ├── nest-cli.json
    ├── prisma/
    │   ├── schema.prisma
    │   └── seed.ts
    ├── src/
    │   ├── main.ts
    │   ├── app.module.ts
    │   ├── common/
    │   │   ├── filters/
    │   │   │   └── http-exception.filter.ts
    │   │   ├── guards/
    │   │   │   └── roles.guard.ts
    │   │   ├── interceptors/
    │   │   │   └── response.interceptor.ts
    │   │   └── decorators/
    │   │       └── roles.decorator.ts
    │   ├── config/
    │   │   └── app-config.service.ts
    │   └── modules/
    │       ├── auth/
    │       │   ├── auth.module.ts
    │       │   ├── auth.controller.ts
    │       │   └── auth.service.ts
    │       ├── profiles/
    │       │   ├── profiles.module.ts
    │       │   ├── profiles.controller.ts
    │       │   └── profiles.service.ts
    │       ├── interests/
    │       │   ├── interests.module.ts
    │       │   ├── interests.controller.ts
    │       │   └── interests.service.ts
    │       ├── journeys/
    │       │   ├── journeys.module.ts
    │       │   ├── journeys.controller.ts
    │       │   └── journeys.service.ts
    │       ├── chat/
    │       │   ├── chat.module.ts
    │       │   ├── chat.gateway.ts
    │       │   └── chat.service.ts
    │       └── testimonials/
    │           ├── testimonials.module.ts
    │           ├── testimonials.controller.ts
    │           └── testimonials.service.ts
    └── test/
        ├── auth.e2e-spec.ts
        └── chat.gateway.spec.ts
```

### Architectural Boundaries
- **API Boundaries**: NestJS API acts as the single gateway for clients. Endpoints require validation through the `ResponseInterceptor` and `RolesGuard`.
- **Component Boundaries**: Next.js components communicate state strictly via TanStack query caches. Direct component-to-component event emitters are prohibited.
- **Data Boundaries**: Prisma client acts as the exclusive orchestrator for PostgreSQL CRUD queries. Direct database client instantiation is prohibited in REST endpoints.

---

## 6. Architecture Validation Results

### Coherence Validation ✅
- **Decision Compatibility**: Technology versions (NestJS 11, PostgreSQL 18, Redis 8, Prisma 7) are compatible, and their integration handles time-bound queue lifecycles securely.
- **Pattern Consistency**: Project directories co-locate spec tests and enforce identical JSON keys, casing rules, and HTTP response objects globally.
- **Structure Alignment**: The three-directory decoupled structure isolates mobile web view components from back-office management routes.

### Requirements Coverage Validation ✅
- **Feature Coverage**: 20 Functional Requirements are mapped across the backend controllers and client page trees.
- **NFR Coverage**: JWT authentication pipelines, custom NestJS guards, Bcrypt hashing, and AES encryption address database security; Redis handles API caching.

### Implementation Readiness Validation ✅
- All critical decisions are detailed with exact command hooks, configuration options, directory structures, and code mapping schemas.

### Gap Analysis Results
- *No critical gaps identified.* 
- **Important**: Automated calendar sync for appointment scheduling is deferred to v2. Manual date grids serve as the MVP baseline.

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment
- **Overall Status**: **READY FOR IMPLEMENTATION**
- **Confidence Level**: **high**
- **Key Strengths**: Tight coupling of security controls (RBAC, regex anti-contact interceptors) and standard API response formats matching global project specifications.

---

## 7. Implementation Handoff

### AI Agent Guidelines
- **Rule 1**: Follow the plural-table, snake_case PostgreSQL model exactly.
- **Rule 2**: Do not alter or remove the `standalone: false` parameters when modifying components in the workspace.
- **Rule 3**: Wrap all REST response DTOs using the project's standard response interceptor format.
- **Rule 4**: Use both `this.log.log()` and `console.log()` for all logging messages.

### First Implementation Priority
Run the initialization scripts to scaffold the decoupled workspaces:
```bash
npx create-next-app@latest backoffice-web --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
npx @nestjs/cli@latest new backend-service --package-manager npm --language TS --strict
npx create-expo-app@latest mobile-client --template default --yes
```
