# Component Architecture

How the two views are composed, who owns which piece of state, and how a
keystroke reaches the other screen.

The UI spec is [design-decisions.md](./design-decisions.md); the event contract
is [realtime-sync.md](./realtime-sync.md). This document is the layer between
them: it maps those decisions onto components, and nothing here overrides
either.

---

## Patient tree (`/`)

```text
app/page.tsx                        server — exports metadata, nothing else
└── PatientIntake                   "use client"
    │                               owns: useForm, submitted, usePatientSync
    ├── AppHeader variant="patient"
    ├── (intro: h1 · lead · "All fields required unless marked optional")
    ├── (success banner)            when submitted — inline, one surface
    ├── IntakeForm                  reads the form via useFormContext
    │   ├── section "Personal details"
    │   │   ├── FormField   firstName · middleName · lastName
    │   │   ├── FormField   dateOfBirth        type="date", max=today
    │   │   ├── FormField   gender             as="select"
    │   │   └── FormField   nationality · preferredLanguage
    │   ├── section "Contact information"
    │   │   ├── FormField   phone · email
    │   │   ├── FormField   address            as="textarea"
    │   │   └── FormField   region
    │   ├── section "Emergency contact"    nested quiet card
    │   │   └── FormField   emergencyName · emergencyRelationship
    │   └── (submit)                inside the <form> — from IntakeActions
    └── (reset)                     outside the form — from IntakeActions
```

Four files, not ten. A section heading is a few classes — it does not earn its
own module. The three native controls share one `FormField` so label, "Optional",
error text and `aria-*` stay in one place. Submit and the two-tap reset are one
region in the design (the end of the form), so they share `IntakeActions`.

`IntakeForm` still writes its own JSX for the grid — three-across names, paired
short fields, full-width address — rather than generating the layout from a
config. The shared piece is the control, not the page.

## Staff tree (`/staff`)

```text
app/staff/page.tsx                  server — exports metadata, nothing else
└── StaffLiveView                   "use client"
    │                               owns: useStaffSync
    ├── AppHeader variant="staff"
    │   └── right: StatusBadge      badge + "updated 4s ago" / "Submitted at"
    ├── (reconnecting strip)        when the staff socket is down
    └── body — one of:
        ├── (waiting)               badge = Waiting — centred invitation
        └── PatientRecord           every other badge state
            │                       + one-line note when Disconnected
            ├── section ×3 → RecordRow ×13
            └── PreviousSubmission  after a session-reset
```

Five files, not nine. Waiting and the reconnecting strip are page chrome —
a heading, or an amber bar — so they live in `StaffLiveView`. A record section
is a heading plus rows, same as a form section: markup inside `PatientRecord`,
not a module. The timestamp always sits next to the badge, so it lives in
`StatusBadge`.

`RecordRow` stays a file because the highlight is real local state: it keys
off `updatedAt`, not the field name, so editing the same field twice still
re-triggers the tint.

`PreviousSubmission` stays a file because flow 5 separates live and previous
five ways. Sharing `PatientRecord` or `RecordRow` would pull those lists back
together.

The staff body is still a single choice between two things, because
[design-decisions.md](./design-decisions.md) makes the body — not the chip — the
signal that separates Waiting from Disconnected: Waiting shows no field list at
all, Disconnected shows the full retained record.

---

## State ownership

Each piece of state lives in exactly one place. There is no shared store,
because nothing has to cross between the two client roots.

| State                            | Owner            | Notes                                            |
| -------------------------------- | ---------------- | ------------------------------------------------ |
| Field values being typed         | React Hook Form  | Uncontrolled inputs; `PatientIntake` holds it    |
| Validation errors                | React Hook Form  | From the Zod resolver                            |
| `submitted` / `submittedAt`      | `PatientIntake`  | Drives banner, `readOnly`, reset visibility      |
| "Confirm?" armed                 | `IntakeActions`  | Local, self-reverting — nobody else needs it     |
| Channel + per-field debouncers   | `usePatientSync` | Refs, so re-renders never re-subscribe           |
| Received values + per-field time | `useStaffSync`   | `Partial<IntakeForm>` plus a timestamp per field |
| Badge state                      | `useStaffSync`   | Derived every tick via `resolveBadgeState()`     |
| Row highlight                    | `RecordRow`      | Local effect on its own `updatedAt` prop         |

`useForm` lives in `PatientIntake` rather than in `IntakeForm` for one concrete
reason: a `session-reset` has to call `form.reset()`, and the reset button sits
**outside** the form (below it, per flow 5). Whoever owns the form instance must
sit above both. Fields then reach it with `useFormContext()` instead of having
`register` threaded through four levels.

The row highlight is local to `RecordRow`, and keyed on a **timestamp** rather
than on "which field changed last". Editing the same field twice in a row
produces the same field name, so a name would not re-trigger the tint; a new
timestamp always does.

---

## Flow 1 — patient types

```text
onChange
   │
   ├─► React Hook Form                        stores the value, no re-render
   │
   └─► usePatientSync.sendFieldChange(field, value)
            │  debounce ~250ms, keyed per field name
            ▼
       channel.send  field-change { field, value, at }
            │
            ▼  Supabase Realtime
       useStaffSync
            ├─ values[field] = value
            ├─ fieldUpdatedAt[field] = at
            └─ lastChangeAt = at
            ▼
       RecordRow  new value, tint fades ~1s      StatusBadge  Filling in
```

Never gated on validity — the staff view stays live while the patient is still
mid-word. Debouncing per field name is what stops a fast tab from dropping the
field just left behind.

## Flow 2 — patient submits

