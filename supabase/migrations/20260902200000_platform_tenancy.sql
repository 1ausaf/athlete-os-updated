-- POWA Coach platform tenancy: tenants, membership, domains, branding,
-- plans/subscriptions/entitlements, invitations, webhook idempotency.
-- Foundation for multi-tenant RLS — every tenant-owned table gates on the
-- membership helpers defined here. Supersedes the single-tenant user_roles
-- model from the retired 20260512120000_aos_mvp_schema.sql.

-- ------------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------------

-- Matches types/user.ts UserRole exactly (the retired MVP enum lacked 'parent').
CREATE TYPE public.user_role AS ENUM ('athlete', 'parent', 'coach', 'admin', 'owner');

CREATE TYPE public.tenant_status AS ENUM ('active', 'pilot', 'suspended', 'archived');

CREATE TYPE public.tenant_member_status AS ENUM ('active', 'suspended');

CREATE TYPE public.domain_type AS ENUM ('subdomain', 'custom');

CREATE TYPE public.domain_status AS ENUM ('pending', 'verified', 'failed');

CREATE TYPE public.subscription_status AS ENUM
  ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'paused');

-- ------------------------------------------------------------------
-- Default privileges: future tables start closed. Every table below
-- (and in later migrations) carries explicit grants instead.
-- ------------------------------------------------------------------

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- ------------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------------

CREATE TABLE public.tenants (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               text NOT NULL UNIQUE
                     CHECK (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'),
  name               text NOT NULL,
  status             public.tenant_status NOT NULL DEFAULT 'active',
  stripe_customer_id text UNIQUE,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tenants IS
  'One row per coaching business on the platform. slug drives {slug}.powa.com.';

CREATE TABLE public.tenant_branding (
  tenant_id       uuid PRIMARY KEY REFERENCES public.tenants (id) ON DELETE CASCADE,
  display_name    text,
  logo_url        text,
  icon_url        text,
  -- HSL triplets ("353 78% 44%") matching the app's CSS token format; the
  -- long tail (dark variants, fonts, email footer) lives in theme jsonb.
  theme           jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tenant_branding IS
  'Anon-exposed white-label surface (via get_tenant_public_branding RPC only) — kept apart from billing/ops columns on tenants.';

CREATE TABLE public.tenant_domains (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  hostname           text NOT NULL UNIQUE CHECK (hostname = lower(hostname)),
  domain_type        public.domain_type NOT NULL,
  status             public.domain_status NOT NULL DEFAULT 'pending',
  is_primary         boolean NOT NULL DEFAULT false,
  verification_token text,
  verified_at        timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX tenant_domains_one_primary_uq
  ON public.tenant_domains (tenant_id) WHERE is_primary;

CREATE INDEX tenant_domains_tenant_idx ON public.tenant_domains (tenant_id);

CREATE TABLE public.tenant_members (
  tenant_id  uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  roles      public.user_role[] NOT NULL CHECK (cardinality(roles) > 0),
  status     public.tenant_member_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

-- The RLS hot path: member_tenant_ids() resolves through this index.
CREATE INDEX tenant_members_user_idx ON public.tenant_members (user_id);

CREATE TABLE public.plans (
  id              text PRIMARY KEY,
  name            text NOT NULL,
  stripe_price_id text UNIQUE,
  price_cents     integer,
  features        jsonb NOT NULL DEFAULT '{}'::jsonb,
  limits          jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0
);

CREATE TABLE public.tenant_subscriptions (
  tenant_id              uuid PRIMARY KEY REFERENCES public.tenants (id) ON DELETE CASCADE,
  plan_id                text NOT NULL REFERENCES public.plans (id),
  status                 public.subscription_status NOT NULL DEFAULT 'trialing',
  stripe_subscription_id text UNIQUE,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean NOT NULL DEFAULT false,
  -- One-off grants layered over the plan ("LPS gets 200 members on pro").
  entitlement_overrides  jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tenant_invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  email       text NOT NULL CHECK (email = lower(email)),
  roles       public.user_role[] NOT NULL CHECK (cardinality(roles) > 0),
  -- sha256 of the emailed token; the raw token is never stored.
  token_hash  text NOT NULL UNIQUE,
  invited_by  uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  expires_at  timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users (id),
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX tenant_invitations_pending_uq
  ON public.tenant_invitations (tenant_id, email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE TABLE public.stripe_webhook_events (
  id           text PRIMARY KEY,
  type         text NOT NULL,
  payload      jsonb,
  processed_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.stripe_webhook_events IS
  'Webhook idempotency ledger — service-role only.';

-- ------------------------------------------------------------------
-- updated_at triggers (set_updated_at() already exists in prod)
-- ------------------------------------------------------------------

CREATE TRIGGER tenants_set_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tenant_branding_set_updated_at
  BEFORE UPDATE ON public.tenant_branding
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tenant_members_set_updated_at
  BEFORE UPDATE ON public.tenant_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tenant_subscriptions_set_updated_at
  BEFORE UPDATE ON public.tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------
-- Membership helpers — the RLS backbone. STABLE + zero args means a
-- policy written as `tenant_id = ANY ((SELECT fn()))` evaluates the
-- function ONCE per statement (initPlan), then probes the array per row.
-- ------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.member_tenant_ids()
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(array_agg(tm.tenant_id), '{}')
  FROM public.tenant_members tm
  WHERE tm.user_id = (SELECT auth.uid())
    AND tm.status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.role_tenant_ids(p_roles public.user_role[])
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(array_agg(tm.tenant_id), '{}')
  FROM public.tenant_members tm
  WHERE tm.user_id = (SELECT auth.uid())
    AND tm.status = 'active'
    AND tm.roles && p_roles;
$$;

CREATE OR REPLACE FUNCTION public.staff_tenant_ids()
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.role_tenant_ids('{admin,owner}'::public.user_role[]);
$$;

REVOKE ALL ON FUNCTION public.member_tenant_ids() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.role_tenant_ids(public.user_role[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.staff_tenant_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_tenant_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.role_tenant_ids(public.user_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_tenant_ids() TO authenticated;

-- ------------------------------------------------------------------
-- RLS. Writes to tenant_members / tenant_domains / tenant_subscriptions
-- are deliberately service-role/RPC only (no authenticated write
-- policies) — no self-role-escalation path exists.
-- ------------------------------------------------------------------

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenants_select ON public.tenants FOR SELECT TO authenticated
  USING (id = ANY ((SELECT public.member_tenant_ids())::uuid[]));

CREATE POLICY tenants_update_staff ON public.tenants FOR UPDATE TO authenticated
  USING (id = ANY ((SELECT public.staff_tenant_ids())::uuid[]))
  WITH CHECK (id = ANY ((SELECT public.staff_tenant_ids())::uuid[]));

CREATE POLICY tenant_branding_select ON public.tenant_branding FOR SELECT TO authenticated
  USING (tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[]));

CREATE POLICY tenant_branding_insert_staff ON public.tenant_branding FOR INSERT TO authenticated
  WITH CHECK (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]));

CREATE POLICY tenant_branding_update_staff ON public.tenant_branding FOR UPDATE TO authenticated
  USING (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]))
  WITH CHECK (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]));

CREATE POLICY tenant_domains_select_staff ON public.tenant_domains FOR SELECT TO authenticated
  USING (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]));

CREATE POLICY tenant_members_select ON public.tenant_members FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
  );

CREATE POLICY plans_select ON public.plans FOR SELECT TO authenticated
  USING (is_active);

CREATE POLICY tenant_subscriptions_select_staff ON public.tenant_subscriptions FOR SELECT TO authenticated
  USING (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]));

