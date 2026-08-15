# Patient Intake

A real-time patient intake system for clinic front desks. A patient fills in an
intake form on their own device while a staff member watches the answers appear
live on a separate screen — field by field, as they are typed, without waiting
for a submission or refreshing anything.

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, React Hook Form
with Zod, and Supabase Realtime.

---

## How it works

Two routes, one shared channel:

| Route    | Who it is for  | What it does                                        |
| -------- | -------------- | --------------------------------------------------- |
| `/`      | The patient    | The intake form — thirteen fields, three sections   |
| `/staff` | The front desk | A live read-only record of that form as it fills in |

**There is no link between the two views**, by design: a patient handed a tablet
should have no route into the monitoring screen. Open `/staff` in a second
window to see the sync — the two views are meant to be watched side by side
rather than navigated between.

Every message flows patient → staff. The staff view subscribes and renders; it
never broadcasts. Connection status is not sent as a message either — it is
derived from Supabase Presence and from the timestamp of the last field change.
The full contract is in [docs/realtime-sync.md](docs/realtime-sync.md).

---

## Getting started

**Prerequisites** — Node 20.9 or newer, and a free
[Supabase](https://supabase.com) project.

### 1. Create a Supabase project

No tables, SQL or migrations are needed. This app uses only Broadcast and
Presence, which work on a fresh project — nothing is written to a database.

From **Project Settings → API**, copy the project URL and the `anon` public key.

### 2. Configure the environment

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Both are public by design — they are sent to the browser, which is why they
carry the `NEXT_PUBLIC_` prefix. The `anon` key grants no database access here.

### 3. Install and run

```bash
npm install
npm run dev
```

### 4. Watch it sync

Open two browser windows side by side:

- [localhost:3000](http://localhost:3000) — the patient form
- [localhost:3000/staff](http://localhost:3000/staff) — the front desk view

Type in the patient window. Values appear in the staff window within a moment,
the changed row tints briefly, and the status badge moves between **Waiting**,
**Connected**, **Filling in** and **Submitted**. Close the patient window and
the badge becomes **Disconnected** while the values already given stay on
screen.

---

## Known limitations

These follow from decisions recorded in
[docs/project-context.md](docs/project-context.md), not from unfinished work.

- **A patient refresh clears the form.** Nothing is persisted on the patient
  side, so a refresh returns an empty form and the staff view sees the values
  disappear. It looks like a bug and is accepted as one: patient-side
  persistence is an explicit non-goal.
- **One intake at a time.** Both views join a single shared channel, so the app
  supports one patient session. Per-session channels are a natural extension.
- **Nothing is stored.** Broadcast messages are ephemeral and there is no
  database. A submitted record lives only on the screens currently open.
- **No authentication.** `/staff` is open to anyone who knows the URL. Access
  control for the staff view is out of scope.

---

## Beyond the brief

These are in the app, not extras you have to imagine:

- **Begin intake** — opening `/` does not join the channel. Staff stay on
  Waiting until the patient taps the button.
- **Late-join snapshot** — a staff tab opened mid-form (or after submit)
  receives the current values in one payload, including the submitted flag.
- **Previous submission** — Start new intake keeps the last record on the
  staff screen until the next patient types.
- **Reconnecting vs Disconnected** — a dropped staff socket shows an amber
  banner and dims the record; a patient leaving keeps the values at full
  strength under Disconnected.
- **Conditional emergency contact** — the pair is optional, but filling one
  field requires the other.

---

## Deployment

Deploys to Vercel with no configuration beyond the two environment variables
above — add both under **Project Settings → Environment Variables**, then
deploy from the connected GitHub repository.

---

## Documentation

The planning documents are the specification this app is built against, and are
worth reading in this order:

| Document                                                    | What it settles                                   |
| ----------------------------------------------------------- | ------------------------------------------------- |
| [project-context.md](docs/project-context.md)               | Purpose, scope, non-goals, tech-stack rationale   |
| [design-decisions.md](docs/design-decisions.md)             | UI/UX across five flows — the authoritative spec  |
| [realtime-sync.md](docs/realtime-sync.md)                   | Channel, Presence, events, badge resolution order |
| [project-structure.md](docs/project-structure.md)           | Folder layout and where new code belongs          |
| [component-architecture.md](docs/component-architecture.md) | Component trees, state ownership, data flow       |

UI/UX decisions, including layout at different screen sizes, are in
[docs/design-decisions.md](docs/design-decisions.md).
