# Patient Intake

Real-time patient intake system. Next.js 16 App Router, TypeScript,
Tailwind v4, React Hook Form + Zod, Supabase Realtime, deployed on Vercel.

## Read before implementing

- `docs/design-decisions.md` — UI/UX spec, five flows. Authoritative.
- `docs/realtime-sync.md` — event contract, Presence payload, badge
  resolution order. Authoritative.
- `design/design-system.html` — resolved tokens, hex values,  
  contrast ratios.

## Rules

- All events flow patient → staff. Staff is a pure observer and never
  broadcasts.
- Broadcast payload types derive from the Zod schema via `z.infer`, same
  module as the form schema.
- Tailwind utilities only, 4px/8px spacing scale, no arbitrary pixel values.
- Never use `zinc-400` for text. Inputs never below 16px.
- Update `docs/design-decisions.md` when a decision changes during
  implementation — the doc is a deliverable, not a byproduct.
