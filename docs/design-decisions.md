# Design Decisions

This document records the UI/UX decisions for the real-time patient intake
system, and the interaction rules that follow from them. It is the spec to
design and build against.

Decisions are grouped into five flows, in the order they were worked through —
each one constrains the next:

1. **Entry and navigation** — how each person arrives, and whether the two views
   cross-link
2. **Patient form** — filling, validation timing, submit
3. **Staff live view** — what is on screen and how it updates
4. **Connection edges** — late join, disconnect, refresh
5. **After submit** — what the session does next

Layout, visual language and out-of-scope items follow at the end, since they
apply across all five.

---

## 1. Entry and navigation

There is no extra landing URL. `/` is still the patient page. The form is
hidden until they tap **Begin intake**, and the patient does not join the
channel until that tap. Staff stay on **Waiting** while the tablet is only
showing the intro.

```text
Patient  →  /   Begin intake  →  fill form  →  submit  →  Start new intake
Staff    →  /staff   Waiting  →  live values  →  Submitted  →  Waiting
```

**No cross-links between the two views.** A "Staff" link on a patient-facing
intake form would be a product bug: a patient handed a tablet should have no
route into the monitoring view. The README states that the staff view lives at
`/staff` and that both should be opened in separate windows to exercise the
live sync — which serves a reviewer just as well as a switcher would, since
the two views are meant to be watched simultaneously rather than navigated
between.

`/patient`, if it remains from the spike, redirects to `/` so there is exactly
one canonical patient URL.

**Header.** Both routes share **one component with a `variant` prop**
(`patient` | `staff`), not two similar headers. The distinction between the two
views then lives in one file, which is what makes it cheap to change later.

The strip itself is identical on both routes — the same brand tint, the same
accent mark. Three things differ:

|            | Patient (`/`)                    | Staff (`/staff`)         |
| ---------- | -------------------------------- | ------------------------ |
| Title      | Patient Intake                   | Front Desk — Live View   |
| Right side | "Visible to the front desk" text | Status badge + timestamp |
| Tab title  | Patient Intake                   | Front Desk — Live View   |

The patient right side is **plain text**, not a chip. A pill that said "New
intake" read as a start button, next to **Begin intake** and **Start new
intake**. The caption is not tappable, and it restates the live-sync disclosure
in the chrome so it is visible before the form copy.

A tinted staff-only strip and a dark staff-only strip were both tried and
rejected — the dark one read as a floating slab against the off-white page, and
the tint sat too close to the status badge hues.

**If the two are ever confused in real use, enlarge the staff title rather than
re-tinting the strip.** That keeps the fix to one property on one component and
avoids reopening the colour question.

No nav links, no hamburger, no footer, and no link from the patient view to the
staff route.

---

## 2. Patient form (`/`)

### Intro block

The form does not open straight into fields. The begin screen is centered and
does not say “below”, because the fields are not on screen yet:

```text
H1        New patient intake
Lead      When you are ready, start the form. It takes about two minutes.
          Front desk staff will see your answers as you type, in case you
          need help.
Button    Begin intake
```

Once they begin, the form intro uses “complete your details below”. Required
fields are marked with a red asterisk.

The lead paragraph does three jobs at once: it sets a time expectation, it
explains _why_ the live sync exists, and it discloses that staff can see the
answers being typed.

**That disclosure must appear above the form, not below it.** An earlier version
carried it as a footnote under the submit button, where a patient would only
read it after entering everything. It is consent-adjacent copy, so it belongs
before the first field.

**Begin intake.** The fields stay hidden until this tap. That is also when the
patient client joins the channel. Opening `/` alone does not count as
Connected. **Start new intake** returns to this step and leaves the channel.

### Structure

**Single scrolling page, no stepper.** Thirteen fields across three sections is
short enough that a multi-step wizard adds ceremony without reducing effort.
A stepper would also weaken the demo, since staff could only ever see the
fields the patient had reached. Three section headings, unnumbered — numbering
implies sequential steps.

Fields are grouped the way a person thinks about themselves, not as a flat
list:

**Personal details**

- First name, middle name (optional), last name
- Date of birth, gender
- Nationality, preferred language

**Contact information**

- Phone number, email
- Address
- Region (optional)

