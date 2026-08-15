# Real-time Synchronisation

This document defines the real-time contract between the patient form and the
staff view: the channels, the Presence payloads, the events, and the state each
side derives from them.

It is the contract both clients are built against. Timings in Observed
behaviour were confirmed by running the two views side by side.

---

## Why Supabase Realtime

The brief suggests WebSockets for transport and Vercel for hosting. Those two
are in direct conflict: Vercel runs serverless functions that cannot hold
long-lived socket connections, so a self-hosted WebSocket server would have
meant abandoning either the suggested transport or the suggested host.

Supabase Realtime resolves the conflict by moving the socket infrastructure off
the application entirely. The browser still speaks WebSocket — Supabase operates
the server. Two of its features map directly onto what this system needs:

- **Broadcast** — browser-to-browser messages with no backend to build, and no
  persistence, which matches the no-database non-goal rather than working
  against it.
- **Presence** — per-client state tracking with join and leave events, which is
  what the connection status indicators are derived from.

No database table is involved. Nothing is stored.

---

## Channel model

Two layers, so concurrent patients do not blend into one record.

**List** — one fixed channel, `intake-list`. Every active patient session
tracks Presence here. The staff list at `/staff` is built from that Presence
state alone: no broadcast events, and join/leave is free.

**Session** — `intake-session:{sessionId}`. The existing `field-change` /
`submit` / `session-reset` / `state-snapshot` contract, unchanged, scoped to
one intake. `sessionId` is a `crypto.randomUUID()` created when the patient
taps Begin intake. It lives in React state only; a refresh starts a new
session.

Staff subscribe to the list (no track) and to one session channel when they
open `/staff/[sessionId]`. Staff still never broadcast on either channel.

**Clients do not receive their own broadcasts.** The patient must not react to
its own `field-change` events, and this is also what keeps the staff-join
detection below from firing on the patient's own join.

---

## List Presence

Tracked by the patient on `intake-list`, re-tracked on change (throttled ~1s):

```ts
const listPresenceSchema = z.object({
  sessionId: z.string(),
  displayName: z.string(), // "First Last", or "Unnamed intake"
  filledCount: z.number(),
  totalCount: z.number(),
  status: z.enum(["filling", "idle", "submitted"]),
  lastChangeAt: z.number().nullable(), // null until the first field-change
  startedAt: z.number(),
  values: z.record(z.string(), z.string()), // filled fields only; seeds the detail view
});
```

`displayName` and the counts come from the patient's own form state, so the
list never needs field-level broadcasts. Staff see who is present and how far
along without joining a session channel.

Submitted sessions stay in the list until the patient resets or disconnects.
`lastChangeAt` is null until the first `field-change`, so a new row is
**Connected**, not **Filling in**.

---

## Session Presence

Every client on a session channel tracks a Presence payload on subscribe:

```ts
const presenceSchema = z.object({
  role: z.enum(["patient", "staff"]),
  clientId: z.string(), // per-tab, for distinguishing multiple staff tabs
  joinedAt: z.number(), // epoch ms
});
```

`role` is the load-bearing field. Two things depend on it:

- **The status badge derives from patient presence only.** Without a role, a
  second staff tab joining would be indistinguishable from another patient
  connecting.
- **The snapshot fires on staff joins only** (see below), so a patient rejoining
  does not trigger a pointless re-broadcast.

---

## Events

All events flow **patient → staff**. The staff client subscribes and renders; it
never broadcasts. This is a deliberate constraint, not an accident of the current
feature set — keeping the staff view a pure observer is why the session reset
lives on the patient device (see [design-decisions.md](./design-decisions.md),
flow 5). Any future staff-originated event should be treated as a design change,
not an addition.

Payload types are defined with Zod in the same module as the form schema, and
the TypeScript types are derived with `z.infer`, so the contract in this document
and the contract in the code cannot drift apart silently.

### `field-change`

Sent as the patient edits, debounced ~250ms. **Never gated on validity** — the
staff view must stay live while the patient is still typing, so a half-typed
email broadcasts as-is.

```ts
{
  field: keyof IntakeForm,   // e.g. 'phone'
  value: string,
  at: number,                // epoch ms
}
```

One field per event. This gives the staff view the changed field name directly,
which is what the row highlight needs. **Debounce is keyed per field name**, so
tabbing quickly between two fields cannot drop the first one's update.

### `submit`

Sent once, on successful validation.

```ts
{
  values: IntakeForm,   // complete final values
  at: number,
}
```

