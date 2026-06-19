---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - "c:/Users/kahonsu/Documents/GitHub/ImpactC/_bmad-output/planning-artifacts/prds/prd-ImpactC-2026-06-19/prd.md"
  - "c:/Users/kahonsu/Documents/GitHub/ImpactC/_bmad-output/planning-artifacts/prds/prd-ImpactC-2026-06-19/addendum.md"
  - "c:/Users/kahonsu/Documents/GitHub/ImpactC/_bmad-output/planning-artifacts/architecture.md"
  - "c:/Users/kahonsu/Documents/GitHub/ImpactC/_bmad-output/planning-artifacts/ux-designs/ux-ImpactC-2026-06-19/DESIGN.md"
  - "c:/Users/kahonsu/Documents/GitHub/ImpactC/_bmad-output/planning-artifacts/ux-designs/ux-ImpactC-2026-06-19/EXPERIENCE.md"
---

# ImpactC - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for ImpactC, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: The system shall present a multi-step registration wizard on mobile to capture a Célibataire's details (Name, Gender, Date of Birth, City, Church Department, Department Leader, Professional Status, Financial Range, Profile Photo, Tagline, Search Criteria) with inline validation and a minimum age restriction of 18 years.
FR2: The system shall route newly completed profiles to a moderation queue accessible only to Responsables, defaulting profile status to 'Pending Validation' and blocking user access to searching or viewing feeds until approved.
FR3: A Célibataire Libre shall be able to register weekly availability slots for meetings, which are viewable by Responsables when scheduling.
FR4: The system shall provide a gender-segregated vertical scroll feed of active opposite-sex profiles who are in 'Célibataire Libre' status, omitting any profiles in 'En Cheminement' or 'Suspendu' status.
FR5: The feed shall render profile cards displaying a photo, name, age, profession, department, and personal tagline, with complete details only visible when the card is tapped.
FR6: A Célibataire Libre shall be able to click 'Express Interest' on a profile card confidentially, with no notification or indicators sent to the recipient.
FR7: The system shall automatically detect a reciprocal match upon an interest expression, generate a 'Match' record, and alert the assigned Responsable.
FR8: The system shall track active couple Journeys, storing partner IDs, current step, start date, expiration date, and assigned Responsable, restricting each user to a single active Journey.
FR9: The system shall allow the Responsable to schedule physical introductory meetings (First Appointment) and record post-meeting feedback, transitioning the couple to Step 2 upon mutual consent or terminating the journey if either declines.
FR10: Upon entering Step 2 (One-Month Study), the system shall change both users' profile status to 'En Cheminement' (hiding them from the feed), open a secure private chat channel, set a 30-day expiration timer, and alert the Responsable if the limit is reached without transition.
FR11: The system shall allow the Responsable to transition a couple to Step 3 (Three-Month Study) upon mutual consent, keeping the chat active and setting a 90-day expiration with warnings at Day 85.
FR12: The system shall allow the Responsable to trigger a Journey termination at any point, instantly archiving the chat channel as read-only, resetting user statuses to 'Célibataire Libre', and returning profiles to the discovery feed.
FR13: The system shall provide a real-time messaging interface for couples in Steps 2, 3, or 4, encrypting messages at rest and archiving the history so it is inaccessible to users after journey termination.
FR14: The system shall run a server-side Anti-Contact Filter scanning outbound messages for phone number, email, or social media handle patterns, blocking delivery of matches, showing a warning to the sender, logging the violation, and alerting the Responsable.
FR15: The system shall provide an operational dashboard for Responsables featuring dynamically updated KPI metrics (pending approvals, active matches, weekly scheduled appointments, active journeys) and registration trend charts.
FR16: The system shall provide a Match Management Grid listing unilateral interests and bilateral matches in a filterable table to coordinate appointments.
FR17: The system shall render active Journeys on a 4-column Kanban board (Step 1, Step 2, Step 3, Step 4) where cards display partner names, assigned Responsable, and days remaining.
FR18: The system shall log all administrative actions, step promotions, terminations, anti-contact violations, and meeting notes in a central, read-only relationship audit trail searchable by Administrateurs.
FR19: The system shall render approved couple success stories on a public, unauthenticated testimonials landing page.
FR20: The system shall allow Responsables and Admins to draft, edit, and approve testimonials, keeping them in draft state until approved.

