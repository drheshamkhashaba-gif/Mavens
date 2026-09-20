# Derma Glow Precision Care

A bilingual, physician-led patient journey application for Derma Glow. The current build preserves the pilot interfaces while phase one adds the durable operating foundation:

- a mobile-first Digital Skin Passport;
- a three-step 30-second Skin Check and red-flag escalation;
- staff priority queue, alert SLA context, assessment review, and physician approval;
- admin program template stages, alert rules, bilingual settings, and version publishing;
- a tenant-aware D1 single patient record and a private R2 binding for future clinical photos;
- server-side role assignments for nine roles with least-privilege permission checks;
- an event-driven patient journey state machine with version locking and immutable audit events;
- draft-only clinical configuration records until Medical Director approval.
- an Admin and Reception operations center backed by D1 for patient registration, reception, consent, standardized imaging handoff, scheduling, reschedule review, and journey coordination.
- a physician workspace backed by D1 for risk-prioritized review, Patient 360, consultation approval, longitudinal imaging context, session decisions, daily review, alerts, clinical notes, and Medical Director template approval.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm run install:ci
npm run db:generate
npm run db:seed:local
npm run dev
```

Use `npm test` for the production build and component/render tests.

The optional local seed contains fictional `.invalid` accounts and clearly labelled demo records only. It is intentionally separate from migrations and must not be applied to production.

## Architecture

The UI is React/Next.js running through Vinext for Cloudflare Workers. Durable records use the logical `DB` D1 binding; private image bytes use `BUCKET` R2, with ownership metadata in D1. Every patient-scoped table carries `tenant_id`; server authorization must resolve membership and tenant before any record query.

Program versions are immutable definitions. An enrollment stores a snapshot, so later template versions do not alter an active patient journey.

See `docs/architecture.md` for the staged delivery plan, RBAC boundary, state machine, and clinical configuration safety model.

## Safety and current limitations

The visible analysis is explicitly a deterministic demo—not a diagnosis. Red-flag answers create a care-team alert independently of analysis. A physician approval is required to activate a treatment plan.

The visible portals still use fictional interface records while they are connected incrementally in phases two through four. The journey transition endpoint is authenticated, tenant-scoped, permission-checked, version-locked, and audit-writing. Before a clinical pilot, complete private media access and legal/security review for Jordan. No claim of regulatory compliance is made.

No secrets belong in source control. Future analysis and messaging providers must use hosted environment variables and must not log health data, images, tokens, or raw provider payloads.
