# Design Decisions

This document records UI/UX decisions for different screen sizes, and the
interaction rules that follow from them. It is the spec to design and build
against.

## Product flow

There is no landing page. The deployed root URL is the patient form. Staff open
a separate route.

```text
Patient  →  /         fill form  →  submit  →  form locks, success banner
Staff    →  /staff    wait       →  watch live values  →  see Submitted
```

A slim header on both pages links Patient | Staff so a reviewer can switch
without editing the URL. The active route is visually marked.

After a successful submit the patient stays on `/`. The form becomes read-only
and a success banner appears at the top. Staff are still watching the same
session, so a redirect would break the demo.

## Screens and states

### Patient (`/`)

| State | What it looks like |
| ----- | ------------------ |
| Empty | All fields blank, submit enabled, no errors |
| Invalid submit | Errors under the failing fields; first error scrolled into view |
| In progress | Values filling; no errors until they have tried to submit |
| Submitted | Success banner; every field read-only; submit replaced by a “Submitted” label |

### Staff (`/staff`)

| State | Badge | Body |
| ----- | ----- | ---- |
| No patient yet | Waiting | Empty-state message, not a blank page |
| Connected, idle | Connected | Same three sections; empty fields show “Not provided yet” |
| Typing recently | Filling in | Values updating; last-changed field may briefly highlight |
| Submitted | Submitted | Values frozen as the final snapshot; badge stays Submitted |

The badge is a **single** status chip in the staff header. It replaces itself
rather than showing three indicators at once:

- **Waiting** — no patient presence in the channel (grey)
- **Connected** — patient is in the channel, but has not typed in the last few seconds (green)
- **Filling in** — a field change arrived within the last ~3 seconds (amber)
- **Submitted** — a submit event has been received; this state latches and does not decay (blue)

“Actively filling” is derived from the timestamp of the last `field-change`,
not a separate event. See [realtime-sync.md](./realtime-sync.md).

## Information architecture

Fields are grouped the way a person thinks about themselves, not as a flat list.

**1. Personal details**

- First name, middle name, last name
- Date of birth, gender
- Nationality, preferred language

**2. Contact information**

- Phone number, email
- Address
- Region (optional)

**3. Emergency contact** — labelled optional as a group

- Name, relationship

Middle name is treated as optional even though the brief does not mark it so:
many people do not have one, and making it required would be a product bug.

Required fields show a visible `*`. Optional fields show the word “Optional”
beside the label.

## Layout by breakpoint

Mobile-first. Content defines height; no `vh`-based page shells.

| Breakpoint | Width | Patient | Staff |
| ---------- | ----- | ------- | ----- |
| Default | < 768px | One column, full-width fields. Submit bar sticky at the bottom. | Header + badge stacked. Field rows stack: label above value. |
| `md` | ≥ 768px | Form card centred, max width ~720px. Short fields pair on a row (names; DOB + gender; phone + email; nationality + language; emergency name + relationship). Address stays full width. | Two-column field rows: label left, value right. |
| `lg` | ≥ 1024px | Same card, more horizontal padding. Header links sit in one row. | Content max-width ~960px so a line of value text does not stretch across the whole monitor. |

Emergency contact is a nested card with a quieter background so optional
content does not compete with required fields.

## Visual language

Clinic front desk, not a marketing site.

- **Colour** — one accent (deep teal or blue) for primary actions and focus
  rings. Status uses semantic colour: grey / green / amber / blue as above.
  Surfaces are off-white (`zinc-50`) with white cards and a light border.
- **Type** — Geist, already loaded by the Next.js scaffold. Body 16px, section
  titles slightly larger and semibold, labels 14px.
- **Spacing** — Tailwind’s 4px/8px scale only (`p-4`, `gap-6`, `mb-8`). No
  arbitrary pixel values.
- **Radius** — modest (`rounded-md` / `rounded-lg`), not pills, except the
  status badge.
- **Focus** — a visible ring on every interactive element. Keyboard users must
  be able to complete the form without a mouse.
- **One theme.** No dark mode.

## Interaction rules

- Validate on submit. After the first failed submit, also validate on change so
  the error clears as they fix it. Never block broadcasting because a field is
  invalid — the staff view must stay live while the patient is still editing.
- Native controls: `input`, `select`, `textarea`, `type="date"`. No custom
  date picker.
- Empty staff values render as muted “Not provided yet”, never as blank space.
- Do not send a keystroke-level “typing” event. Debounce field broadcasts
  (~250ms) so the staff view feels instant without jitter.

## Navigation

Both pages share a compact header:

- Left: product name, “Patient Intake”
- Right: text links to Patient (`/`) and Staff (`/staff`)

No hamburger, no footer nav, no extra routes. If `/patient` remains from the
spike, it should redirect to `/` so there is only one patient URL.

## Out of scope for the UI

- Multi-step wizard / stepper
- Staff dashboard, charts, or submission history
- Authentication screens
- Dark mode, language switcher, or settings