CREATE POLICY tenant_invitations_select_staff ON public.tenant_invitations FOR SELECT TO authenticated
  USING (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]));

-- stripe_webhook_events: zero policies + zero grants = service-role only.

-- ------------------------------------------------------------------
-- Grants (explicit — default privileges are closed above)
-- ------------------------------------------------------------------

GRANT SELECT, UPDATE ON public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tenant_branding TO authenticated;
GRANT SELECT ON public.tenant_domains TO authenticated;
GRANT SELECT ON public.tenant_members TO authenticated;
GRANT SELECT ON public.plans TO authenticated;
GRANT SELECT ON public.tenant_subscriptions TO authenticated;
GRANT SELECT ON public.tenant_invitations TO authenticated;

GRANT ALL ON public.tenants, public.tenant_branding, public.tenant_domains,
  public.tenant_members, public.plans, public.tenant_subscriptions,
  public.tenant_invitations, public.stripe_webhook_events TO service_role;

-- ------------------------------------------------------------------
-- Plan catalog seed (prices are placeholders for the owner to set)
-- ------------------------------------------------------------------

INSERT INTO public.plans (id, name, price_cents, features, limits, sort_order) VALUES
  ('starter', 'Starter', 19900,
   '{"custom_branding": false, "custom_domain": false, "messaging": false, "cap_notes": false, "powa_badge_removal": false}',
   '{"max_members": 50, "max_staff": 3}',
   1),
  ('pro', 'Pro', 49900,
   '{"custom_branding": true, "custom_domain": false, "messaging": true, "cap_notes": true, "powa_badge_removal": false}',
   '{"max_members": 250, "max_staff": 10}',
   2),
  ('white_label', 'White Label', 99900,
   '{"custom_branding": true, "custom_domain": true, "messaging": true, "cap_notes": true, "powa_badge_removal": true}',
   '{"max_members": null, "max_staff": 25}',
   3);
