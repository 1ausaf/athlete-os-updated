-- Entitlement resolution + hard caps. Caps live in DB triggers because
-- triggers bind service-role code too (RLS does not) — the billing boundary
-- holds even when app code or scripts are wrong.

CREATE OR REPLACE FUNCTION public.tenant_entitlements(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(p.features || p.limits || ts.entitlement_overrides, '{}'::jsonb)
  FROM public.tenant_subscriptions ts
  JOIN public.plans p ON p.id = ts.plan_id
  WHERE ts.tenant_id = p_tenant_id
    -- past_due keeps a grace window; canceled/incomplete/paused = nothing.
    AND ts.status IN ('trialing', 'active', 'past_due');
$$;

REVOKE ALL ON FUNCTION public.tenant_entitlements(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_entitlements(uuid) TO authenticated, service_role;

-- Member cap: blocks the N+1th athlete insert for the tenant's plan.
CREATE OR REPLACE FUNCTION public.trg_enforce_member_cap()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cap integer;
  v_count integer;
BEGIN
  v_cap := (public.tenant_entitlements(NEW.tenant_id) ->> 'max_members')::integer;
  IF v_cap IS NULL THEN
    RETURN NEW;  -- unlimited (or no active subscription — app gates that)
  END IF;
  -- Serialize per-tenant inserts so concurrent transactions can't both pass
  -- the count check.
  PERFORM pg_advisory_xact_lock(hashtext('member_cap' || NEW.tenant_id::text));
  SELECT count(*) INTO v_count FROM public.athletes a WHERE a.tenant_id = NEW.tenant_id;
  IF v_count >= v_cap THEN
    RAISE EXCEPTION 'member_cap_reached'
      USING MESSAGE = 'This plan''s member limit has been reached.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER athletes_member_cap
  BEFORE INSERT ON public.athletes
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_member_cap();

-- Staff cap: counts memberships holding any staff role.
CREATE OR REPLACE FUNCTION public.trg_enforce_staff_cap()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cap integer;
  v_count integer;
BEGIN
  IF NOT (NEW.roles && '{coach,admin,owner}'::public.user_role[]) THEN
    RETURN NEW;  -- pure athlete/parent membership — not staff
  END IF;
  v_cap := (public.tenant_entitlements(NEW.tenant_id) ->> 'max_staff')::integer;
  IF v_cap IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('staff_cap' || NEW.tenant_id::text));
  SELECT count(*) INTO v_count
  FROM public.tenant_members tm
  WHERE tm.tenant_id = NEW.tenant_id
    AND tm.roles && '{coach,admin,owner}'::public.user_role[]
    AND (TG_OP = 'INSERT' OR tm.user_id <> NEW.user_id);
  IF v_count >= v_cap THEN
    RAISE EXCEPTION 'staff_cap_reached'
      USING MESSAGE = 'This plan''s staff limit has been reached.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tenant_members_staff_cap
  BEFORE INSERT OR UPDATE OF roles ON public.tenant_members
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_staff_cap();

-- Custom domains are a tier feature — enforced at the row level.
CREATE OR REPLACE FUNCTION public.trg_enforce_custom_domain_entitlement()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.domain_type = 'custom'
     AND NOT coalesce((public.tenant_entitlements(NEW.tenant_id) ->> 'custom_domain')::boolean, false) THEN
    RAISE EXCEPTION 'custom_domain_not_entitled'
      USING MESSAGE = 'Custom domains require the White Label plan.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tenant_domains_entitlement
  BEFORE INSERT ON public.tenant_domains
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_custom_domain_entitlement();