**Emergency contact** — labelled optional as a group

- Name, relationship

Middle name is optional even though the brief does not mark it so: many people
do not have one, and requiring it would be a product bug.

Emergency contact is a nested card with a quieter background, so optional
content does not compete with required fields.

**Two surfaces, not three.** The page card and — on the patient form only — the
one nested emergency-contact card. An earlier version wrapped each of the three
sections in its own bordered card, which made the emergency card read as the
third layer of the same treatment rather than as something quieter. Sections are
separated by a heading and vertical space, never by another box.

### Required and optional marking

**Mark what is required, with a star.** A red `*` sits on each required label.
That is the pattern patients already know from other forms, so it does not need
a line of instructions above the fields. Optional fields (middle name, region,
and the emergency pair) have no star. The emergency section heading still says
"Optional", because the whole group can be skipped.

### Validation

**Validate on submit, then on change.** Validating on blur punishes a patient
for tabbing out of a field they intend to return to. After the first failed
submit, the failing fields switch to validating on change so errors clear as
they are fixed. In React Hook Form this is configuration rather than code:
`mode: 'onSubmit'` with `reValidateMode: 'onChange'`.

**Never disable the submit button.** A greyed-out button that will not explain
itself leaves the patient guessing at what is missing. Submit stays enabled;
pressing it with errors moves keyboard focus — not just scroll — to the first
failing field. Focus does double duty: it brings the field into view and causes
screen readers to announce the error. Each field carries `aria-invalid` and an
`aria-describedby` pointing at its error text.

The one exception is the moment the submit is in flight: the button takes a
lighter accent fill and the label "Submitting…", and stops accepting taps. No
spinner — the broadcast resolves in well under a second, so a spinner would
flash rather than inform.

**Emergency contact is conditionally required.** The group is optional, but a
record with a name and no relationship is half-finished. If either field has a
value, the other becomes required. Zod handles this in a `superRefine`, with
the error attached to whichever field is empty.

### Controls and layout

Native controls throughout: `input`, `select`, `textarea`, `type="date"`. No
custom date picker. The date input sets `max` to today, so a future date of
birth is not reachable.

**Phone** is `type="tel"`, digits only (optional leading `+`), 8–15 characters.
Spaces and dots are stripped as the patient types. Unlike the other fields,
phone validates on change so a bad format shows immediately.

**No autofocus** on the first field — it opens the mobile keyboard immediately
and hides the structure of the form before the patient has seen it.

**No sticky submit bar on mobile.** With the keyboard open, a sticky bottom bar
either gets covered or competes with it for space, and it costs vertical room on
every field. Submit sits at the natural end of the form, full width on mobile.

### Broadcasting

Field changes broadcast on change, debounced ~250ms, and are **never** gated on
validity. The staff view must stay live while the patient is still editing — a
half-typed email should appear as it is typed. There is no keystroke-level
"typing" event; the debounced field broadcast is the only signal.

---

## 3. Staff live view (`/staff`)

### A document, not a feed

The staff view is a record that fills in, not a log of changes. A feed would
force staff to reconstruct current state from history; staff want to know what
this patient's record looks like _right now_.

It therefore mirrors the patient form exactly — same three sections, same field
order, same labels. That mirroring is load-bearing: when a staff member says
"check the date of birth", both people are looking at the same place on the
page.

### Field rendering

Empty fields never render as blank space — a blank row is ambiguous, since staff
cannot tell whether the patient skipped it or the sync broke. The wording depends
on whether more input is still expected:

| Badge state             | Empty field reads  |
| ----------------------- | ------------------ |
| Connected, Filling in   | "Not provided yet" |
| Submitted, Disconnected | "Not provided"     |

**"Yet" belongs to live states only.** It is a promise that more may arrive, so
it is wrong once the intake is submitted _or_ once the patient has gone. An
earlier version kept "yet" on Disconnected, which implied a patient who had
already left was still filling things in.

**No validation state, ever.** If the email currently reads `mary@gm`, that is
simply what it says. Red states on the staff side would be alarming and
meaningless while the patient is mid-word.

**Row structure without borders.** The staff record has no input boxes, so it
loses the structure the patient form gets for free. Hairline dividers between
field rows carry it instead. This is a structural fix, not a decorative one —
tinting or striping rows would compete with the change highlight below.