### NonFunctional Requirements

NFR1: The system must enforce Role-Based Access Control (RBAC) across all endpoints to prevent Célibataires from accessing back-office panels.
NFR2: The system must use short-lived JWT access tokens (15 minutes) in headers and HTTP-only, secure cookies with SameSite=Strict for refresh tokens.
NFR3: Chat history must be encrypted at rest in the database using AES-256-GCM.
NFR4: All client-server communication must transit over secure TLS 1.3 channels.
NFR5: Chat message delivery latency must be under 300ms over stateful WebSockets/Socket.io channels.
NFR6: The discovery feed must load profiles under 1.5 seconds using pagination/lazy loading.
NFR7: The system must utilize Redis cache to manage active user sessions, socket mapping tables, and discovery feed caches.
NFR8: The UI must comply with WCAG 2.1 AA accessibility guidelines, including contrast ratios of at least 4.5:1 (using Dark Gold and Dark Slate for text on light backgrounds), alt text, and minimum 48px touch targets.
NFR9: The client applications must be optimized: Mobile-first responsive web wrapper for Célibataires (Expo) and high-density desktop layout for Responsables (Next.js).
NFR10: The platform must implement GDPR compliance controls (consent checkboxes, right to deletion, and exportable profile requests).

### Additional Requirements

- Greenfield initialization of Next.js 14 (backoffice-web), NestJS (backend-service), and Expo (mobile-client) using specified bootstrapping scripts.
- Schema definition and migrations utilizing PostgreSQL 18.x database accessed via Prisma ORM 7.8.0.
- Configured Redis 8.8 cluster for managing active websocket mappings, session data, and discovery feed cache.
- Configured Bull MQ task queue backed by Redis to manage asynchronous email alerts, push notifications, and daily journey stage expiration checks.
- Integration of AWS S3 and Cloudinary for profile media upload, automatic compression, and strict 4:5 aspect ratio cover crop.
- Custom NestJS Guards and decorator patterns mapping user roles (celibataire, responsable, admin) to route execution paths.
- Naming conventions mapping database tables to snake_case plural nouns and columns to snake_case.
- REST API response wrapping that encapsulates all successful endpoint data inside standard envelope formatting: `{"status": "OK", "statusCode": 200, "message": "default.message.success", "service": "OPTIMIZE-SERVICE", "data": { ... }}`.
- Real-time communication gateway utilizing Socket.io restricted to the `/chat` namespace with standard event payloads.
- Automated OpenAPI (Swagger) integration in NestJS generating route documentation at `/api/docs` or similar.
- Implementation of a global Exception Filter in NestJS to format validation errors and map exceptions cleanly to HTTP response envelopes.

### UX Design Requirements

