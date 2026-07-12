# LPS Athletic AOS — Redesign brief (for page rebuilds)

We are turning a bare shadcn scaffold into a polished, self-contained **demo**
of the LPS Athletic "Athlete Operating System" (see the two requirements PDFs the
project is based on). The design foundation, mock-data layer, shell, nav, auth,
marketing landing, athlete dashboard and coach huddle brief are **already done**.
Your job is to rebuild the pages assigned to you to the same standard.

## Golden rules

1. **Data comes ONLY from `@/lib/demo/data`** (and `@/lib/demo/status`). Never
   import from `@/lib/data/*`, `@/lib/supabase/*`, or any server action that
   touches Supabase. Read `lib/demo/data.ts` fully before starting — it exports
   athletes, sessions, threads, plans, invoices, complianceRows, facility KPIs,
   and formatting helpers (`money`, `money2`, `fmtDay`, `fmtTime`, `fmtRange`,
   `relTime`).
2. **Get the user** with `requireUserWithProfile()` from `@/lib/auth`. Keep the
   existing role-guard redirects (athlete pages redirect non-athletes to
   `/staff/athletes`; staff pages redirect non-staff to `/athlete/dashboard`
   using `isStaff` from `@/lib/rbac`).
3. **Reuse the shared kit — do NOT edit it or the design tokens.** Available:
   - `@/components/app/page-header` → `PageHeader {eyebrow, title, description, actions}`
   - `@/components/app/stat-tile` → `StatTile {label, value, unit?, delta?, hint?, icon?, accent?}`
   - `@/components/app/athlete-avatar` → `AthleteAvatar {initials, hue, size, className?}`
   - `@/components/app/progress` → `Progress {value 0-100, tone?}`, `ProgressRing {value, size?, stroke?, label?}`
   - `@/components/app/mini-charts` → `BarSeries {data, labels?, height?}`, `Sparkline {data}`
   - `@/components/app/rule-of-two` → `RuleOfTwoBanner {participants}`
   - `@/components/ui/pill` → `Pill {tone: neutral|brand|success|warning|danger|info, dot?, icon?}`
   - `@/components/ui/card`, `button`, `input`, `textarea`, `label`, `select`,
     `table`, `tabs`, `separator`, `avatar`, `badge`, `status-badge`.
   - status maps: `billingMeta[state]`, `bookingMeta[state]`, `seasonMeta[state]`
     from `@/lib/demo/status` → `{label, tone}`.
4. **Match the visual language of the exemplars.** Before writing, READ these and
   mirror their patterns (spacing `gap-4/6`, `PageHeader`, cards, pills, eyebrow
   labels, tabular numbers via `tnum`, rounded-xl cards, volt accents via
   `text-brand-ink` / `bg-brand` / `bg-brand/10`):
   - `app/(marketing)/page.tsx`
   - `app/(athlete)/athlete/dashboard/page.tsx`
   - `app/(staff)/staff/sessions/huddle-brief/page.tsx`
5. **Interactive forms must be client components with local `useState`** (no
   backend). Optimistic UI only. Example: sending a message appends to local
   state; booking toggles a local "booked" pill; adding a CAP note prepends to a
   local list. Keep it believable, never call a server action that hits Supabase.
6. Typed routes are ON (`typedRoutes: true`). Cast dynamic hrefs
   `` `/staff/athletes/${a.id}` as Route `` (import `type { Route } from "next"`).
7. Use real, tasteful icons from `lucide-react`. Keep text `text-balance` /
   `text-pretty` where it helps. No `h-4.5`-style invalid Tailwind sizes.
8. Both light & dark themes must look right — always use tokens
   (`text-muted-foreground`, `bg-surface/50`, `border-border`, `bg-card`), never
   hard-coded hex or `text-gray-500`.

## Brand voice
Elite, confident, athletic. "The Pro Maker". CAP = Context / Action / Plan.
Semi-private coaching, individualized periodized programs. Safe-Sport "Rule of
Two" is the flagship compliance feature: a thread with a minor athlete must
include a second adult (guardian or 2nd coach); no admin override.

## Route param conventions (for links + detail lookups)
- Staff athlete detail: `/staff/athletes/{athlete.id}` → look up `athleteById(id)`.
- Staff athlete program: `/staff/athletes/{athlete.id}/program`.
- Staff session detail: `/staff/sessions/{session.id}` → `sessions.find`.
- Messaging thread (staff): `/staff/messaging/{thread.id}` → `threadById(id)`.
- Athlete message thread: `/athlete/messages/{thread.id}` → `threadById(id)`.

Detail pages receive `{ params: { athleteId: string } }` etc. If not found, call
`notFound()` from `next/navigation`.

Deliver complete, compiling `.tsx` files. Do not run builds. Keep each page a
default export React component.
