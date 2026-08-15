# Project Structure

Where every file lives, and the rule that decides where a new one goes.

The shape follows from one fact: this app has **two views of one thing**. So the
code is split by view (`patient` / `staff`), and anything both views must agree
on is pulled into `lib/` where neither owns it.

---

## Folder tree

```text
app/                          routes only — thin, one file per URL
  layout.tsx                  <html>, Geist fonts, globals.css
  globals.css                 Tailwind import + base styles
  icon.svg                    favicon — header mark on emerald-50
  page.tsx                    /          patient form
  patient/page.tsx            /patient   redirect → /
  staff/page.tsx              /staff              list of active sessions
  staff/[sessionId]/page.tsx  /staff/[sessionId]  one live record

components/
  AppHeader.tsx               shared strip, variant: patient | staff
  patient/                    used only by /
    PatientIntake.tsx         client root: form instance + channel + session state
    IntakeForm.tsx            the <form>: three sections, fields, submit
    FormField.tsx             labelled control — text, select, textarea, errors
    IntakeActions.tsx         submit states + "Start new intake"
  staff/                      used only by /staff
    StaffWorkspace.tsx        staff layout — keeps list + session sockets
    StaffList.tsx             /staff list — one row per list Presence
    StaffLiveView.tsx         /staff/[sessionId] record, ended banner
    PatientRecord.tsx         the live record card — sections + rows
    RecordRow.tsx             one label/value row + change highlight
    StatusBadge.tsx           five badge states + last-updated timestamp

hooks/
  usePatientSync.ts           list Presence + session events
  useStaffList.ts             staff list from Presence
  useStaffSync.ts             one session channel — receive only

lib/                          no React, no JSX
  supabase.ts                 the browser client
  realtime.ts                 channel name, event names, timings
  intake-schema.ts            Zod form schema + event payloads + all types
  intake-fields.ts            field labels, section order, gender options
  badge-state.ts              resolveBadgeState() — pure, ordered rules
```

---

## Dependency direction

Imports only ever point downward. Nothing in `lib/` knows a component exists.

```text
app/          routes
  ↓
components/   what it looks like
  ↓
hooks/        when it changes
  ↓
lib/          what is true
```

`components/patient/` and `components/staff/` never import from each other.
When both need the same thing, it moves to `lib/` — which is exactly how the
field labels ended up there.

---

## Where things go

Four questions, in order. The first "yes" is the answer.

| Question                                  | It goes in                    |
| ----------------------------------------- | ----------------------------- |
| Do both views have to agree on it?        | `lib/`                        |
| Does it talk to the channel?              | `hooks/`                      |
| Is it something you can see?              | `components/patient` or `/staff` |
| Is it a new URL?                          | `app/`                        |

---

## Conventions

- **Files** — components `PascalCase.tsx`, hooks `useCamelCase.ts`, lib
  `kebab-case.ts`. The filename matches the thing it exports.
- **One main export per file**, named the same as the file. No default exports
  except `app/**/page.tsx`, where Next.js requires one.
- **Imports** use the `@/` alias from [tsconfig.json](../tsconfig.json) —
  `@/lib/intake-schema`, never `../../lib/intake-schema`.
- **`"use client"` sits on modules a server page imports** —
  `PatientIntake.tsx`, `StaffWorkspace.tsx`, `StaffList.tsx`,
  `StaffLiveView.tsx`, and the hooks. Children they render are already client
  code; repeating the directive there adds noise and no meaning.
- **Colours come from stock Tailwind names** (`emerald-400`, `zinc-50`, …).
  No custom `@theme` token layer to keep in sync with a second source of truth.

---

## Why `app/` holds so little

Each `page.tsx` is a server component that does two things: export `metadata`
and render one client component.

That split is not ceremony — the two routes need **different tab titles**
("Patient Intake" against "Front Desk — Live View", per flow 1), and a file
marked `"use client"` cannot export `metadata`. Keeping pages as server shells
gets the tab titles for free and keeps the routing layer readable at a glance.

---

## Deliberately absent

- **No `index.ts` barrel files.** They hide which file a symbol came from, for
  no gain — direct imports are already short with the `@/` alias.
- **No `types/` folder.** Every shared type is inferred from a Zod schema with
  `z.infer` and exported beside it in `intake-schema.ts`. A separate types
  folder would invite hand-written duplicates that drift.
- **No `utils/` folder.** Vague names collect junk. Helpers live in the `lib/`
  file that owns the concept — badge rules in `badge-state.ts`, nothing else.
- **No `providers/` or global store.** State ownership is settled in
  [component-architecture.md](./component-architecture.md); nothing needs to
  cross the two client roots.
- **No test setup.** Out of scope for the brief. `lib/badge-state.ts` is a pure
  function specifically so it is the one piece that could be tested later
  without any harness.

