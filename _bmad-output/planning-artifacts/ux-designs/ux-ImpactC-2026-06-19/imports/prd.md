---
title: ImpactC — Matrimonial Module
created: 2026-06-19
updated: 2026-06-19
status: final
---

# PRD: ImpactC — Matrimonial Module

## 0. Document Purpose
This Product Requirement Document (PRD) outlines the requirements, specifications, and scope for the Matrimonial Module of the ImpactC platform. It is intended for product managers, system architects, UI/UX designers, developers, and church leadership stakeholders. 

The document defines a glossary-anchored vocabulary to prevent terminology fragmentation. Requirements are organized by feature area, and cross-cutting non-functional requirements are specified. Key technical architectures, database schemas, and visual tokens are moved to the companion [addendum.md](file:///c:/Users/kahonsu/Documents/GitHub/ImpactC/_bmad-output/planning-artifacts/prds/prd-ImpactC-2026-06-19/addendum.md) to preserve the PRD's focus on capabilities rather than implementations.

## 1. Vision
Within many religious communities, rules of propriety and mutual respect naturally limit direct, unmoderated interactions between single members of the opposite sex. While upholding deep values, this often results in members seeking partners outside the church, which can weaken community cohesion and identity.

The Matrimonial Module of ImpactC addresses this by offering a secure, supervised, and value-aligned digital space. It enables singles to discover one another, express interest confidentially, and progress toward marriage through a structured four-stage guidance process validated by designated relationship leaders. The platform builds a bridge of trust between traditional spiritual guidance and modern matching convenience.

## 2. Target User

### 2.1 Jobs To Be Done
- **Célibataire (Single Member)**: 
  - *Functional*: Find a compatible partner of the opposite sex within the church who shares the same values and spiritual alignment.
  - *Emotional*: Feel safe and protected from awkwardness or unwanted direct advances. Explore potential relationships with peace of mind.
  - *Social*: Maintain a good reputation in the church community while actively seeking a spouse.
- **Responsable (Relationship Leader)**:
  - *Functional*: Effectively monitor matching interest, coordinate and supervise meetings, and guide couples through relationship milestones.
  - *Social/Spiritual*: Protect the values of the church, prevent inappropriate behavior, and foster healthy, lasting marriages.
- **Administrateur (System Administrator)**:
  - *Functional*: Control platform access, manage user roles, moderate inappropriate content, and monitor health statistics of the matching community.

### 2.2 Non-Users (v1)
- General public outside the registered church community.
- Non-single church members (married, engaged outside the platform) except in a guest capacity for viewing public testimonials.
- Members seeking casual dating or non-marital relationships.

### 2.3 Key User Journeys
All user journeys utilize Glossary terms verbatim.

- **UJ-1. Onboarding and Profile Approval**
  - **Persona + context**: Francis, a 28-year-old single church member active in the youth ministry, wants to find a spouse within the community.
  - **Entry state**: Authenticated via basic credentials but profile does not yet exist.
  - **Path**: Francis navigates to the registration wizard. He inputs his personal data (name, age, city), spiritual details (department, department leader, church seniority), professional status, uploads a profile photo, and specifies his search criteria. He submits the profile.
  - **Climax**: A Responsable reviews the submission in the back-office, verifies Francis's church department service, and validates the profile. Francis receives a push notification: "Your profile has been approved."
  - **Resolution**: Francis's status is set to Célibataire Libre, making his profile visible in the discovery feed of female Célibataires.
  - **Edge case**: If Francis uploads a photo that violates church modesty guidelines, the Responsable rejects the profile, leaving it in a draft state and sending Francis a feedback message requesting a new photo.

- **UJ-2. Manifesting Interest and Matching**
  - **Persona + context**: Sarah, a 25-year-old Célibataire Libre, is browsing profiles in the discovery feed.
  - **Entry state**: Authenticated and viewing the feed on her mobile device.
  - **Path**: Sarah scrolls vertically, filters by department, and clicks on Francis's profile card. She reads his tagline and spiritual description. She clicks "Express Interest."
  - **Climax**: The system records the interest. Francis receives no notification, and the action remains completely confidential. However, because Francis had previously clicked "Express Interest" on Sarah's profile, the system detects a Match.
  - **Resolution**: The system automatically flags the Match in the back-office dashboard for the assigned Responsable, prompting them to initiate contact and coordinate their First Appointment.

- **UJ-3. First Appointment and Transition to Study (Step 1 to Step 2)**
  - **Persona + context**: A Responsable, Sister Martha, coordinates the meeting between Francis and Sarah after their Match.
  - **Entry state**: Authenticated as a Responsable on the desktop management board.
  - **Path**: Sister Martha schedules a supervised in-person meeting. The meeting occurs at the church office with Sister Martha present. Afterwards, Sister Martha interviews Francis and Sarah separately. Both declare they wish to continue. Sister Martha logs into the back-office and clicks "Approve Step 2."
  - **Climax**: The system transitions the couple to the One-Month Study (Step 2). Their statuses change to En Cheminement, hiding them from all other users' discovery feeds.
  - **Resolution**: A secure, private chat channel opens between Francis and Sarah on the platform, initialized with a banner detailing communication boundaries.

- **UJ-4. Secure Chat and Anti-Contact Filter Trigger**
  - **Persona + context**: Francis and Sarah are chatting in their secure channel during the One-Month Study.
  - **Entry state**: Authenticated, chatting within their private channel.
  - **Path**: Wanting to continue the conversation outside the app, Francis types: "Call me on 0612345678." He clicks send.
  - **Climax**: The server-side Anti-Contact Filter intercepts the message, blocks it from being sent, and displays an on-screen warning: "Sharing phone numbers, emails, or social media handles is prohibited during this phase."
  - **Resolution**: The blocked attempt is logged in the system audit trail for Sister Martha's review. The chat continues without exchanging off-platform contacts.

- **UJ-5. Journey Termination**
  - **Persona + context**: During the Three-Month Study (Step 3), Sarah realizes their interests do not align and wants to stop.
  - **Entry state**: Sarah contacts Sister Martha to express her decision.
  - **Path**: Sister Martha schedules a short debrief. She then logs into the back-office, selects their active Journey, and clicks "Terminate Journey."
  - **Climax**: The system closes and archives the chat channel immediately. The active Journey status is marked inactive.
  - **Resolution**: Both Francis and Sarah have their statuses reset to Célibataire Libre. Their profiles immediately reappear in the discovery feed of other members.

## 3. Glossary
- **Célibataire (Single)**: A verified member of the church registered on the platform to find a spouse.
- **Responsable (Relationship Leader)**: A designated church leader with back-office clearance to validate profiles, plan appointments, and approve couple transitions.
- **Administrateur (System Administrator)**: A technical administrator managing security policies, user roles, system metrics, and logs.
- **Célibataire Libre (Free Single)**: A Célibataire whose profile is active, visible to the opposite sex, and not engaged in any active matching journey.
- **En Cheminement (In Journey)**: The profile status of a Célibataire engaged in an active matching journey, which hides their profile from the discovery feed.
- **Manifestation d'Intérêt (Interest Expression)**: A confidential digital like submitted by a Célibataire toward another. Completely invisible to the recipient.
- **Match**: A reciprocal pair of Manifestations d'Intérêt between two Célibataires of the opposite sex.
- **Journey (Cheminement)**: The structured matching process for a couple, divided into 4 sequential steps, under the supervision of a Responsable.
- **First Appointment (Step 1)**: A supervised, face-to-face introductory meeting between two matched Célibataires.
- **One-Month Study (Step 2)**: A 30-day trial phase where the couple communicates exclusively through the secure chat.
- **Three-Month Study (Step 3)**: A 90-day phase allowing more regular in-person meetings and family introductions, supervised by a Responsable.
- **Final Study (Step 4)**: The final phase of study and formal engagement before transitioning to marriage preparations or terminating the journey.
- **Anti-Contact Filter**: A system validation rule that scans, flags, and blocks messages containing contact details (phones, email, socials).

---

## 4. Features

### 4.1 Onboarding & Profile Management
**Description:** New users register and build a profile in a step-by-step wizard. Profiles must be vetted by a Responsable before becoming active.
*Realizes UJ-1.*

**Functional Requirements:**
#### FR-1: Multi-Step Registration Wizard
The system shall present a multi-step registration wizard on mobile to capture a Célibataire's details.
**Consequences:**
- Validation errors are shown inline.
- Fields required: Name, Gender, Date of Birth, City, Church Department, Department Leader, Professional Status, Financial Range, Profile Photo, Tagline, Search Criteria.
- Minimum age requirement is 18 years.

#### FR-2: Profile Moderation Queue
The system shall route newly completed profiles to a moderation queue accessible only to Responsables.
**Consequences:**
- Status of a new profile defaults to `Pending Validation`.
- Responsables can accept (transitions user to Célibataire Libre) or reject with reason notes.
- Users cannot log in to search or view feeds until approved.
- `[ASSUMPTION: Church Attendance Verification]`: The Responsable manually verifies the applicant's active church service with the listed department leader prior to approval.

#### FR-3: Profile Availability Management
A Célibataire Libre shall be able to register weekly availability slots for meetings.
**Consequences:**
- Availability slots are viewable by Responsables when scheduling.

---

### 4.2 Discovery Feed
**Description:** Célibataires browse profiles of the opposite sex, filtered by basic criteria, using visually clean cards.
*Realizes UJ-2.*

**Functional Requirements:**
#### FR-4: Gender-Segregated Vertical Scroll Feed
A Célibataire Libre shall see a vertical feed of active opposite-sex profiles in the Célibataire Libre status.
**Consequences:**
- Male users see only female profiles; female users see only male profiles.
- Profiles under the En Cheminement or Suspendu statuses are omitted from search results and feeds.

#### FR-5: Profile Card Visual Display
The feed shall render profile cards displaying the photo, name, age, profession, department, and personal tagline.
**Consequences:**
- Complete profile details are revealed only when tapping the card.

---

### 4.3 Interest Expression & Match Detection
**Description:** Users express interest in a profile blindly and confidentially. The system flags reciprocal matches to Responsables.
*Realizes UJ-2, UJ-3.*

**Functional Requirements:**
#### FR-6: Confidential Interest Expression
A Célibataire Libre shall be able to click "Express Interest" on a profile card.
**Consequences:**
- The recipient receives no notification, indicator, or change in their UI.
- Only Responsables and Admins can view this transaction in the back-office database.

#### FR-7: Reciprocal Match Detection
Upon an Interest Expression, the system shall evaluate if a reciprocal interest exists between the two users.
**Consequences:**
- If reciprocal, the system generates a `Match` record and sends an alert to the relationship management dashboard for Responsables.

---

### 4.4 Supervised Journey Workflow (Four Steps)
**Description:** Couples transition through 4 supervised steps. Responsables validate all stage progressions.
*Realizes UJ-3, UJ-5.*

**Functional Requirements:**
#### FR-8: Journey Lifecycle and State Tracking
The system shall track active couple Journeys, storing: partner IDs, current step, start date, expiration date, and assigned Responsable.
**Consequences:**
- `[ASSUMPTION: Single Active Journey]`: A user can belong to only one active Journey at any time.

#### FR-9: Step 1 (First Appointment) Coordination
The Responsable shall schedule the introductory physical meeting and record separate feedback post-meeting.
**Consequences:**
- If both partners click "Continue" (recorded separately), the Responsable can click "Transition to Step 2."
- If either declines, the Journey is closed, and users return to Célibataire Libre status.

#### FR-10: Step 2 (One-Month Study) Expiration & Chat Lifecycle
Upon entering Step 2, the system shall change both users' profiles to En Cheminement, hide them from the feed, open their private chat channel, and set a 30-day expiration timer.
**Consequences:**
- The chat channel remains active for exactly 30 days.
- Daily status check runs: when the 30-day limit is reached without the Responsable logging a transition, the system triggers a warning notification to the Responsable.

#### FR-11: Step 3 (Three-Month Study) Management
The Responsable shall transition the couple to Step 3 upon mutual consent after the Step 2 review, setting a 90-day expiration.
**Consequences:**
- Chat channel remains open. Expiration warnings alert the Responsable at day 85.

#### FR-12: Journey Termination
At any point, a partner or the Responsable can request termination. The Responsable triggers the termination action.
**Consequences:**
- The chat channel is instantly archived and made read-only.
- Profile statuses for both users revert to Célibataire Libre.
- The users' profiles reappear in the discovery feed.

---

### 4.5 Secure Chat & Anti-Contact Filtering
**Description:** Partners in Step 2, 3, or 4 chat in real-time. System-side checks prevent sharing external contacts.
*Realizes UJ-4.*

**Functional Requirements:**
#### FR-13: Real-Time Encrypted Chatting
Partners in an active Step 2, 3, or 4 Journey shall communicate via a real-time messaging interface.
**Consequences:**
- Messages are encrypted at rest in the database.
- Chat history is archived and inaccessible to the users once the Journey is terminated.

#### FR-14: Server-Side Anti-Contact Filter
The system shall check each outbound message for contact sharing patterns before saving.
**Consequences:**
- Checks match phone number formats, email addresses, and social network links/handles.
- If a pattern is matched, the message is blocked from delivery, the sender sees a prohibition warning, the violation is logged in the system audit trail, and a high-priority action card is automatically displayed on the assigned Responsable's dashboard (FR-15).

---

### 4.6 Responsable Back-Office & Management Tools
**Description:** A dashboard and administrative suite allowing Responsables to moderate profiles, manage matches, schedule meetings, and trace histories.

**Functional Requirements:**
#### FR-15: Operational Dashboard
The system shall present an overview dashboard for Responsables containing: key metrics (pending approvals, active matches, weekly scheduled appointments, active journeys) and registration trend charts.
**Consequences:**
- KPI elements must dynamically update.

#### FR-16: Match Management Grid
The system shall list all unilateral interests and bilateral matches in a filterable table.
**Consequences:**
- Responsables can filter by Interest Type (Unilateral / Match) and coordinate appointments directly from rows.

#### FR-17: Journey Kanban Board
The system shall render active Journeys on a 4-column Kanban board (Step 1, Step 2, Step 3, Step 4).
**Consequences:**
- Cards show the partners' names, assigned Responsable, and days remaining.

#### FR-18: Relationship Audit Trail & History
The system shall log all administrative actions (approvals, rejections, step promotions, terminations, anti-contact violations, and meeting notes) in a central audit record.
**Consequences:**
- Audit logs are read-only and searchable by Administrateurs.

---

### 4.7 Testimonial System
**Description:** A public space sharing success stories of couples married via the platform.

**Functional Requirements:**
#### FR-19: Public Read-Only Testimonials
The platform shall render approved couple success stories on a public, unauthenticated landing page.
**Consequences:**
- Available to church visitors to build community confidence.

#### FR-20: Testimonial Moderation
Responsables and Admins shall be able to draft, edit, and approve testimonials.
**Consequences:**
- Testimonials remain in `Draft` and invisible publicly until approved.

---

## 5. Non-Goals (Explicit)
- **General Chatting**: The system will not allow chat interactions outside of active Journeys (Step 2, 3, or 4). There is no "direct message" capability for Célibataires Libre.
- **Audio/Video Calls**: The platform will not provide in-app calling or video chat. Communication is strictly text-based.
- **Automated Matchmaking**: The system will not use algorithms or artificial intelligence to recommend matches. Matches occur purely through user-driven reciprocal interests.
- **In-App Monetization**: There will be no payment gateway, premium tier, or ad placements in v1. The system is sponsored entirely by the church organization.
- **Self-Service Journey Transitions**: Couples cannot transition between steps or exit steps without the explicit review and action of their assigned Responsable.

## 6. MVP Scope

### 6.1 In Scope
- Mobile-responsive interface for Célibataires (Registration, Onboarding, Profile, Discovery Feed, Confidential Interest, Chat).
- Web-responsive panel for Responsables (Moderation queue, Match management grid, Journey Kanban board, Appointment coordinator, and manual Journey assignment control).
- Structured 4-stage Journey lifecycle workflow with manual assignment of Responsables to Journeys by church leadership.
- Secure real-time chat with the server-side Anti-Contact Filter.
- Testimonial landing page (read-only for guests, editable for Responsables).
- Security controls: RBAC, encrypted chat messages, secure session tokens.

### 6.2 Out of Scope for MVP
- Native Android/iOS mobile application packaging (deferred to v2; v1 targets mobile web app responsive shell).
- Automatic integration with external calendars (e.g. Google Calendar, Outlook) for scheduling (deferred to v2).
- Advanced profile customization (e.g. video introductions, personality quizzes) (deferred to v3).
- Automated reporting emails/weekly digest letters to leaders (deferred to v2).

## 7. Success Metrics

### Primary
- **SM-1**: Number of active matches successfully transitioning from Step 1 (First Appointment) to Step 2 (One-Month Study) within a quarter. Target: >50% transition rate. Validates FR-9, FR-10.
- **SM-2**: Number of successful marriages concluded through the platform. Target: >=5 marriages in the first 12 months. Validates FR-11, FR-12.

### Secondary
- **SM-3**: Average profile moderation turnaround time (from submission to validation/rejection). Target: <48 hours. Validates FR-2.
- **SM-4**: Blocked contact sharing attempts. Target: 100% of contact share messages caught. Validates FR-14.

### Counter-metrics (Do not optimize)
- **SM-C1**: Total chat message volume per couple. *Why*: High message volume without progressing to Step 3 meetings might signify stagnation or avoidance of physical steps. Do not optimize for high chat engagement; optimize for structured transition. Counterbalances SM-1.
- **SM-C2**: Profile rejection rate. *Why*: Overly aggressive profile rejections could discourage sincere applicants. Rejections should only enforce factual validation (church service, photo decency). Counterbalances SM-3.

## 8. Open Questions
1. **Photo Verification Process**: Do we need automated facial verification (e.g., matching the uploaded profile photo to a government ID or live selfie check), or is manual Responsable validation sufficient for v1?
2. **Leader Assignments**: Should the system automatically assign a Responsable to a Journey based on load balancing, or should the church leadership manually assign them for every match?
3. **Data Retention Policy**: What is the legal/church data retention policy for chat history after a Journey terminates? Should chat history be deleted immediately, or archived for a specific period in case of community disputes?

## 9. Assumptions Index
- **§4.1 [FR-2]**: Church Attendance Verification — The Responsable will manually contact the department leader to verify active church service.
- **§4.1 [FR-2]**: Photo Guidelines — The uploaded photo is assumed to be moderate and representative, verified manually by the Responsable before approval.
- **§4.4 [FR-8]**: Single Active Journey — A user can only belong to one active Journey at any time.
- **§4.4 [FR-9]**: Supervised Meetings — During Steps 2 and 3, in-person meetings are assumed to be coordinated through the Responsable or at least reported to them to maintain supervision rules.

---

## 10. Adapt-In Menu

### Cross-Cutting NFRs
- **Security & Privacy**:
  - The system must enforce Role-Based Access Control (RBAC) across all endpoints.
  - User authentication tokens must have a short lifespan, using secure, HTTP-only refresh tokens.
  - Chat history must be encrypted at rest in the database.
  - All communication must transit over secure TLS 1.3 channels.
- **Performance**:
  - Chat message delivery latency must be under 300ms.
  - Feeds must render profiles using pagination or lazy loading to keep loading times under 1.5 seconds.
  - Redis cache must be utilized to store user session data and frequent profile reads.
- **Accessibility**:
  - Contrast ratios for text must meet WCAG 2.1 AA requirements (minimum 4.5:1 for standard text).
  - All form controls must be navigable and executable via keyboard inputs.
  - Images must have alt-attributes defined.

### Aesthetic and Tone
- **Visuals**: Slate Blue primary color (representing trust, stable foundation) and Soft Gold secondary accents (representing commitment, value). 
- **Typography**: Playfair Display for headings (prestige and ceremony) and Inter/Montserrat for body text (clean legibility on small screens).
- **Tone**: The application copy must maintain a respectful, warm, and serious tone. Language should be encouraging and focus on spiritual growth and relational maturity rather than superficial hookup culture terminology.

### Compliance and Regulatory
- **Data Protection**: Implement basic GDPR compliance features for users residing in Europe (e.g., consent checkboxes at registration, right to account deletion, exportable profile data request).
