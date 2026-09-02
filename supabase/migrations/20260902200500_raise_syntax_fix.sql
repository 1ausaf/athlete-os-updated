-- Fix an invalid RAISE form inherited from the retired MVP schema and
-- repeated in the entitlement triggers: `RAISE EXCEPTION 'name' USING
-- MESSAGE = '…'` specifies MESSAGE twice, so the trigger blocked writes but
-- errored with "RAISE option already specified: MESSAGE" instead of its real
-- message (caught by the isolation test suite). Convention going forward:
-- one format string, machine-parsable prefix — 'error_code: Human message.'

CREATE OR REPLACE FUNCTION public.validate_thread_rule_of_two(p_thread_id uuid)
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
    COUNT(*) FILTER (WHERE public.profile_is_minor(tp.profile_id)),
    COUNT(*) FILTER (WHERE NOT public.profile_is_minor(tp.profile_id)),
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

CREATE OR REPLACE FUNCTION public.trg_messages_sender_must_be_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_thread_participant(NEW.thread_id, NEW.sender_profile_id) THEN
    RAISE EXCEPTION 'messages_sender_not_in_thread: Sender must be a participant in the thread.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_bookings_membership_and_payment()
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

    IF NOT public.booking_frequency_ok_for_confirm(NEW.athlete_id, NEW.session_id, NEW.id) THEN
      RAISE EXCEPTION 'booking_membership_limit: Booking exceeds active membership frequency or membership is not in good standing.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_message_thread_with_participants(
  p_tenant_id uuid,
  p_title text,
  p_participant_profile_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_tid uuid;
  v_pid uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated: You must be signed in to create a thread.';
  END IF;

  IF p_participant_profile_ids IS NULL OR cardinality(p_participant_profile_ids) = 0 THEN
    RAISE EXCEPTION 'no_participants: At least one participant is required.';
  END IF;

  INSERT INTO public.message_threads (tenant_id, title, created_by_profile_id)
  VALUES (p_tenant_id, p_title, auth.uid())
  RETURNING id INTO v_tid;

  FOR v_pid IN
    SELECT DISTINCT u
    FROM unnest(p_participant_profile_ids) AS u
  LOOP
    INSERT INTO public.thread_participants (tenant_id, thread_id, profile_id)
    VALUES (p_tenant_id, v_tid, v_pid);
  END LOOP;

  RETURN v_tid;
END;
$$;

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
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('member_cap' || NEW.tenant_id::text));
  SELECT count(*) INTO v_count FROM public.athletes a WHERE a.tenant_id = NEW.tenant_id;
  IF v_count >= v_cap THEN
    RAISE EXCEPTION 'member_cap_reached: This plan''s member limit has been reached.';
  END IF;
  RETURN NEW;
END;
$$;

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
    RETURN NEW;
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
    RAISE EXCEPTION 'staff_cap_reached: This plan''s staff limit has been reached.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_enforce_custom_domain_entitlement()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.domain_type = 'custom'
     AND NOT coalesce((public.tenant_entitlements(NEW.tenant_id) ->> 'custom_domain')::boolean, false) THEN
    RAISE EXCEPTION 'custom_domain_not_entitled: Custom domains require the White Label plan.';
  END IF;
  RETURN NEW;
END;
$$;
