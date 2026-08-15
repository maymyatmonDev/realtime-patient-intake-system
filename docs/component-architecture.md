# Component Architecture

How the two views are composed, and who owns which piece of state.

The UI spec is [design-decisions.md](./design-decisions.md); the event contract
is [realtime-sync.md](./realtime-sync.md). This document maps those onto
components. It does not override either.

---

## Patient tree (`/`)

```text
app/page.tsx                        server — exports metadata, nothing else
└── PatientIntake                   "use client"
    │                               owns: useForm, submitted, usePatientSync
    ├── AppHeader variant="patient"
    ├── (intro: h1 · lead)
    ├── (success banner + reset)    when submitted — reset stays outside the form
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
```

Four files, not ten. A section heading is a few classes — it does not earn its
own module. The three native controls share one `FormField` so label, required
`*`, error text and `aria-*` stay in one place. Submit and reset share `IntakeActions`
because they are the two session actions, even though they sit in different
places on the page.

`IntakeForm` still writes its own JSX for the grid — three-across names, paired
short fields, full-width address — rather than generating the layout from a
config. The shared piece is the control, not the page.

## Staff tree (`/staff`)

```text
app/staff/layout.tsx                StaffWorkspace — list + session sockets
app/staff/page.tsx                  staff list
└── StaffList
    └── row → /staff/[sessionId]
app/staff/[sessionId]/page.tsx
└── StaffLiveView
    ├── AppHeader  back + display name + StatusBadge
    ├── (ended banner)              session gone; record stays
    └── PatientRecord               reused as-is
            └── section ×3 → RecordRow ×13
```

Waiting lives on the staff list. The record view is reused on the detail
route. `RecordRow` stays a file because the highlight keys off `updatedAt`,
not the field name, so editing the same field twice still re-triggers the tint.

---

## State ownership

Each piece of state lives in exactly one place. There is no shared store,
because nothing has to cross between the two client roots.

| State                            | Owner            | Notes                                            |
| -------------------------------- | ---------------- | ------------------------------------------------ |
| Field values being typed         | React Hook Form  | Uncontrolled inputs; `PatientIntake` holds it    |
| Validation errors                | React Hook Form  | From the Zod resolver                            |
| `submitted` / `submittedAt`      | `PatientIntake`  | Drives banner, `readOnly`, reset visibility      |
| Reset click                      | `IntakeActions`  | Calls `onReset` — no extra confirm step          |
| Channel + per-field debouncers   | `usePatientSync` | Refs, so re-renders never re-subscribe           |
| Received values + per-field time | `useStaffSync`   | `Partial<IntakeForm>` plus a timestamp per field |
| Badge state                      | `useStaffSync` / `useStaffList` | Derived every tick via `resolveBadgeState()` |
| Staff list                       | `useStaffList`   | Presence only; `ready` after first sync          |
| Row highlight                    | `RecordRow`      | Local state keyed on `updatedAt`                 |

`useForm` lives in `PatientIntake` rather than in `IntakeForm` for one concrete
reason: a `session-reset` has to call `form.reset()`, and the reset button sits
**outside** the form (under the success banner). Whoever owns the form instance must
sit above both. Fields then reach it with `useFormContext()` instead of having
`register` threaded through four levels.

The row highlight is local to `RecordRow`, and keyed on a **timestamp** rather
than on "which field changed last". Editing the same field twice in a row
produces the same field name, so a name would not re-trigger the tint; a new
timestamp always does.

Event sequences (type, submit, late join, reset, refresh) live in
[realtime-sync.md](./realtime-sync.md).

---

## Shared modules

**`lib/intake-schema.ts`** — the form schema, the four event payloads, and the
list Presence payload in one file, with every type produced by `z.infer`.
Keeping the payloads beside the form schema is what makes it impossible for
the contract in
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

Both views read their labels and ordering from here, so "check the date of
birth" points at the same place on both screens by construction. The patient
form still writes its own JSX, so the three-across names, the paired short
fields and the full-width address stay explicit.

**`lib/badge-state.ts`** — `resolveBadgeState(facts, now)`, the five ordered
rules from [realtime-sync.md](./realtime-sync.md) as a pure function. Order is
the whole point (Submitted outranks Disconnected; Waiting requires never having
seen a patient), and rules that matter in a specific order are far easier to
read as one list than as conditionals spread through a component.

