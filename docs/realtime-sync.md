# Real-time Synchronisation

This document defines the real-time contract between the patient form and the
staff view: the channel, the Presence payload, the events, and the state each
side derives from them.

It is written **before** implementation, because both clients have to agree on
this contract and both are about to be built. Sections marked _deferred_ are
mechanics that are easier to describe accurately once the system has been
observed running, and will be filled in during implementation.

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

**One shared channel**, `intake-session`. The brief refers to "the patient form"
in the singular, so both interfaces join the same channel and there is exactly
one live intake at a time.

Per-session channels (`intake-session:{id}`) would support multiple concurrent
patients and are treated as an enhancement, not a core requirement. The channel
name is defined in one place so that change stays cheap.

**Clients do not receive their own broadcasts.** The patient must not react to
its own `field-change` events, and this is also what keeps the staff-join
detection below from firing on the patient's own join.

---

## Presence

Every client tracks a Presence payload on subscribe:

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

Sent when the patient confirms **Start new intake**.

```ts
{
  at: number;
}
```

No payload beyond the timestamp — the staff view un-latches its badge and moves
the current values to "Previous submission" (see flow 5).

### `state-snapshot`

Sent by the patient when a **staff** client joins, so a staff member opening
`/staff` mid-intake does not see an empty record over a "Connected" badge.

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

Debounced ~500ms, so several staff tabs opening at once produce one snapshot
rather than one each.

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
patient starts new       → session-reset         → Connected, values move to
                                                   "Previous submission"
patient types            → field-change          → previous submission clears
```

**Staff joins mid-intake**

```text
staff joins              → presence join (role: staff)
patient detects staff    → state-snapshot        → values populate at once
                                                   badge reflects submitted flag
```

**Patient refresh**

```text
patient leaves           → presence leave        → Disconnected, values retained
patient rejoins          → presence join         → Connected
                         → field-change (empty)  → values clear as re-entered
```

Values visibly clearing here is accepted rather than worked around: patient-side
persistence is an explicit non-goal.

---

## Deferred until implementation

To be completed once the system has been observed running:

- **Channel setup** — `createClient` configuration, subscribe lifecycle, and
  cleanup on unmount.
- **Final timings.** The ~250ms debounce, ~3s decay and ~500ms snapshot debounce
  are starting points chosen for feel, not measurements. They will be tuned with
  both views open side by side, and this document updated to match.
- **Reconnection behaviour.** Supabase reconnects automatically, but the exact
  sequence of channel state callbacks — and therefore when the "Reconnecting…"
  banner appears and clears — is easier to document after watching a real
  disconnect.
- **Presence leave latency.** How long Supabase takes to report a leave affects
  how quickly the Disconnected badge appears; worth measuring before deciding
  whether it needs smoothing.