```text
IntakeActions (submit)
   │  handleSubmit → Zod (incl. emergency-contact superRefine)
   ├─ invalid ─► focus first failing field, aria-invalid, error text
   └─ valid   ─► sendSubmit(values) ─► submit { values, at }
                     │                        │
                     ▼                        ▼
              PatientIntake            useStaffSync
              submitted = true         submittedAt = at
              banner, readOnly,        values frozen
              reset visible            badge latches Submitted
                                       timestamp → "Submitted at 14:32"
                                       empty fields → "Not provided"
```

The full values ride along with `submit` rather than relying on staff having
received every prior `field-change`. The snapshot is the only copy of the
record, so it must not depend on nothing having been missed.

## Flow 3 — staff joins mid-intake

```text
StaffLiveView mounts
   └─► presence.track({ role: "staff", … })
             │
             ▼
       usePatientSync sees a presence join with role "staff"
             │  debounce ~500ms — three tabs at once send one payload
             ▼
       getSnapshot()  ← supplied by PatientIntake: getValues() + submitted
             │
             ▼
       state-snapshot { values, submitted, submittedAt, at }
             │
             ▼
       useStaffSync  fills every field at once, badge honours `submitted`
```

`getSnapshot` is passed **into** the hook as a callback and held in a ref. The
hook needs the current values at an unpredictable moment, and a ref means new
values never cause a re-subscribe.

## Flow 4 — start a new intake

```text
IntakeActions   tap 1 → "Confirm?"  (reverts after a few seconds)
                tap 2 → sendSessionReset()
                          │                    │
                          ▼                    ▼
                   PatientIntake         useStaffSync
                   form.reset()          previousSubmission = current values
                   submitted = false     live values cleared
                   banner: "Ready for    badge un-latches
                   the next patient"
                                              ▼
                                        PreviousSubmission renders
                                        next field-change clears it
```

Reset lives on the patient device. Staff never sends, so `useStaffSync` has no
`send` in its return type at all — the constraint is enforced by the API shape,
not by convention.

---

## Hook contracts

```ts
// hooks/usePatientSync.ts
function usePatientSync(opts: {
  getSnapshot: () => StateSnapshotPayload;
}): {
  connection: "connected" | "reconnecting";
  sendFieldChange: (field: FieldName, value: string) => void;
  sendSubmit: (values: IntakeForm) => void;
  sendSessionReset: () => void;
};

// hooks/useStaffSync.ts  — receive only, by design
function useStaffSync(): {
  connection: "connected" | "reconnecting";
  badge: BadgeState;
  values: Partial<IntakeForm>;
  fieldUpdatedAt: Partial<Record<FieldName, number>>;
  lastUpdatedAt: number | null;
  submittedAt: number | null;
  previousSubmission: { values: IntakeForm; submittedAt: number } | null;
};
```

`useStaffSync` runs a 1s interval so the badge can decay from **Filling in** to
**Connected** on its own. Without it the badge would sit on "Filling in" until
the next message happened to arrive — it decays on a timer, not on an event.

**The two hooks deliberately do not share a base hook.** Supabase requires every
`.on()` listener to be registered before `.subscribe()`, so a shared base would
have to take listener-injection callbacks — more indirection than the ~15 lines
of channel setup it would save. Two hooks that each read straight down are
easier to follow and easier to debug.

---

## Shared modules

**`lib/intake-schema.ts`** — the form schema and all four event payload schemas
in one file, with every type produced by `z.infer`. Keeping the payloads beside
the form schema is what makes it impossible for the contract in
[realtime-sync.md](./realtime-sync.md) and the contract in the code to drift
apart silently.

**`lib/intake-fields.ts`** — `FIELD_LABELS` (one label per field name),
`SECTIONS` (section title plus its field names in order), and `GENDER_OPTIONS`.
Gender is the only closed set in the form; nationality and preferred language
are free text in the design frames, so they stay plain inputs.

Both views read their labels and ordering from here, and field components look
their own label up by `name`:

```tsx
<FormField name="firstName" />           // label comes from FIELD_LABELS
```

That is not shortening for its own sake. Flow 3 makes the mirroring load-bearing
— "check the date of birth" has to point at the same place on both screens — and
a shared registry makes that true by construction instead of by remembering to
edit two files. The patient form still writes its own JSX, so the three-across
names, the paired short fields and the full-width address stay explicit.

**`lib/badge-state.ts`** — `resolveBadgeState(facts, now)`, the five ordered
rules from [realtime-sync.md](./realtime-sync.md) as a pure function. Order is
the whole point (Submitted outranks Disconnected; Waiting requires never having
seen a patient), and rules that matter in a specific order are far easier to
read as one list than as conditionals spread through a component.

---

## Two things worth naming

**`AppHeader` takes a slot, not staff props.** Its type is a discriminated
union:

```ts
type AppHeaderProps =
  | { variant: "patient" }
  | { variant: "staff"; right: ReactNode };
```

The patient variant needs nothing — its right side is a static "New intake"
chip. The staff variant is handed its badge and timestamp by `StaffLiveView`.
This keeps the shared header free of any import from `components/staff/`, so the
dependency direction in [project-structure.md](./project-structure.md) holds.

**`PreviousSubmission` does not reuse `PatientRecord` or `RecordRow`.** It
would have been one component with a `variant` prop, and that is the wrong
instinct here: flow 5 calls two stacked field lists the easiest hierarchy in
this project to get wrong, and separates them five ways. A shared component
pulls them back toward each other with every future edit. The previous block
is also genuinely simpler — no highlight, no "Not provided yet", no live
state — so the duplication is smaller than the variant branching it replaces.
