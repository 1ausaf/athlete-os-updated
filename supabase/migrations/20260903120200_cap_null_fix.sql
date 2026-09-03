-- Fail-closed cap fix: private.tenant_entitlements() returns NULL (not '{}')
-- when a tenant has no active subscription row, and `NULL = '{}'::jsonb` is
-- NULL — so the no-subscription denial in 20260903120000 never fired
-- (caught by the post-apply isolation suite). Coalesce first.
-- Rollback: re-apply the 20260903120000 bodies.

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
  v_ent := coalesce(private.tenant_entitlements(NEW.tenant_id), '{}'::jsonb);
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
  v_ent := coalesce(private.tenant_entitlements(NEW.tenant_id), '{}'::jsonb);
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
