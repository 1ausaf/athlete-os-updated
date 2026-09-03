# POWA Coach — Security Architecture

Source of truth for how authentication, authorization, tenant isolation and
data access work. Frontend checks are UI only; the server authorization
layer and Postgres RLS are the security boundary.

## The chain

```
Request
   ↓  middleware: sanitize Host → classify platform|tenant|demo →
   ↓  stamp trusted x-powa-* request headers (ALWAYS overwritten)
Resolve Tenant
   ↓  lib/tenant/resolve.ts — DB-verified hostname via anon RPC
   ↓  get_tenant_public_branding (verified domains, active/pilot only)
   ↓  unknown / suspended host ⇒ 404
Authenticate User
   ↓  supabase.auth.getUser() — server-validated session, refreshed by the
   ↓  middleware on tenant hosts; none ⇒ /auth/sign-in
Verify Active Membership
   ↓  get_my_membership(tenant_id) RPC keyed to auth.uid() — none or
   ↓  suspended ⇒ signOut + denied
Resolve Role → Permissions
   ↓  roles[] from tenant_members; permission set from the central matrix
   ↓  (lib/authz/permissions.ts) — never client-supplied
Server Authorization
   ↓  lib/authz/guards.ts — requireAuthContext / requirePagePermission /
   ↓  assertPermission on every protected page, action and API route
Database RLS
   ↓  membership-array policies + composite (tenant_id, id) FKs
ACCESS          — any failure at any stage ⇒ DENY (fail closed)
```

## Design decisions that carry the weight

- **Authorization never lives in the JWT.** The session proves identity
  only. Membership, roles, status and entitlements are read live from the
  database on every request AND inside every RLS policy. Revocation is
  effective on the very next request — no stale-claims window, no session
  invalidation dance for authz.
- **The hostname is the tenant context.** Stamped by middleware from
  Vercel-authoritative headers; client-supplied tenant ids are read
  nowhere. Sessions are host-only cookies, so each tenant hostname is an
  independent security realm — "tenant switching" is navigation, and there
  is no switch API to attack.
- **Composite foreign keys.** Every child row references its parent as
  `(tenant_id, parent_id)`, making cross-tenant references unrepresentable
  even for service-role code with bugs.
- **No client write path to authority.** `tenant_members`, `tenant_domains`
  and `tenant_subscriptions` have zero authenticated write policies —
  self-promotion is impossible against the raw REST API. Role changes run
  through authorized server actions using the service role.
- **Fail closed everywhere.** Unknown host 404s; missing membership signs
  out; a tenant without an active subscription cannot add members or staff
  (DB triggers, which bind service-role code too); resolution errors deny.
  There are no fallback tenants, roles, or production bypasses.
- **Demo isolation.** Demo hosts (and DB-flagged `pilot` tenants) run the
  cookie-persona shim over FICTIONAL data only. `isRealAuth` stays false
  there, and surfaces holding real data (the Live Roster) demand a genuine
  session — persona cookies can never open live PII on a tenant host.

## Modules

| Concern | Where |
|---|---|
| Host classification | `lib/tenant/host.ts` (pure, edge-safe) + `middleware.ts` |
| Tenant resolution + branding | `lib/tenant/resolve.ts`, `lib/tenant/context.ts`, `lib/tenant/branding.ts` |
| Identity + authority | `lib/authz/context.ts` (`getAuthContext`) |
| Guards | `lib/authz/guards.ts` (`requireAuthContext`, `requirePagePermission`, `assertPermission`) |
| Permission matrix | `lib/authz/permissions.ts` |
| Audit log | `lib/authz/audit.ts` → `public.audit_logs` (append-only; owner/admin tenant-scoped reads) |
| Auth flows | `app/(auth)/auth/{sign-in,callback,confirm,reset,update-password,sign-out}` |
| Session refresh | `middleware.ts` (`passWithSessionRefresh`, tenant hosts only) |
| Webhook verification | `lib/security/webhooks.ts` (Stripe/Square HMAC, timing-safe, fail closed) + idempotency ledger |
| Service-role fence | eslint `no-restricted-imports`; allowed only in webhooks, `lib/data/members.ts`, `lib/data/billing.ts`, `lib/authz/audit.ts` |
| DB internals | `private` schema (helpers/triggers) — not exposed via PostgREST |

## Session policy (v1)

Access token 1h; refresh rotation + reuse detection on; no lifetime cap or
idle timeout in v1 (revisit per tier); unlimited concurrent sessions with
admin revoke-all (`auth.admin.signOut(user,'global')`) for emergencies;
password change revokes other sessions (Supabase default); role/membership
changes are effective immediately by construction.

## Emergency revocation

- Suspend a member: `tenant_members.status = 'suspended'` — denied on next
  request (RLS helpers filter `status='active'`).
- Suspend a tenant: `tenants.status = 'suspended'` — hostname resolution
  itself fails (branding RPC filters active/pilot); the whole workspace 404s.
- Kill sessions: Supabase admin API global sign-out per user.

## Enumeration & errors

Sign-in returns "Invalid email or password."; membership denial returns a
workspace-access message only after correct credentials; password reset
always answers "If an account exists…". AuthzError maps to generic 401/403
bodies; provider/DB details go to server logs only.

## Storage

`tenant-assets` (public read, service-role write, `{tenant_id}/…` paths)
for branding. Private member files get a separate private bucket when a
feature needs one: `tenant/{tenant_id}/…` paths, storage policies checking
membership via `private.member_tenant_ids()`, signed URLs, path-manipulation
tests — never unrestricted public URLs.

## Monitoring (now vs later)

Now: Supabase auth logs + `audit_logs` + Vercel function logs + security
advisors re-run after every migration. Later (needs log drain/alerting):
failed-login bursts per IP/account, repeated 403s across tenants,
owner/admin role-change alerts, large export detection.

## Testing

- `supabase/tests/` — SQL isolation suite (two-tenant fixture): SELECT
  scoping, cross-tenant INSERT/UPDATE denial, composite-FK rejection,
  privilege-escalation attempts, cap/fail-closed behavior, Rule of Two.
- `scripts/security-probe.mjs` — black-box HTTP probes against a running
  deployment (frontend bypassed): forged `x-powa-*` headers, persona
  cookies on tenant hosts, unauthenticated access, deleted-page 404s.
- Unit tests for the permission matrix and host classification.

Run the DB suite + advisors after every schema change; run the probe
against a preview before promoting auth-affecting changes.