UX-DR1: The UI shall implement the color palette tokens: Slate Blue (#3B5998), Soft Gold (#C9A84C), Sage Success (#4CAF82), Amber Warning (#F59E0B), Soft Red (#EF4444), Off-White (#F8F7F4), Grey Light (#EFEFEF), Anthracite (#1F2937), Dark Gold (#856404), and Dark Slate (#2C4270), ensuring small typography uses Dark Gold and Dark Slate on light backgrounds to meet contrast requirements.
UX-DR2: The UI shall apply Playfair Display (Bold 700) for H1/H2 headings, Montserrat (SemiBold 600) for H3/H4 subheadings, and Inter (400, 500, 600) for body, inputs, and labels, setting the mobile base font size to 16px.
UX-DR3: The system shall render profile cards with 12px rounded corners, shadow-md, a photo in a strict 4:5 aspect ratio with cover crop, Montserrat name text, and a Slate Blue primary 'Express Interest' button that triggers a heart pulse animation.
UX-DR4: The UI shall render status badges as rounded pills with a 10% background opacity matching their text color (Célibataire Libre in Sage Green, En Cheminement in Gold/Dark Gold, Suspended in Grey).
UX-DR5: The system shall render a Stepper Progress Indicator mapping Steps 1 to 4 on active journeys, showing completed steps as filled Slate Blue nodes, active steps with a pulsing ring, and future steps as disabled grey nodes.
UX-DR6: The system shall display a fixed warning banner at the top of the chat area during Step 2 with a 10% Soft Red background, solid Soft Red border, lock icon, and boundary guidelines text.
UX-DR7: When a message is blocked by the Anti-Contact Filter, the UI shall block delivery, display a red border on the input field, disable the send button, trigger a warning toast, and display an error tip below the input.
UX-DR8: The system shall render active journeys on a desktop Kanban board across 4 columns (RDV 1, Étude 1M, Étude 3M, Final) utilizing cards with partner names, assigned leader, and a days-remaining badge that turns red when <= 5 days are left. Drag-and-drop must be disabled.
UX-DR9: The UI shall render skeleton loaders with a grey shimmer pulse effect (animate-pulse) during content loading states.
UX-DR10: The application shall adapt responsively: Mobile viewports (< 768px) enforce a single-column layout centered under 480px, tablet viewports (768px - 1024px) use a 2-column grid and thin nav sidebar, and desktop viewports (> 1024px) show 3-4 column grids and full tables with a fixed navigation sidebar.
UX-DR11: When the discovery feed is empty, the UI shall display a centered empty state card with a search icon, Playfair Display heading 'Expanding the Search', and filter adjustment instructions.

### FR Coverage Map

FR1: Epic 2 - Multi-step registration wizard
FR2: Epic 2 - Profile moderation queue
FR3: Epic 2 - Weekly availability slots
FR4: Epic 3 - Gender-segregated vertical scroll feed
FR5: Epic 3 - Profile card visual display
FR6: Epic 3 - Confidential interest expression
FR7: Epic 3 - Reciprocal match detection
FR8: Epic 4 - Journey lifecycle tracking
FR9: Epic 4 - First appointment coordination
FR10: Epic 4 - One-month study chat lifecycle and timer
FR11: Epic 4 - Three-month study stage promotion
FR12: Epic 4 - Journey termination reversion
FR13: Epic 5 - Real-time chat messaging
FR14: Epic 5 - Server-side regex Anti-Contact filter
FR15: Epic 4 - Dynamic operational dashboard
FR16: Epic 3 - Match management filter grid
FR17: Epic 4 - Journey Kanban tracking
FR18: Epic 6 - Searchable read-only audit log
FR19: Epic 6 - Public testimonial page
FR20: Epic 6 - Testimonial moderation tools

## Epic List

### Epic 1: Greenfield Infrastructure & Scaffolding
Set up the multi-project repository workspace, database migrations, and basic backend filters/interceptors to enable subsequent feature development.
**FRs covered:** N/A (Shared architecture foundation)

### Epic 2: Member Onboarding & Moderation Queue
Enable single members to register via a multi-step form with church department references and allow relationship leaders to validate their registration.
**FRs covered:** FR1, FR2, FR3

### Epic 3: Discovery Feed & Match Detection
Enable active members to browse profiles of the opposite sex and confidentially manifest interest, silently detecting reciprocal matches for leader coordination.
**FRs covered:** FR4, FR5, FR6, FR7, FR16

### Epic 4: Supervised Journey Lifecycle & Kanban Board
Track matched couples across 4 supervised stages (First Appointment, One-Month Study, Three-Month Study, Final Engagement) via a dashboard and active Kanban board for leaders.
**FRs covered:** FR8, FR9, FR10, FR11, FR12, FR15, FR17

### Epic 5: Secure Chat & Anti-Contact Filtering
Provide couples in active study stages with a real-time messaging space that prevents off-platform communication through server-side regex scans.
**FRs covered:** FR13, FR14

### Epic 6: Platform Audit Trail & Testimonial Landing Page
Provide system administrators with a read-only queryable activity log and visitors with a public success stories page moderated by leaders.
**FRs covered:** FR18, FR19, FR20

## Epic 1: Greenfield Infrastructure & Scaffolding

Set up the multi-project repository workspace, database migrations, and basic backend filters/interceptors to enable subsequent feature development.

### Story 1.1: Multi-Project Repository Scaffolding

As a Developer,
I want to initialize the Next.js, NestJS, and Expo projects using standard bootstrap CLI scripts,
So that we have a clean decoupled workspace for all frontend and backend development.

**Acceptance Criteria:**

**Given** an empty repository directory
**When** I run the Next.js, NestJS, and Expo CLI bootstrap commands as specified in the architecture decisions
**Then** the project directories are successfully scaffolded with TypeScript and basic configurations
**And** each project compiles and runs locally without errors.

### Story 1.2: Database Engine & Prisma ORM Scaffolding

As a Developer,
I want to set up a Docker compose configuration for PostgreSQL 18.x and initialize Prisma ORM 7.8.0,
So that we can model database entities and execute migrations.

**Acceptance Criteria:**

**Given** a backend service template
**When** I configure docker-compose for a PostgreSQL 18.x container and run it
**Then** the database is accessible locally
**And** when I configure Prisma ORM with standard schemas and environment variables
**Then** running `npx prisma db push` or `prisma migrate` successfully connects and initializes in the container.

### Story 1.3: NestJS Global Exception Filter and Response Interceptor

As a Developer,
I want to configure global filters and response wrappers in NestJS,
So that all successful API responses return the standard project envelope and error shapes match.

**Acceptance Criteria:**

**Given** the NestJS server application running
**When** I execute any request to a REST controller endpoint
**Then** a successful response is wrapped in a JSON envelope containing `status`, `statusCode`, `message`, `service`, and `data` fields
**And** any server exception returns a structured error payload adhering to the project's global conventions.


## Epic 2: Member Onboarding & Moderation Queue

Enable single members to register via a multi-step form with church department references and allow relationship leaders to validate their registration.

### Story 2.1: User and Célibataire Profile Database Model

As a Developer,
I want to define the `users` and `celibataire_profiles` models in the Prisma schema and run migrations,
So that we can persist member authentication and profile details.

**Acceptance Criteria:**

**Given** the Prisma schema file
**When** I define the schema fields for User and CelibataireProfile (incorporating gender, DOB, department, profile status, tagline, and criteria)
**And** run the migration command
**Then** the PostgreSQL database tables are created with proper constraints, FK relations, and index.

### Story 2.2: JWT and RBAC Authentication Framework

As a Célibataire or Responsable,
I want to register and authenticate via short-lived JWT access tokens and secure HTTP-only refresh cookies,
So that my session is secure and my role is validated by the system.

**Acceptance Criteria:**

**Given** the NestJS auth module
**When** I POST registration or login credentials
**Then** the server returns an access token in the JSON body
**And** saves a secure HTTP-only refresh token cookie with SameSite=Strict mapping the user role (celibataire, responsable, admin).

### Story 2.3: Multi-Step Registration Wizard (Mobile Client)

As a new single church member,
I want to complete a multi-step registration form with validation,
So that my personal and spiritual details are captured and queued for moderation.

**Acceptance Criteria:**

**Given** the mobile onboarding screen
**When** I input my name, DOB (must be >= 18), gender, tagline, department, leader, and upload a profile photo
**Then** inline validation errors are displayed for any invalid inputs
**And** clicking "Submit" sends a payload to POST /profile, creating a profile with status 'Pending Validation'.

### Story 2.4: Profile Moderation Queue Dashboard (Web Back-office)

As a Responsable,
I want to view a list of pending member profiles and approve or reject them with reason notes,
So that only verified church members can participate in the matrimonial module.

**Acceptance Criteria:**

**Given** the Responsable logged into the back-office
**When** I navigate to the moderation queue
**Then** I see a high-density grid of profiles in 'Pending Validation' status
**And** clicking "Approve" transitions their status to 'Célibataire Libre' and triggers a notification to the user
**And** clicking "Reject" prompts for a rejection reason, updating the status to rejected.

### Story 2.5: Weekly Availability Scheduling

As a Célibataire Libre,
I want to register and update my weekly available time slots,
So that leaders can view them when scheduling introductory appointments.

**Acceptance Criteria:**

**Given** the Célibataire's profile tab
**When** I select weekly availability slots and click save
**Then** the time slots are validated and saved to the database.


## Epic 3: Discovery Feed & Match Detection

Enable active members to browse profiles of the opposite sex and confidentially manifest interest, silently detecting reciprocal matches for leader coordination.

### Story 3.1: Database Model for Interest & Match Storage

As a Developer,
I want to define the `interests` table structure in the Prisma schema and run migrations,
So that we can model unilateral interest expressions and reciprocal matches.

**Acceptance Criteria:**

**Given** the database schema
**When** I define the `interests` schema (with sender, receiver, status, and created timestamps) and run migration
**Then** the PostgreSQL database is updated, mapping proper relations to user profiles.

### Story 3.2: Gender-Segregated Discovery Feed (Mobile Client)

As a Célibataire Libre,
I want to view a paginated vertical feed of active opposite-sex members with basic filter criteria,
So that I can browse potential partners without layout distortion or lag.

**Acceptance Criteria:**

**Given** the Célibataire logged in as Célibataire Libre
**When** I open the Discover tab
**Then** the system displays a vertical feed of active opposite-sex profiles (omitting En Cheminement or Suspendu)
**And** cards are rendered in a strict 4:5 ratio, utilizing Montserrat for headings and Inter for body text.

### Story 3.3: Empty Discovery Feed State & Shimmer Loaders

As a Célibataire Libre,
I want to see structured loading skeletons and clear empty states,
So that I understand when content is loading or when no search results match.

**Acceptance Criteria:**

**Given** the Discover tab
**When** the feed is loading
**Then** a grey shimmer pulse effect is displayed
**And** if no profiles are returned, a centered card is shown with the Playfair Display text "Expanding the Search" and instructions.

### Story 3.4: Confidential Interest Expression & Reciprocal Match Detection

As a Célibataire Libre,
I want to click "Express Interest" on a profile card confidentially,
So that my action is saved and evaluated for a mutual match without notifying the other member directly.

**Acceptance Criteria:**

**Given** a profile card in the Discover feed
**When** I click "Express Interest"
**Then** the database records my interest, a heart pulse animation plays, and a toast confirms "Interest registered"
**And** no indicator is sent to the target user
**And** if a reciprocal interest exists, the system automatically marks both interests as matched and alerts the leader dashboard.

### Story 3.5: Match Management Grid (Web Back-office)

As a Responsable,
I want to view and filter a table of all interests and reciprocal matches,
So that I can track matches and plan introductory appointments.

**Acceptance Criteria:**

**Given** the back-office Matches view
**When** I filter by Interest Type (Unilateral or Match)
**Then** I see the relevant rows in the grid with user details and options to coordinate the first appointment.


## Epic 4: Supervised Journey Lifecycle & Kanban Board

Track matched couples across 4 supervised stages (First Appointment, One-Month Study, Three-Month Study, Final Engagement) via a dashboard and active Kanban board for leaders.

### Story 4.1: Database Model for Journeys

As a Developer,
I want to create the `journeys` model in the Prisma schema and run migrations,
So that active relationships and their step properties are persisted.

**Acceptance Criteria:**

**Given** the database schema
**When** I define the `journeys` table (storing partner IDs, current step, timestamps, assigned leader, and status) and migrate
**Then** the database table is successfully created and constraint rules prevent users from joining multiple active journeys.

### Story 4.2: First Appointment Coordination (Step 1)

As a Responsable,
I want to schedule physical introductory meetings, record feedback, and promote the couple to Step 2,
So that they can initiate their supervised trial phase.

**Acceptance Criteria:**

**Given** the back-office appointment scheduler
**When** I view the availability slots of a matched couple and schedule an appointment
**Then** the event is recorded
**And** if both partners confirm interest after the meeting, I can click "Approve Step 2" to change their status to `En Cheminement` and open their chat.

### Story 4.3: Step 2 Expiration Checks and Redis Bull Queue Warnings

As a Responsable,
I want to receive automatic alerts when a couple's One-Month Study phase approaches or reaches its 30-day limit,
So that I can review their progress before the stage expires.

**Acceptance Criteria:**

**Given** a couple transitioning to Step 2
**When** the Redis-backed Bull queue daily check runs and detects a journey has reached Day 30 without transition
**Then** the system triggers a warning alert to the assigned Responsable's dashboard.

### Story 4.4: Step 3 (Three-Month Study) Management

As a Responsable,
I want to transition couples from Step 2 to Step 3, setting a 90-day expiration timer with notifications,
So that they can progress to physical and family introductions.

**Acceptance Criteria:**

**Given** a couple in Step 2 seeking progress
**When** I review their status and approve Step 3 in the back-office
**Then** the journey current_step transitions to Step 3, the expiration is set to 90 days, and alerts trigger at Day 85.

### Story 4.5: Journey Kanban Board (Web Back-office)

As a Responsable,
I want to view active couples on a 4-column Kanban board with days-remaining indicators,
So that I can monitor relationship statuses at a glance.

**Acceptance Criteria:**

**Given** the back-office Kanban board view
**When** active journeys are rendered across the columns (Step 1, Step 2, Step 3, Step 4)
**Then** cards display partner names, assigned leader, and days remaining (with red badges if <= 5 days)
**And** direct drag-and-drop is disabled to enforce step-by-step validation.

### Story 4.6: Journey Termination

As a Responsable,
I want to terminate a couple's active Journey on request, archiving their chat and resetting their profile statuses,
So that they can safely return to the discovery feed.

**Acceptance Criteria:**

**Given** an active Journey
**When** I click "Terminate Journey" in the back-office panel
**Then** the journey status is deactivated, the chat channel is archived as read-only, and both members' statuses revert to `Célibataire Libre`.

### Story 4.7: Operational Back-Office Dashboard Metrics

As a Responsable,
I want to view key metrics and charts detailing registration trends, active matches, and pending approvals,
So that I have clear oversight of platform activity.

**Acceptance Criteria:**

**Given** the back-office dashboard view
**When** I load the page
**Then** the cards dynamically update metrics (pending approvals, active matches, active journeys) and render trend charts.


## Epic 5: Secure Chat & Anti-Contact Filtering

Provide couples in active study stages with a real-time messaging space that prevents off-platform communication through server-side regex scans.

### Story 5.1: Database Model for Messages with Encryption

As a Developer,
I want to define the `messages` table in the Prisma schema, using AES-256-GCM to encrypt content at rest,
So that private communications are secure.

**Acceptance Criteria:**

**Given** the database schema
**When** I define the messages model (journey_id, sender_id, content, sent_at, and is_flagged) and migrate
**Then** messages are saved to the database, and inspecting raw database columns shows content is fully encrypted.

### Story 5.2: Socket.io Real-Time Messaging Gateway

As a Célibataire En Cheminement,
I want to send and receive real-time text messages in my journey chat channel,
So that I can communicate with my partner instantly.

**Acceptance Criteria:**

**Given** the Socket.io `/chat` namespace
**When** I send a message payload
**Then** the message latency is under 300ms, it is saved in the database, and the target client receives the message in real-time.

### Story 5.3: Server-Side Anti-Contact Regex Filter Middleware

As a Developer,
I want to inspect all WebSocket messages using regex filters for phone numbers, emails, and social handles,
So that off-platform contact sharing is prevented.

**Acceptance Criteria:**

**Given** a message sent via WebSockets
**When** the message matches regex rules for standard French/international phone formats, emails, or social domains
**Then** the server blocks message delivery, sets `is_flagged = true`, logs the incident, and updates the leader's action list.

### Story 5.4: Mobile Chat UI, Warning Banner, and Violation Feedback

As a Célibataire En Cheminement,
I want to access a chat view with a warning banner, and receive instant feedback if I violate contact sharing rules,
So that I am clearly guided on communication guidelines.

**Acceptance Criteria:**

**Given** the mobile Journey chat screen
**When** the view loads
**Then** a fixed warning banner is pinned to the top (10% Soft Red background, lock icon)
**And** if I attempt to type and send contact details, the input outline turns red, the send button is disabled, a warning toast alerts me, and error text displays below the input field.


## Epic 6: Platform Audit Trail & Testimonial Landing Page

Provide system administrators with a read-only queryable activity log and visitors with a public success stories page moderated by leaders.

### Story 6.1: Relationship Audit Trail Logging and Search (Web Back-office)

As a system administrator,
I want to view a read-only log of all administrative actions, promotions, terminations, and anti-contact violations,
So that I have a complete relationship audit trail.

**Acceptance Criteria:**

**Given** the back-office Audit view
**When** I search or filter by dates or actions
**Then** the system returns matching audit logs in a read-only layout.

### Story 6.2: Testimonial Moderation & Landing Page

As a visitor or relationship leader,
I want to read approved success stories on a public page, and edit/moderate testimonials in the back-office,
So that platform success is showcased safely.

**Acceptance Criteria:**

**Given** the public landing page
**When** visitors load the site
**Then** approved testimonials are displayed
**And** in the back-office, Responsables/Admins can write, edit, and approve draft testimonials.