**Change highlight.** When a value updates, its row background tints briefly and
fades over ~1 second. With thirteen fields, staff would not otherwise notice
which one moved. Two guardrails: the value text itself never animates —
sliding or jumping text hurts legibility, which is the whole point — and the
fade respects `prefers-reduced-motion`, under which the value simply changes.

**Last updated.** A relative timestamp near the badge ("updated just now", then
"updated 1m ago"). Minutes, not a per-second count — a ticking second counter
reads as a stopwatch, and **Filling in** already covers "they are typing now".
Without the timestamp, a frozen screen is indistinguishable from an idle
patient — which becomes important for the disconnect cases below.

### Status badge

A **single** status chip in the staff header. It replaces itself rather than
showing several indicators at once.

| State        | Colour | Meaning                                               |
| ------------ | ------ | ----------------------------------------------------- |
| Waiting      | grey   | No patient has joined this session                    |
| Connected    | green  | Patient present, no field change in ~3s               |
| Filling in   | amber  | A field change arrived within the last ~3s            |
| Submitted    | blue   | A submit event was received — latches, does not decay |
| Disconnected | grey   | Patient was present and has left                      |

"Filling in" is derived from the timestamp of the last `field-change`, not from a
separate event. See [realtime-sync.md](./realtime-sync.md).

**Submitted outranks everything.** Once a submit has been received, a patient
closing their tab must not flip the badge to Disconnected — the intake is
complete, and that is the fact staff care about.

**Waiting and Disconnected are separated three ways, not by colour.** They share
the same grey family, and grey-against-grey at chip size is exactly the
comparison a glance fails at. So the badge is the label and the body is the
signal:

|      | Waiting                                            | Disconnected                                                                   |
| ---- | -------------------------------------------------- | ------------------------------------------------------------------------------ |
| Body | No field list at all — only the centred invitation | A full retained record                                                         |
| Dot  | Solid                                              | Hollow ring — something was there and has gone out                             |
| Note | None                                               | One line above the record: "Patient disconnected — showing last known values." |

The body difference is the one a staff member reads from across the desk, before
resolving any chip.

### Empty state

Before any patient connects, the content area shows a centred message —
"Waiting for a patient to begin" — with a smaller line noting that the patient
form is at the root URL. Never a blank page, and it quietly orients a reviewer
who has opened the wrong window first.

### Accessibility

The status badge sits in an `aria-live="polite"` region so its transitions are
announced. Field values do **not** — thirteen fields updating on a debounce
would produce constant interruption. The badge is the signal; the fields are
reference.

---

## 4. Connection edges

Broadcast messages are ephemeral and nothing is persisted server-side. These
four cases are where that shows.

### Staff joins after the patient has started

Earlier field changes are gone, so without a fix staff would see "Connected"
over a screen of "Not provided yet" while the patient is visibly half-done.

When the patient client detects a **staff member joining** via Presence, it
re-broadcasts its full current form state once. Presence already reports the
arrival, so no request/response handshake and no polling interval is needed.
The snapshot is debounced ~500ms, so opening three staff tabs at once sends one
payload rather than three.

**Presence carries a role.** Every client tracks `{ role: 'patient' | 'staff' }`
in its Presence payload. The badge derives from patient presence only, so
additional staff tabs are never misread as another patient connecting.

### Patient disconnects mid-form

Presence fires a leave event. The badge goes to **Disconnected** — a distinct
state from Waiting, because "Waiting" reads as _nobody has started_ when in fact
someone was typing thirty seconds ago.

**Last known values stay on screen.** Wiping them would destroy information
staff may still need: if the patient walked off with the device, the front desk
still wants the name and phone number already given. The "updated 1m ago"
timestamp now carries real weight, telling staff how stale the view is.

### Patient refreshes

This is a leave immediately followed by a join, and the form returns empty since
nothing is persisted. It is handled as exactly that: badge goes Disconnected,
then Connected, and the fresh empty state broadcasts over the old values.

Values visibly disappearing looks like a bug, and is accepted rather than
engineered around — patient-side persistence is an explicit non-goal. The README
notes it as a known consequence of that decision.

