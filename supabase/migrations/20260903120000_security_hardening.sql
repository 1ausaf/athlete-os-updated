-- Security hardening (approved plan, Phase 3). All additive; rollback notes
-- per section. Changes:
--   A. In-DB snapshot of the live members roster (pre-change backup).
--   B. Internal helper/trigger functions move to a `private` schema so the
--      PostgREST API surface no longer exposes them (advisor 0028/0029);
--      RLS policies and triggers follow OIDs, so they keep working.
--   C. set_updated_at gets a pinned search_path (advisor 0011).
--   D. Entitlement caps FAIL CLOSED when a tenant has no active
--      subscription (previously: no subscription => unlimited).
--
-- Rollback: A) drop table members_backup_20260903; B) ALTER FUNCTION ...
-- SET SCHEMA public per function (policies/triggers follow OIDs back);
-- C) ALTER FUNCTION private.set_updated_at() RESET search_path;
-- D) re-apply the 20260902200500 bodies.

-- ------------------------------------------------------------------
-- A. Snapshot the only table holding live production data (134 rows).
--    Same sealed posture as the source: RLS on, zero policies, no grants.
-- ------------------------------------------------------------------

CREATE TABLE public.members_backup_20260903 AS SELECT * FROM public.members;
ALTER TABLE public.members_backup_20260903 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.members_backup_20260903 FROM anon, authenticated;
COMMENT ON TABLE public.members_backup_20260903 IS
  'Pre-hardening snapshot of members (2026-09-03). Service-role only. Drop after Phase 12 sign-off.';