The full values are sent rather than relying on the staff view having received
every prior `field-change`. The submitted snapshot is the only copy of the
record, so it should not depend on no message having been missed.

### `session-reset`

Sent when the patient taps **Start new intake**.

```ts
{
  at: number;
}
```

No payload beyond the timestamp. The patient leaves both channels. The list
row disappears. A staff member already on the detail route keeps the record
and sees "This intake has ended."

### `state-snapshot`

Sent by the patient when a **staff** client joins, so a staff member opening
`/staff/[sessionId]` mid-intake does not see an empty record over a
"Connected" badge. List Presence also carries filled `values` so the first
paint can seed from the list.

```ts
{
  values: Partial<IntakeForm>,   // only fields entered so far
  submitted: boolean,
  submittedAt: number | null,
  at: number,
}
```

`submitted` matters: a staff member who joins _after_ a submit must land on the
**Submitted** badge with frozen values, not **Connected**. Without this flag the
snapshot would be indistinguishable from an in-progress intake.

The first snapshot is sent as soon as staff is seen. Further snapshots are
ignored for ~500ms, so several staff tabs opening at once still produce one
payload.

---

## Derived state

Nothing about connection status is broadcast directly. The staff view computes
all of it, which keeps the number of event types small and avoids two sources of
truth for the same fact.

### "Filling in"

Derived from the timestamp of the last `field-change`, not from a separate typing
event. If that timestamp is within ~3s, the patient is filling in. This is why
there is no keystroke-level typing event: the debounced field broadcast already
carries the signal.

A `state-snapshot` must not set that timestamp. Begin intake sends a snapshot of
an empty form so a staff tab already open can go **Connected**; treating `at` as
a field change would flash **Filling in** before anyone has typed. Snapshot `at`
only updates the "last updated" clock.

Because it decays on a timer rather than an event, the staff view needs an
interval to re-evaluate it — otherwise the badge would sit on "Filling in" until
the next message happened to arrive.

### Badge resolution

Evaluated in order; the first match wins.

| Order | State        | Condition                                                 |
| ----- | ------------ | --------------------------------------------------------- |
| 1     | Submitted    | A `submit` has been received and no `session-reset` since |
| 2     | Disconnected | Patient presence was seen, and has since left             |
| 3     | Filling in   | Last `field-change` within ~3s                            |
| 4     | Connected    | Patient present, no recent change                         |
| 5     | Waiting      | No patient presence has ever been seen                    |

**Submitted is checked first** so that a patient closing their tab after
submitting does not flip the badge to Disconnected — the intake is complete, and
that is the fact staff care about.

**Waiting is last, and requires never having seen a patient.** Distinguishing it
from Disconnected is the whole reason both states exist: "Waiting" must not be
shown for a patient who was typing thirty seconds ago.

---

## Sequences

**Normal intake**

```text
patient joins            → staff badge: Waiting → Connected
patient types            → field-change (×n)     → Filling in, values populate
patient idles ~3s        → (no event)            → Connected
patient submits          → submit                → Submitted, values freeze
patient starts new       → session-reset         → leaves both channels
                                                 → list row gone
                                                 → open detail: ended banner
```

**Staff joins mid-intake**

```text
staff joins              → presence join (role: staff)
patient detects staff    → state-snapshot        → values populate at once
                                                   badge reflects submitted flag
```

**Patient refresh**

```text
patient leaves           → presence leave        → old list row gone
                                                 → open detail: ended banner
patient rejoins          → new sessionId         → new list row, empty form
```

The old row disappearing from the list is accepted rather than worked around:
patient-side persistence is an explicit non-goal.

---

## Observed behaviour

- **Channel setup.** `createClient` lives in `lib/supabase.ts`. The patient
  hook joins list + session while `active` (after Begin intake). Staff
  subscribe to the list always, and to one session when a row is open or
  prefetched. Broadcast is `{ self: false }` so a client never handles its
  own events.
- **Timings.** Kept at 250ms per-field debounce, 500ms snapshot debounce, and
  3s Filling-in decay after watching both views side by side.
- **Reconnection.** Any subscribe status other than `SUBSCRIBED` shows the
  staff "Reconnecting…" banner and dims the record to 75%. On resubscribe the
  staff client tracks Presence again; the patient join-detect sends a snapshot.
- **Presence leave.** Used as-is, no extra smoothing. Disconnected appears when
  Supabase reports the patient leave.