### Staff loses connection

The Supabase client reconnects on its own, but the gap must be visible or staff
will trust a stale screen. On channel disconnect, a thin amber "Reconnecting…"
banner appears across the top of the staff content and the field values dim to
about 75%. On resubscribe, the patient's Presence join-detection fires again and
re-sends a snapshot, so recovery needs no additional machinery.

**The dimming has a floor.** Enough to read as unconfirmed, never enough to drop
the values below 4.5:1 — the front desk may still need that phone number while
the socket is down.

**Two different failures get two different notices**, and they must not be
conflated:

|            | Reconnecting         | Disconnected                     |
| ---------- | -------------------- | -------------------------------- |
| What broke | The staff socket     | The patient left                 |
| Colour     | Amber                | Zinc                             |
| Values     | Dimmed — unconfirmed | Full strength — still the record |

---

## 5. After submit

Submit is the middle of the real workflow, not the end of it: patient submits →
hands the device back → staff reads the record → the desk prepares for the next
person. The design supports that loop.

### Patient

1. Submit passes validation and broadcasts `submit`.
2. The intro is replaced by a success card: check, _"Details submitted"_,
   _"Please return the device to the front desk"_, and a **Start new intake**
   button sized to its label (not full width — that overpowered the message).
   After submit the page scrolls to this card.
3. **The form stays visible**, every field `readOnly` on a muted surface. Hiding
   it would leave a patient who spots a wrong phone number with nothing to point
   at. `readOnly` rather than `disabled`: disabled fields are skipped by keyboard
   navigation and read poorly to screen readers, so the patient could no longer
   review what they sent. Gender is a `<select>`, which has no `readOnly`, so
   after submit it becomes a read-only text input showing the chosen label —
   same muted surface, still in the tab order.
4. The submit button is replaced by a plain "Submitted" label.
5. **Start new intake** lives on the success card, not under the form. The
   locked form stays below for review.

**Reset lives on the patient device, not the staff view.** Two reasons. Every
event in this system flows patient → staff; staff is a pure observer that
subscribes and renders. A staff-initiated reset would introduce the only
staff → patient event in the design, requiring send capability on the staff
client and inbound handling on the patient client. And in practice the tablet
sits on the desk between intakes, so whoever taps the button is almost always
the staff member handing it to the next person — the control belongs to the
device, not to a job title.

One tap on **Start new intake** broadcasts `session-reset`, leaves the channel,
and returns to the begin screen. A two-tap confirm was tried and dropped — it
added a step without preventing real mistakes, and the staff view still keeps
the previous submission.

### Staff

1. `submit` received → values freeze as the final snapshot, the badge latches to
   **Submitted**, and the relative timestamp switches to a fixed "Submitted at
   14:32". Relative time is useful for liveness and meaningless once nothing
   changes.
2. Empty optional fields switch to "Not provided".
3. `session-reset` received → the badge returns to **Waiting** (the patient
   has left the channel and is back on the begin screen), but **the values stay
   on screen** under a quiet "Previous submission" label. Nothing is persisted,
   so this snapshot is the only copy of the record — it should survive a reset
   until something genuinely supersedes it, and an accidental tap costs staff
   nothing.
4. The first `field-change` of the new intake clears the previous submission and
   the live view resumes.

**Live and previous must be unmistakable**, since two stacked field lists is the
easiest hierarchy in this project to get wrong. Five separations, not one:

- **Surface** — live is a white card with the accent top rule; previous is a
  sunken grey with no rule. Only the live record gets the accent.
- **Headings** — live sections are section-sized and semibold with an accent dot;
  previous sections are caption-sized muted text with no dot.
- **Values** — live at body size in near-black; previous one step down in size
  and weight. A step down, not a fade: it is still the only copy of the record.
- **Order** — always below the live record, behind a rule.
- **Caption** — states its submit time _and_ its expiry condition, so staff know
  it disappears on the next keystroke rather than wondering.

The "Previous submission" label sits **outside** that block, not inside it. A
heading within a container reads as a section of the record; above it, it reads
as a status for the whole block.

---

## Layout by breakpoint

Mobile-first. Content defines height; no `vh`-based page shells.