-- ------------------------------------------------------------------
-- B. Private schema for internal functions. authenticated needs USAGE
--    (RLS policies execute these as the querying role) but PostgREST only
--    exposes the `public` schema, so none remain API-callable.
-- ------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- Moves that need no body changes (they reference tables, which stay put).
ALTER FUNCTION public.member_tenant_ids() SET SCHEMA private;
ALTER FUNCTION public.role_tenant_ids(public.user_role[]) SET SCHEMA private;
ALTER FUNCTION public.staff_tenant_ids() SET SCHEMA private;
ALTER FUNCTION public.profile_owns_athlete(uuid) SET SCHEMA private;
ALTER FUNCTION public.is_assigned_coach_for_athlete(uuid) SET SCHEMA private;
ALTER FUNCTION public.is_thread_participant(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.profile_is_minor(uuid) SET SCHEMA private;
ALTER FUNCTION public.validate_thread_rule_of_two(uuid) SET SCHEMA private;
ALTER FUNCTION public.booking_frequency_ok_for_confirm(uuid, uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.tenant_entitlements(uuid) SET SCHEMA private;
ALTER FUNCTION public.set_updated_at() SET SCHEMA private;
ALTER FUNCTION public.trg_thread_participants_rule_of_two() SET SCHEMA private;
ALTER FUNCTION public.trg_messages_sender_must_be_participant() SET SCHEMA private;
ALTER FUNCTION public.trg_bookings_membership_and_payment() SET SCHEMA private;
ALTER FUNCTION public.trg_enforce_member_cap() SET SCHEMA private;
ALTER FUNCTION public.trg_enforce_staff_cap() SET SCHEMA private;
ALTER FUNCTION public.trg_enforce_custom_domain_entitlement() SET SCHEMA private;

-- C. Pin the trigger helper's search_path (it only touches NEW).
ALTER FUNCTION private.set_updated_at() SET search_path = '';

-- Trigger functions are invoked by the system, not by API callers — they
-- need no EXECUTE for API roles at all.
REVOKE ALL ON FUNCTION private.trg_thread_participants_rule_of_two() FROM authenticated, anon, PUBLIC;
REVOKE ALL ON FUNCTION private.trg_messages_sender_must_be_participant() FROM authenticated, anon, PUBLIC;
REVOKE ALL ON FUNCTION private.trg_bookings_membership_and_payment() FROM authenticated, anon, PUBLIC;
REVOKE ALL ON FUNCTION private.trg_enforce_member_cap() FROM authenticated, anon, PUBLIC;
REVOKE ALL ON FUNCTION private.trg_enforce_staff_cap() FROM authenticated, anon, PUBLIC;
REVOKE ALL ON FUNCTION private.trg_enforce_custom_domain_entitlement() FROM authenticated, anon, PUBLIC;
REVOKE ALL ON FUNCTION private.set_updated_at() FROM authenticated, anon, PUBLIC;

-- Function-to-function references live in body TEXT, so bodies that call a
-- moved function are recreated with private.* references (same OID —
-- CREATE OR REPLACE preserves it; triggers/policies unaffected).

CREATE OR REPLACE FUNCTION private.staff_tenant_ids()
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.role_tenant_ids('{admin,owner}'::public.user_role[]);
$$;

CREATE OR REPLACE FUNCTION private.validate_thread_rule_of_two(p_thread_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_minors integer;
  v_adults integer;
  v_total integer;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE private.profile_is_minor(tp.profile_id)),
    COUNT(*) FILTER (WHERE NOT private.profile_is_minor(tp.profile_id)),
    COUNT(*)
  INTO v_minors, v_adults, v_total
  FROM public.thread_participants tp
  WHERE tp.thread_id = p_thread_id;

  IF v_total = 0 THEN
    RETURN;
  END IF;

  IF v_minors >= 1 THEN
    IF v_adults < 2 THEN
      RAISE EXCEPTION 'rule_of_two_violation: Threads including a minor must include at least two adults.';
    END IF;

    IF v_total = 2 AND v_minors = 1 AND v_adults = 1 THEN
      RAISE EXCEPTION 'rule_of_two_violation: One-to-one adult-minor threads are not allowed.';
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.trg_thread_participants_rule_of_two()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  tid uuid;
BEGIN
  tid := coalesce(NEW.thread_id, OLD.thread_id);
  PERFORM private.validate_thread_rule_of_two(tid);
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION private.trg_messages_sender_must_be_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.is_thread_participant(NEW.thread_id, NEW.sender_profile_id) THEN
    RAISE EXCEPTION 'messages_sender_not_in_thread: Sender must be a participant in the thread.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.trg_bookings_membership_and_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_confirming boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_confirming := NEW.status = 'confirmed';
  ELSE
    v_confirming := NEW.status = 'confirmed'
    AND (
      OLD.status IS DISTINCT FROM 'confirmed'
    );
  END IF;

  IF v_confirming THEN
    IF NEW.payment_status NOT IN ('paid', 'authorized', 'waived') THEN
      RAISE EXCEPTION 'booking_payment_required: Booking cannot be confirmed until payment_status is paid, authorized, or waived.';
    END IF;

    IF NOT private.booking_frequency_ok_for_confirm(NEW.athlete_id, NEW.session_id, NEW.id) THEN
      RAISE EXCEPTION 'booking_membership_limit: Booking exceeds active membership frequency or membership is not in good standing.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------
-- D. Entitlement caps fail CLOSED: a tenant with no active subscription
--    ('{}'::jsonb from tenant_entitlements) can no longer add members,
--    staff, or domains. past_due keeps its grace window (still "active"
--    from tenant_entitlements' perspective).
-- ------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.trg_enforce_member_cap()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ent jsonb;
  v_cap integer;
  v_count integer;
BEGIN
  v_ent := private.tenant_entitlements(NEW.tenant_id);
  IF v_ent = '{}'::jsonb THEN
    RAISE EXCEPTION 'no_active_subscription: This workspace has no active subscription.';
  END IF;
  v_cap := (v_ent ->> 'max_members')::integer;
  IF v_cap IS NULL THEN
    RETURN NEW;  -- unlimited on this plan
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('member_cap' || NEW.tenant_id::text));
  SELECT count(*) INTO v_count FROM public.athletes a WHERE a.tenant_id = NEW.tenant_id;
  IF v_count >= v_cap THEN
    RAISE EXCEPTION 'member_cap_reached: This plan''s member limit has been reached.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.trg_enforce_staff_cap()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ent jsonb;
  v_cap integer;
  v_count integer;
BEGIN
  IF NOT (NEW.roles && '{coach,admin,owner}'::public.user_role[]) THEN
    RETURN NEW;
  END IF;
  v_ent := private.tenant_entitlements(NEW.tenant_id);
  IF v_ent = '{}'::jsonb THEN
    RAISE EXCEPTION 'no_active_subscription: This workspace has no active subscription.';
  END IF;
  v_cap := (v_ent ->> 'max_staff')::integer;
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
    RAISE EXCEPTION 'staff_cap_reached: This plan''s staff limit has been reached.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.trg_enforce_custom_domain_entitlement()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.domain_type = 'custom'
     AND NOT coalesce((private.tenant_entitlements(NEW.tenant_id) ->> 'custom_domain')::boolean, false) THEN
    RAISE EXCEPTION 'custom_domain_not_entitled: Custom domains require the White Label plan.';
  END IF;
  RETURN NEW;
END;
$$;

-- The anon branding RPC stays in public (deliberate anon surface) but now
-- reads entitlements from private.
CREATE OR REPLACE FUNCTION public.get_tenant_public_branding(p_hostname text)
RETURNS TABLE (
  tenant_id    uuid,
  slug         text,
  status       public.tenant_status,
  display_name text,
  logo_url     text,
  icon_url     text,
  theme        jsonb,
  entitlements jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT t.id,
         t.slug,
         t.status,
         coalesce(b.display_name, t.name),
         b.logo_url,
         b.icon_url,
         coalesce(b.theme, '{}'::jsonb),
         coalesce(private.tenant_entitlements(t.id), '{}'::jsonb)
  FROM public.tenant_domains d
  JOIN public.tenants t ON t.id = d.tenant_id AND t.status IN ('active', 'pilot')
  LEFT JOIN public.tenant_branding b ON b.tenant_id = t.id
  WHERE d.hostname = lower(p_hostname)
    AND d.status = 'verified';
$$;
