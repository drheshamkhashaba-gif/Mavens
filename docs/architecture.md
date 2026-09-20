# Glow Up Acne application architecture

## Phase one foundation

The application uses Cloudflare D1 as the single source of truth for structured clinical and operational records. R2 remains reserved for private image bytes; D1 stores ownership and clinical metadata. The existing bilingual portals remain in place while their local demo state is progressively replaced by authenticated server operations.

## Authorization

Authentication comes from the private Site's verified ChatGPT user headers. Authorization is independent and server-side: `role_assignments` scopes a user to an organization and optional clinic. Every write endpoint resolves the current user, tenant membership, required permission, and patient scope before querying or mutating data. UI role switches are demonstrations only and never grant access.

Roles are Patient, Doctor, Reception, Specialist, Journey Coordinator, Clinic Admin, Medical Director, Marketing, and Super Admin. Clinical decisions are restricted to Doctor, Medical Director, or Super Admin. Marketing access is gated by active marketing consent and never follows from medical consent.

## Journey state machine

`LEAD → REGISTERED → ASSESSMENT → CONSULTATION → ACTIVATED → PREPARATION → ACTIVE_TREATMENT → FINAL_REVIEW → MAINTENANCE → GRADUATED`

Exceptional states are `ON_HOLD`, `EXTENDED`, `TRANSFERRED`, and `CANCELLED`. A journey moves only through documented events. Hold, extension, transfer, and cancellation require a reason. Clinical transitions require a clinical role. Each accepted transition uses optimistic version locking and writes the state update, immutable journey event, and audit event in one D1 batch.

## Clinical configuration safety

Unapproved medical templates, questions, device rules, thresholds, outcome criteria, maintenance routines, and retention policies are stored as versioned `draft` configurations. Only a Medical Director approval can make a future version effective. The first phase does not invent any clinical threshold.

## Delivery sequence

1. Database, RBAC, journey engine, migrations, and logic tests.
2. Admin and reception operations connected to the foundation.
3. Doctor workflows and clinical approvals.
4. Patient portal connected to durable records.
5. Messaging, reminders, jobs, adapters, retries, and delivery logs.
6. Evidence, marketing-consent firewall, analytics, and outcomes.
7. End-to-end tests, privacy controls, private media, and approved external integrations.