| Breakpoint | Width    | Patient                                                                                                                                                                                                                         | Staff                                                                                                                                                                                                                                                               |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default    | < 768px  | One column, full-width fields. Submit at the end of the form.                                                                                                                                                                   | Header stacks into two rows, title above status, both left-aligned to the same edge. Field rows stack: label above value.                                                                                                                                           |
| `md`       | ≥ 768px  | Form card centred, max width ~720px. **Names three-across** — first, middle, last in one row. Other short fields pair (DOB + gender; phone + email; nationality + language; emergency name + relationship). Address full width. | Header in one row. Two-column rows, label left at a **fixed width** so every value starts at the same x-position — a ragged left edge is much harder to scan down. The timestamp slot has a fixed min-width so the badge does not shift as the text changes length. |
| `lg`       | ≥ 1024px | Same card, more horizontal padding.                                                                                                                                                                                             | Content max-width ~960px, so a line of value text does not stretch across a full monitor.                                                                                                                                                                           |

**Names go three-across, not paired.** Pairing first + middle left the last name
orphaned with an empty gap beside it, which reads as unfinished rather than
restrained. All three are short fields and form a natural group.

---

## Visual language

Clinic front desk, not a marketing site. The resolved tokens live in the design
system document; this section records the rules behind them.

- **One accent hue, split by job.** Not by taste. A bright stop is the primary
  button fill only, a dark stop carries the header mark, card top rule, section
  dots and focus rings, and two pale stops carry the header strip and the success
  banner. Only **one** bright-accent element appears per screen, which is why the
  submit button needs no extra size or weight to be found.
- **Status hue is the one place colour carries meaning** rather than role: grey /
  green / amber / blue, on the staff view only. Never on the patient view.
- **Accent and status hue must not collide.** The accent sits in the same family
  as the "Connected" green, so the Connected chip takes a white fill with a
  coloured border and dot rather than a pale green fill — a pale fill on the pale
  header strip had almost no separation. Check any accent change against all four
  status hues before adopting it.
- **Surfaces** — off-white page, white cards, a sunken grey for the previous
  submission and read-only fields. Two surfaces per screen, not three.
- **Type** — Geist, already loaded by the Next.js scaffold. Five roles, three
  weights (400 / 500 / 600), one family. Body and every record value 16px —
  inputs must never go below 16px, since smaller text triggers zoom on iOS.
  Section titles larger and semibold, labels 14px, captions 13px. No italics.
- **Text contrast floor.** `zinc-400` is unused for text at 2.6:1 on white. Any
  text that carries meaning — including the emergency "Optional" heading and
  the required `*` — sits at `zinc-500` or darker. The star is `red-700`.
- **Spacing** — Tailwind's 4px/8px scale only. The contrast that matters is
  16px between fields against 40px before a section heading; that ratio is what
  makes the form scan as three chunks rather than one long list.
- **Radius** — `rounded-md` on controls, buttons and nested cards; `rounded-xl`
  on page cards. Pills only for the staff status chip.
- **Focus** — a visible ring on every interactive element. Keyboard users must
  be able to complete the form without a mouse.
- **Motion** — the staff row change tint only, ~1s, behind
  `prefers-reduced-motion`. No spinners, no transitions on value text.
- **One theme.** No dark mode.

---

## Open questions

Deliberately unresolved, to be settled during implementation rather than guessed
at now:

- **Header distinction.** Both views currently share one strip, separated only by
  title and by the kind of element on the right. This is accepted for now. If the
  two windows prove confusable in real side-by-side use, **enlarge the staff
  title** rather than re-tinting the strip — a tinted and a dark staff header
  were both tried and rejected.
- **Accent against status green.** The accent family neighbours the "Connected"
  hue. The white-fill Connected chip is the mitigation; verify it on a real
  screen against the header strip before committing.
- **Invalid-submit as a whole screen.** Field-level error styling is specified,
  but no full-page frame exists showing focus landing on the first failing field.
  Build it, then check it with the keyboard only.

---

## Out of scope for the UI

- Multi-step wizard or stepper
- Cross-navigation between patient and staff views
- Staff dashboard, charts, or submission history
- Authentication screens
- Dark mode, language switcher, or settings
- Persistence of form state across a patient-side refresh
