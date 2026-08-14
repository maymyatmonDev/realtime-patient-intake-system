# Project Context

## Purpose

A real-time patient intake system for clinic front desks. Patients complete an
intake form on their own device while staff monitor the incoming information
live from a separate view. Both interfaces stay synchronised in real time, so
staff can see the details a patient is providing as they provide them, rather
than waiting for a submission.

## Problem

Traditional intake is either paper-based or a form that staff only see once it
is submitted. Neither lets a staff member help a patient who is mid-way through
the process, spot an obvious error early, or prepare while the patient is still
filling things in. This project addresses that gap with a live, shared view of
the intake in progress.

## Scope

**Patient form** — a responsive form capturing personal details, contact
information and an optional emergency contact, with validation on submission.

**Staff view** — a responsive interface displaying every field from the patient
form as it is entered or updated, along with indicators showing whether the
patient is connected, actively filling in the form, or has submitted it.

**Real-time synchronisation** — patient input propagates to the staff view
immediately, without a page refresh on either side.

## Non-goals

The following are deliberately out of scope, to keep the system focused on the
brief:

- Authentication or role-based access control for staff.
- Long-term persistence of submitted records in a database.
- Editing or administration of past submissions (no CRUD over records).
- Analytics, reporting or dashboards beyond the live intake view.
- Multi-language UI. The form captures a preferred language as data, but the
  interface itself is English only.

## Tech stack

| Concern         | Choice                        | Reason                                                                                                     |
| --------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Framework       | Next.js 16 (App Router)       | Required by the brief. App Router is the current default and supports the client-side interactivity needed. |
| Language        | TypeScript                    | Compile-time guarantees that both interfaces agree on the shape of the data being exchanged.                |
| Styling         | Tailwind CSS v4               | Required by the brief. Utility classes keep responsive rules next to the markup they affect.                |
| UI components   | Hand-rolled with Tailwind     | No component-library setup cost, and full control over the responsive behaviour being assessed.             |
| Form state      | React Hook Form               | Uncontrolled inputs minimise re-renders across a twelve-field form.                                         |
| Validation      | Zod                           | Schema doubles as the single source of truth: the TypeScript type is derived from it via `z.infer`.         |
| Real-time       | Supabase Realtime             | Browser-to-browser Broadcast and Presence with no backend server to build or host.                          |
| Hosting         | Vercel                        | First-class Next.js support and zero-configuration deploys from GitHub.                                     |

The real-time choice is the load-bearing one and is explained in full in
[realtime-sync.md](./realtime-sync.md). In short: Vercel runs serverless
functions that cannot hold long-lived socket connections, so a self-hosted
WebSocket server would have meant abandoning either the suggested transport or
the suggested host. Supabase Realtime resolves that conflict by moving the
socket infrastructure off the application entirely, and its Presence feature
provides the connection tracking the status indicators depend on.

## Constraints and assumptions

- **Single intake session.** The brief refers to "the patient form" in the
  singular, so both interfaces join one shared channel. Supporting multiple
  concurrent patients via per-session channels is treated as an enhancement
  rather than a core requirement.
- **No persistence.** Broadcast messages are ephemeral; nothing is stored
  server-side. This is acceptable for a live monitoring view and keeps the
  system free of a database.
- **No real patient data.** The form is a demonstration and handles no genuine
  personal health information.

## Deliverables

- Source code repository.
- Deployed application on Vercel.
- README with an overview, setup instructions and bonus features.
- Planning documentation: [project structure](./project-structure.md),
  [design decisions](./design-decisions.md),
  [component architecture](./component-architecture.md) and
  [real-time synchronisation flow](./realtime-sync.md).
