# LPS Athletic AOS — design system

The visual language for the Athlete Operating System. Source of truth for color
is the CSS variables in [`app/globals.css`](../app/globals.css); Tailwind maps
them in [`tailwind.config.ts`](../tailwind.config.ts). A live gallery renders at
route **`/style-guide`** (noindex).

## Brand

Drawn from LPS Athletic — "The Pro Maker™": a monochrome **wolf** identity
(near-black graphite + white) with one signature **volt** (electric-lime) accent
for energy, key actions and PR/"win" moments. Volt is deliberately kept distinct
from the semantic colors so it never competes with status meaning.

- **Mark / lockup:** [`components/brand/logo.tsx`](../components/brand/logo.tsx)
  (`WolfMark`, `BrandLockup`).

## Themes

Dual-mode, class-based (`next-themes`, default **dark**), toggled in the top bar
([`components/theme/theme-toggle.tsx`](../components/theme/theme-toggle.tsx)).
The dark theme is athletic graphite + volt; the light theme is premium
high-contrast white/charcoal. In dark mode the primary action is volt; in light
mode it is charcoal — both keep the volt as an accent.

## Color tokens

HSL triplets consumed as `hsl(var(--token) / <alpha>)`. Semantic shadcn tokens
(`--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`,
`--input`, `--ring`, `--card`, `--popover`) are preserved so all shadcn
primitives inherit the theme. New tokens layered on top:

| Token group | Variables | Use |
| --- | --- | --- |
| Surfaces | `--surface`, `--surface-muted`, `--surface-raised` | Layered panels above the page canvas |
| Brand / volt | `--brand`, `--brand-foreground`, `--brand-soft`, `--brand-ink` | Signature accent; `-ink` is the legible-on-any-bg volt for text |
| Success | `--success`, `--success-foreground` | Paid / compliant / positive |
| Warning | `--warning`, `--warning-foreground` | Injury / load / grace period |
| Info | `--info`, `--info-foreground` | Waitlist / pending / neutral notices |
| Shadow | `--shadow-color` | Drives `shadow-soft` / `shadow-raised` |

Tailwind exposes these as `bg-brand`, `text-brand-ink`, `bg-surface`, `text-success`,
`text-warning`, `text-info`, `border-*`, etc. **Never hard-code hex or `gray-XXX`.**

## Typography

- **Display** (`font-display` → Archivo 600–900): `h1`–`h3`, hero numbers, stat values.
- **Sans** (`font-sans` → Inter): body, UI, descriptions.
- **Mono** (`font-mono` → JetBrains Mono): eyebrow labels, IDs, technical meta.
- `.eyebrow` — uppercase mono micro-label above headings.
- `.tnum` — tabular numerals for stats, weights, money.

Base `h1`–`h4` styles live in `@layer base` in globals; pages still add explicit
classes for control.

## Spacing, radius, elevation

- Tailwind's 4px scale. Vertical rhythm standardizes on `gap-4` / `gap-6`; page
  padding `py-8`/`py-10`.
- `--radius: 0.75rem` → `rounded-lg`; cards use `rounded-xl`.
- Shadows: `shadow-soft` (resting cards), `shadow-raised` (hover / floating),
  `shadow-glow` (volt emphasis).

## Utilities (globals)

`.glass` (blurred chrome), `.bg-grid` (masked graph-paper), `.volt-halo` (ambient
glow), `.rule-brand` (volt divider), `.scrollbar-slim`, plus `animate-fade-up` /
`animate-pulse-ring` / `animate-shimmer`.

## Component kit

| Component | Location | Role |
| --- | --- | --- |
| AppShell | `components/shell/app-shell.tsx` | Sidebar + mobile sheet + glass top bar (persona switcher + theme toggle) |
| ShellNav | `components/nav/shell-nav.tsx` | Volt-indicator active nav with badges |
| PageHeader | `components/app/page-header.tsx` | Eyebrow + display title + description + actions |
| StatTile | `components/app/stat-tile.tsx` | KPI tile with delta + icon |
| Pill | `components/ui/pill.tsx` | Status chip: `neutral`/`brand`/`success`/`warning`/`danger`/`info` |
| AthleteAvatar | `components/app/athlete-avatar.tsx` | Deterministic gradient avatar from a hue |
| Progress / ProgressRing | `components/app/progress.tsx` | Linear + circular progress |
| BarSeries / Sparkline | `components/app/mini-charts.tsx` | Dependency-free SVG charts |
| RuleOfTwoBanner | `components/app/rule-of-two.tsx` | Safe-Sport compliance state for a thread |
| StatusBadge | `components/ui/status-badge.tsx` | Booking / payment / compliance tones |
| Card, Button, … | `components/ui/*` | shadcn primitives (Button adds a `brand` variant + `xl` size) |

**Page pattern:** `PageHeader` → grid of `Card`s / `StatTile`s → data-dense
content. Status meaning always flows through `Pill` tones and the
`billingMeta` / `bookingMeta` / `seasonMeta` maps in `lib/demo/status.ts`.
