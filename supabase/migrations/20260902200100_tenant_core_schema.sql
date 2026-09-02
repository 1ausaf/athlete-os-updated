-- Tenant core schema: multi-tenant transform of the AOS MVP schema.
-- Supersedes 20260512120000_aos_mvp_schema.sql and
-- 20260513120000_create_message_thread_with_participants.sql (both unapplied).
--
-- Requires 20260902200000_platform_tenancy.sql, which provides:
--   * enum public.user_role
--   * tables public.tenants, public.tenant_members(tenant_id, user_id, roles, status)
--   * helpers public.member_tenant_ids(), public.role_tenant_ids(public.user_role[]),
--     public.staff_tenant_ids() (STABLE SECURITY DEFINER, active memberships only)
--   * trigger function public.set_updated_at()
--
-- Composite-FK rationale: every child FK carries (tenant_id, <parent>_id) ->
-- parent (tenant_id, id), so cross-tenant links are unrepresentable at the
-- constraint level rather than merely filtered out by RLS.

-- ---------------------------------------------------------------------------
-- ENUM types (public.user_role already exists — see platform tenancy migration)
-- ---------------------------------------------------------------------------

CREATE TYPE public.membership_frequency AS ENUM (
  'unlimited',
  'per_week',
  'per_two_weeks',
  'per_month',
  'package'
);

CREATE TYPE public.payment_status AS ENUM (
  'unpaid',
  'pending',
  'authorized',
  'paid',
  'failed',
  'refunded',
  'waived'
);

CREATE TYPE public.membership_status AS ENUM (
  'active',
  'paused',
  'cancelled',
  'expired'
);

CREATE TYPE public.booking_status AS ENUM (
  'pending',
  'confirmed',
  'cancelled',
  'waitlisted',
  'no_show'
);

CREATE TYPE public.session_status AS ENUM (
  'scheduled',
  'cancelled',
  'completed'
);

CREATE TYPE public.compliance_evaluation_kind AS ENUM (
  'booking_four_week',
  'cap_weekly'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- profiles is GLOBAL (one row per auth user, shared across tenants).
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  date_of_birth date,
  timezone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  injury_flag boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT athletes_tenant_id_id_uq UNIQUE (tenant_id, id),
  CONSTRAINT athletes_tenant_id_profile_id_uq UNIQUE (tenant_id, profile_id)
);

CREATE TABLE public.coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coaches_tenant_id_id_uq UNIQUE (tenant_id, id),
  CONSTRAINT coaches_tenant_id_profile_id_uq UNIQUE (tenant_id, profile_id)
);

CREATE TABLE public.membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  name text NOT NULL,
  description text,
  membership_frequency public.membership_frequency NOT NULL,
  sessions_allowed_per_period integer,
  period_days integer,
  price_cents integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT membership_plans_tenant_id_id_uq UNIQUE (tenant_id, id),
  CONSTRAINT membership_plans_frequency_capacity_ck CHECK (
    membership_frequency = 'unlimited'
    OR (
      sessions_allowed_per_period IS NOT NULL
      AND sessions_allowed_per_period > 0
      AND period_days IS NOT NULL
      AND period_days > 0
    )
  )
);

CREATE TABLE public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  athlete_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  status public.membership_status NOT NULL DEFAULT 'active',
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT memberships_athlete_fk FOREIGN KEY (tenant_id, athlete_id) REFERENCES public.athletes (tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT memberships_plan_fk FOREIGN KEY (tenant_id, plan_id) REFERENCES public.membership_plans (tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT programs_tenant_id_id_uq UNIQUE (tenant_id, id)
);

CREATE TABLE public.athlete_program_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  athlete_id uuid NOT NULL,
  program_id uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  unassigned_at timestamptz,
  CONSTRAINT athlete_program_assignments_athlete_fk FOREIGN KEY (tenant_id, athlete_id) REFERENCES public.athletes (tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT athlete_program_assignments_program_fk FOREIGN KEY (tenant_id, program_id) REFERENCES public.programs (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE public.coach_athlete_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  coach_id uuid NOT NULL,
  athlete_id uuid NOT NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  CONSTRAINT coach_athlete_assignments_coach_fk FOREIGN KEY (tenant_id, coach_id) REFERENCES public.coaches (tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT coach_athlete_assignments_athlete_fk FOREIGN KEY (tenant_id, athlete_id) REFERENCES public.athletes (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  -- program_id / primary_coach_id keep PLAIN single-column FKs: a composite
  -- (tenant_id, program_id) FK with ON DELETE SET NULL would null tenant_id
  -- too, which is illegal (NOT NULL). RLS + app scoping keep them intra-tenant.
  program_id uuid REFERENCES public.programs (id) ON DELETE SET NULL,
  primary_coach_id uuid REFERENCES public.coaches (id) ON DELETE SET NULL,
  location text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  capacity integer NOT NULL DEFAULT 1,
  status public.session_status NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sessions_tenant_id_id_uq UNIQUE (tenant_id, id),
  CONSTRAINT sessions_time_ck CHECK (ends_at > starts_at),
  CONSTRAINT sessions_capacity_ck CHECK (capacity >= 1)
);

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  session_id uuid NOT NULL,
  athlete_id uuid NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'pending',
  payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookings_session_athlete_uniq UNIQUE (session_id, athlete_id),
  CONSTRAINT bookings_session_fk FOREIGN KEY (tenant_id, session_id) REFERENCES public.sessions (tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT bookings_athlete_fk FOREIGN KEY (tenant_id, athlete_id) REFERENCES public.athletes (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE public.cap_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  athlete_id uuid NOT NULL,
  author_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  body text NOT NULL,
  note_week_start date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cap_notes_athlete_fk FOREIGN KEY (tenant_id, athlete_id) REFERENCES public.athletes (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE public.compliance_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  athlete_id uuid NOT NULL,
  evaluation_kind public.compliance_evaluation_kind NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  is_compliant boolean NOT NULL,
  details jsonb,
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT compliance_evaluations_period_ck CHECK (period_end >= period_start),
  CONSTRAINT compliance_evaluations_athlete_fk FOREIGN KEY (tenant_id, athlete_id) REFERENCES public.athletes (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE public.billing_accounts (
  athlete_id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  balance_cents bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_accounts_athlete_fk FOREIGN KEY (tenant_id, athlete_id) REFERENCES public.athletes (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE public.injury_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  athlete_id uuid NOT NULL,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_by_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  CONSTRAINT injury_flags_athlete_fk FOREIGN KEY (tenant_id, athlete_id) REFERENCES public.athletes (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE public.message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  title text,
  created_by_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_threads_tenant_id_id_uq UNIQUE (tenant_id, id)
);

CREATE TABLE public.thread_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  thread_id uuid NOT NULL,
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT thread_participants_uniq UNIQUE (thread_id, profile_id),
  CONSTRAINT thread_participants_thread_fk FOREIGN KEY (tenant_id, thread_id) REFERENCES public.message_threads (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id),
  thread_id uuid NOT NULL,
  sender_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  CONSTRAINT messages_thread_fk FOREIGN KEY (tenant_id, thread_id) REFERENCES public.message_threads (tenant_id, id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Indexes (dashboards + hot paths; tenant_id leads wherever the table has it)
-- ---------------------------------------------------------------------------

-- Plain profile_id indexes (not tenant-led): helper functions and the profiles
-- RLS policy look up athletes/coaches by profile_id alone, across tenants.
CREATE INDEX athletes_profile_id_idx ON public.athletes (profile_id);

CREATE INDEX athletes_injury_flag_partial_idx ON public.athletes (tenant_id, id)
WHERE
  injury_flag = true;

CREATE INDEX coaches_profile_id_idx ON public.coaches (profile_id);

CREATE INDEX memberships_athlete_id_idx ON public.memberships (tenant_id, athlete_id);

CREATE INDEX memberships_status_idx ON public.memberships (tenant_id, status)
WHERE
  status = 'active';

CREATE INDEX athlete_program_assignments_athlete_idx ON public.athlete_program_assignments (tenant_id, athlete_id);

CREATE INDEX coach_athlete_assignments_coach_athlete_active_partial_idx ON public.coach_athlete_assignments (tenant_id, coach_id, athlete_id)
WHERE
  valid_to IS NULL;

CREATE INDEX sessions_starts_at_idx ON public.sessions (tenant_id, starts_at);

CREATE INDEX sessions_program_starts_idx ON public.sessions (tenant_id, program_id, starts_at);

CREATE INDEX sessions_coach_starts_idx ON public.sessions (tenant_id, primary_coach_id, starts_at);

CREATE INDEX bookings_athlete_created_idx ON public.bookings (tenant_id, athlete_id, created_at DESC);

CREATE INDEX bookings_session_id_idx ON public.bookings (tenant_id, session_id);

CREATE INDEX bookings_payment_status_idx ON public.bookings (tenant_id, payment_status);

CREATE INDEX bookings_athlete_confirmed_partial_idx ON public.bookings (tenant_id, athlete_id, session_id)
WHERE
  status = 'confirmed';

CREATE INDEX cap_notes_athlete_week_idx ON public.cap_notes (tenant_id, athlete_id, note_week_start);

CREATE INDEX cap_notes_athlete_created_idx ON public.cap_notes (tenant_id, athlete_id, created_at DESC);

CREATE INDEX compliance_evaluations_athlete_kind_period_idx ON public.compliance_evaluations (tenant_id, athlete_id, evaluation_kind, period_start);

CREATE INDEX compliance_evaluations_noncompliant_partial_idx ON public.compliance_evaluations (tenant_id, athlete_id, evaluation_kind)
WHERE
  is_compliant = false;

CREATE INDEX thread_participants_thread_idx ON public.thread_participants (tenant_id, thread_id);

CREATE INDEX thread_participants_profile_idx ON public.thread_participants (tenant_id, profile_id);

CREATE INDEX messages_thread_created_idx ON public.messages (tenant_id, thread_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- updated_at triggers (public.set_updated_at() exists — platform migration)
-- ---------------------------------------------------------------------------

CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER athletes_set_updated_at
BEFORE UPDATE ON public.athletes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER coaches_set_updated_at
BEFORE UPDATE ON public.coaches
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER membership_plans_set_updated_at
BEFORE UPDATE ON public.membership_plans
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER memberships_set_updated_at
BEFORE UPDATE ON public.memberships
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER programs_set_updated_at
BEFORE UPDATE ON public.programs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER sessions_set_updated_at
BEFORE UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER bookings_set_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER billing_accounts_set_updated_at
BEFORE UPDATE ON public.billing_accounts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Security helper functions (RLS + validation)
-- Composite FKs guarantee the athlete/session/thread graphs are intra-tenant,
-- so these helpers can keep keying on ids alone.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.profile_owns_athlete(p_athlete_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.athletes a
    WHERE a.id = p_athlete_id
      AND a.profile_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.profile_owns_athlete (uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.profile_owns_athlete (uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_assigned_coach_for_athlete(p_athlete_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.coach_athlete_assignments caa
    JOIN public.coaches c ON c.id = caa.coach_id
    WHERE caa.athlete_id = p_athlete_id
      AND c.profile_id = auth.uid()
      AND caa.valid_from <= now()
      AND (caa.valid_to IS NULL OR caa.valid_to > now())
  );
$$;

REVOKE ALL ON FUNCTION public.is_assigned_coach_for_athlete (uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_assigned_coach_for_athlete (uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_thread_participant(p_thread_id uuid, p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.thread_participants tp
    WHERE tp.thread_id = p_thread_id
      AND tp.profile_id = p_profile_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_thread_participant (uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_thread_participant (uuid, uuid) TO authenticated, service_role;

-- Unknown DOB is treated as NOT a minor (see product note in plan).
CREATE OR REPLACE FUNCTION public.profile_is_minor(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.id = p_profile_id
      AND pr.date_of_birth IS NOT NULL
      AND pr.date_of_birth > (CURRENT_DATE - INTERVAL '18 years')
  );
$$;

REVOKE ALL ON FUNCTION public.profile_is_minor (uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.profile_is_minor (uuid) TO authenticated, service_role;

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
      RAISE EXCEPTION 'rule_of_two_violation'
        USING MESSAGE = 'Threads including a minor must include at least two adults.';
    END IF;

    IF v_total = 2 AND v_minors = 1 AND v_adults = 1 THEN
      RAISE EXCEPTION 'rule_of_two_violation'
        USING MESSAGE = 'One-to-one adult–minor threads are not allowed.';
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_thread_rule_of_two (uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.validate_thread_rule_of_two (uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_thread_participants_rule_of_two()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  tid uuid;
BEGIN
  tid := coalesce(NEW.thread_id, OLD.thread_id);

  PERFORM public.validate_thread_rule_of_two(tid);

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_thread_participants_rule_of_two () FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.trg_thread_participants_rule_of_two () TO authenticated, service_role;

CREATE CONSTRAINT TRIGGER thread_participants_rule_of_two_deferred
AFTER INSERT
OR
UPDATE ON public.thread_participants DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION public.trg_thread_participants_rule_of_two();

CREATE CONSTRAINT TRIGGER thread_participants_rule_of_two_delete_deferred
AFTER DELETE ON public.thread_participants DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION public.trg_thread_participants_rule_of_two();

CREATE OR REPLACE FUNCTION public.trg_messages_sender_must_be_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_thread_participant(NEW.thread_id, NEW.sender_profile_id) THEN
    RAISE EXCEPTION 'messages_sender_not_in_thread'
      USING MESSAGE = 'Sender must be a participant in the thread.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_messages_sender_must_be_participant () FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.trg_messages_sender_must_be_participant () TO authenticated, service_role;

CREATE TRIGGER messages_sender_and_rule_of_two
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.trg_messages_sender_must_be_participant();

CREATE OR REPLACE FUNCTION public.booking_frequency_ok_for_confirm(
  p_athlete_id uuid,
  p_session_id uuid,
  p_booking_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  m RECORD;
  v_session_start timestamptz;
  v_window_start timestamptz;
  v_count integer;
BEGIN
  SELECT s.starts_at
  INTO v_session_start
  FROM public.sessions s
  WHERE s.id = p_session_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT
    mbr.*,
    mp.membership_frequency,
    mp.sessions_allowed_per_period,
    mp.period_days
  INTO m
  FROM public.memberships mbr
  JOIN public.membership_plans mp ON mp.id = mbr.plan_id
  WHERE mbr.athlete_id = p_athlete_id
    AND mbr.status = 'active'
    AND mbr.valid_from <= v_session_start
    AND (mbr.valid_to IS NULL OR mbr.valid_to >= v_session_start)
    AND mbr.payment_status IN ('authorized', 'paid', 'waived')
  ORDER BY mbr.valid_from DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF m.membership_frequency = 'unlimited' THEN
    RETURN true;
  END IF;

  IF m.sessions_allowed_per_period IS NULL
  OR m.period_days IS NULL
  OR m.period_days <= 0 THEN
    RETURN false;
  END IF;

  v_window_start := v_session_start - (m.period_days::text || ' days')::interval;

  IF m.valid_from > v_window_start THEN
    v_window_start := m.valid_from;
  END IF;

  SELECT COUNT(*)::integer
  INTO v_count
  FROM public.bookings b
  JOIN public.sessions s ON s.id = b.session_id
  WHERE b.athlete_id = p_athlete_id
    AND b.status = 'confirmed'
    AND s.starts_at >= v_window_start
    AND s.starts_at <= v_session_start
    AND b.id IS DISTINCT FROM p_booking_id;

  RETURN v_count < m.sessions_allowed_per_period;
END;
$$;

REVOKE ALL ON FUNCTION public.booking_frequency_ok_for_confirm (uuid, uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.booking_frequency_ok_for_confirm (uuid, uuid, uuid) TO authenticated, service_role;

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
      RAISE EXCEPTION 'booking_payment_required'
        USING MESSAGE = 'Booking cannot be confirmed until payment_status is paid, authorized, or waived.';
    END IF;

    IF NOT public.booking_frequency_ok_for_confirm(NEW.athlete_id, NEW.session_id, NEW.id) THEN
      RAISE EXCEPTION 'booking_membership_limit'
        USING MESSAGE = 'Booking exceeds active membership frequency or membership is not in good standing.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_bookings_membership_and_payment () FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.trg_bookings_membership_and_payment () TO authenticated, service_role;

CREATE TRIGGER bookings_membership_and_payment
BEFORE INSERT
OR
UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.trg_bookings_membership_and_payment();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Mechanical transform of the MVP policies:
--   * has_global_staff_access()  ->  tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
--   * every predicate gains a leading tenant-membership gate, except policies
--     that are already only the staff check
--   * USING (true) SELECTs become the tenant-membership gate
--   * auth.uid() -> (SELECT auth.uid())
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.athlete_program_assignments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.coach_athlete_assignments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cap_notes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.compliance_evaluations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.billing_accounts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.injury_flags ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.thread_participants ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- profiles (GLOBAL: own row, staff of a shared tenant, or assigned coach)
CREATE POLICY profiles_select ON public.profiles
FOR SELECT TO authenticated
USING (
  id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.user_id = profiles.id
      AND tm.tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
  )
  OR EXISTS (
    SELECT 1
    FROM public.athletes ath
    WHERE ath.profile_id = profiles.id
      AND public.is_assigned_coach_for_athlete(ath.id)
  )
);

CREATE POLICY profiles_insert_own ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY profiles_update ON public.profiles
FOR UPDATE TO authenticated
USING (
  id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.user_id = profiles.id
      AND tm.tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
  )
)
WITH CHECK (
  id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.user_id = profiles.id
      AND tm.tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
  )
);

-- athletes
CREATE POLICY athletes_select ON public.athletes
FOR SELECT TO authenticated
USING (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    profile_id = (SELECT auth.uid())
    OR public.is_assigned_coach_for_athlete(id)
    OR tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
  )
);

CREATE POLICY athletes_insert_staff ON public.athletes
FOR INSERT TO authenticated
WITH CHECK (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]));

CREATE POLICY athletes_update ON public.athletes
FOR UPDATE TO authenticated
USING (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    profile_id = (SELECT auth.uid())
    OR public.is_assigned_coach_for_athlete(id)
    OR tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
  )
)
WITH CHECK (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    profile_id = (SELECT auth.uid())
    OR public.is_assigned_coach_for_athlete(id)
    OR tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
  )
);

CREATE POLICY athletes_delete_staff ON public.athletes
FOR DELETE TO authenticated
USING (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]));

-- coaches
CREATE POLICY coaches_select ON public.coaches
FOR SELECT TO authenticated
USING (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    profile_id = (SELECT auth.uid())
    OR tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
  )
);

CREATE POLICY coaches_write_staff ON public.coaches
FOR ALL TO authenticated
USING (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]))
WITH CHECK (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]));

-- membership_plans
CREATE POLICY membership_plans_select ON public.membership_plans
FOR SELECT TO authenticated
USING (tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[]));

CREATE POLICY membership_plans_write_staff ON public.membership_plans
FOR ALL TO authenticated
USING (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]))
WITH CHECK (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]));

-- memberships
CREATE POLICY memberships_select ON public.memberships
FOR SELECT TO authenticated
USING (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    public.profile_owns_athlete(athlete_id)
    OR public.is_assigned_coach_for_athlete(athlete_id)
    OR tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
  )
);

CREATE POLICY memberships_write_staff ON public.memberships
FOR ALL TO authenticated
USING (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]))
WITH CHECK (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]));

-- programs
CREATE POLICY programs_select ON public.programs
FOR SELECT TO authenticated
USING (tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[]));

CREATE POLICY programs_write_staff ON public.programs
FOR ALL TO authenticated
USING (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]))
WITH CHECK (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]));

-- athlete_program_assignments
CREATE POLICY athlete_program_assignments_select ON public.athlete_program_assignments
FOR SELECT TO authenticated
USING (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    public.profile_owns_athlete(athlete_id)
    OR public.is_assigned_coach_for_athlete(athlete_id)
    OR tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
  )
);

CREATE POLICY athlete_program_assignments_write_staff ON public.athlete_program_assignments
FOR ALL TO authenticated
USING (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]))
WITH CHECK (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]));

-- coach_athlete_assignments
CREATE POLICY coach_athlete_assignments_select ON public.coach_athlete_assignments
FOR SELECT TO authenticated
USING (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    EXISTS (
      SELECT 1
      FROM public.coaches c
      WHERE c.id = coach_athlete_assignments.coach_id
        AND c.profile_id = (SELECT auth.uid())
    )
    OR public.profile_owns_athlete(athlete_id)
    OR tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
  )
);

CREATE POLICY coach_athlete_assignments_write_staff ON public.coach_athlete_assignments
FOR ALL TO authenticated
USING (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]))
WITH CHECK (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]));

-- sessions (coach EXISTS also matches tenant: primary_coach_id is a plain FK,
-- so RLS must keep the referenced coach row in the session's tenant)
CREATE POLICY sessions_select ON public.sessions
FOR SELECT TO authenticated
USING (tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[]));

CREATE POLICY sessions_insert ON public.sessions
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
    OR EXISTS (
      SELECT 1
      FROM public.coaches c
      WHERE c.id = sessions.primary_coach_id
        AND c.tenant_id = sessions.tenant_id
        AND c.profile_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY sessions_update ON public.sessions
FOR UPDATE TO authenticated
USING (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
    OR EXISTS (
      SELECT 1
      FROM public.coaches c
      WHERE c.id = sessions.primary_coach_id
        AND c.tenant_id = sessions.tenant_id
        AND c.profile_id = (SELECT auth.uid())
    )
  )
)
WITH CHECK (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
    OR EXISTS (
      SELECT 1
      FROM public.coaches c
      WHERE c.id = sessions.primary_coach_id
        AND c.tenant_id = sessions.tenant_id
        AND c.profile_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY sessions_delete_staff ON public.sessions
FOR DELETE TO authenticated
USING (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]));

-- bookings
CREATE POLICY bookings_select ON public.bookings
FOR SELECT TO authenticated
USING (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    public.profile_owns_athlete(athlete_id)
    OR public.is_assigned_coach_for_athlete(athlete_id)
    OR tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
  )
);

CREATE POLICY bookings_insert ON public.bookings
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    public.profile_owns_athlete(athlete_id)
    OR public.is_assigned_coach_for_athlete(athlete_id)
    OR tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
  )
);

CREATE POLICY bookings_update ON public.bookings
FOR UPDATE TO authenticated
USING (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    public.profile_owns_athlete(athlete_id)
    OR public.is_assigned_coach_for_athlete(athlete_id)
    OR tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
  )
)
WITH CHECK (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    public.profile_owns_athlete(athlete_id)
    OR public.is_assigned_coach_for_athlete(athlete_id)
    OR tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
  )
);

CREATE POLICY bookings_delete_staff ON public.bookings
FOR DELETE TO authenticated
USING (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]));

-- cap_notes
CREATE POLICY cap_notes_select ON public.cap_notes
FOR SELECT TO authenticated
USING (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    public.profile_owns_athlete(athlete_id)
    OR author_profile_id = (SELECT auth.uid())
    OR public.is_assigned_coach_for_athlete(athlete_id)
    OR tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
  )
);

CREATE POLICY cap_notes_insert ON public.cap_notes
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    (
      public.is_assigned_coach_for_athlete(athlete_id)
      OR tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
    )
    AND author_profile_id = (SELECT auth.uid())
  )
);

CREATE POLICY cap_notes_update ON public.cap_notes
FOR UPDATE TO authenticated
USING (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    author_profile_id = (SELECT auth.uid())
    OR tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
  )
)
WITH CHECK (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    author_profile_id = (SELECT auth.uid())
    OR tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
  )
);

CREATE POLICY cap_notes_delete_staff ON public.cap_notes
FOR DELETE TO authenticated
USING (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]));

-- compliance_evaluations
CREATE POLICY compliance_evaluations_select ON public.compliance_evaluations
FOR SELECT TO authenticated
USING (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    public.profile_owns_athlete(athlete_id)
    OR public.is_assigned_coach_for_athlete(athlete_id)
    OR tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
  )
);

CREATE POLICY compliance_evaluations_write_staff ON public.compliance_evaluations
FOR ALL TO authenticated
USING (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]))
WITH CHECK (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]));

-- billing_accounts
CREATE POLICY billing_accounts_select ON public.billing_accounts
FOR SELECT TO authenticated
USING (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    public.profile_owns_athlete(athlete_id)
    OR public.is_assigned_coach_for_athlete(athlete_id)
    OR tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
  )
);

CREATE POLICY billing_accounts_write_staff ON public.billing_accounts
FOR ALL TO authenticated
USING (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]))
WITH CHECK (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]));

-- injury_flags
CREATE POLICY injury_flags_select ON public.injury_flags
FOR SELECT TO authenticated
USING (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    public.profile_owns_athlete(athlete_id)
    OR public.is_assigned_coach_for_athlete(athlete_id)
    OR tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
  )
);

CREATE POLICY injury_flags_write ON public.injury_flags
FOR ALL TO authenticated
USING (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    public.is_assigned_coach_for_athlete(athlete_id)
    OR tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
  )
)
WITH CHECK (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    public.is_assigned_coach_for_athlete(athlete_id)
    OR tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[])
  )
);

-- message_threads (participant-only reads; staff moderation uses service_role)
CREATE POLICY message_threads_select ON public.message_threads
FOR SELECT TO authenticated
USING (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    created_by_profile_id = (SELECT auth.uid())
    OR public.is_thread_participant(id, (SELECT auth.uid()))
  )
);

CREATE POLICY message_threads_insert ON public.message_threads
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND created_by_profile_id = (SELECT auth.uid())
);

CREATE POLICY message_threads_update_creator ON public.message_threads
FOR UPDATE TO authenticated
USING (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND created_by_profile_id = (SELECT auth.uid())
)
WITH CHECK (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND created_by_profile_id = (SELECT auth.uid())
);

CREATE POLICY message_threads_delete_staff ON public.message_threads
FOR DELETE TO authenticated
USING (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]));

-- thread_participants
CREATE POLICY thread_participants_select ON public.thread_participants
FOR SELECT TO authenticated
USING (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND public.is_thread_participant(thread_id, (SELECT auth.uid()))
);

CREATE POLICY thread_participants_insert ON public.thread_participants
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    profile_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.message_threads t
      WHERE t.id = thread_participants.thread_id
        AND t.created_by_profile_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY thread_participants_update ON public.thread_participants
FOR UPDATE TO authenticated
USING (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND EXISTS (
    SELECT 1
    FROM public.message_threads t
    WHERE t.id = thread_participants.thread_id
      AND t.created_by_profile_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND EXISTS (
    SELECT 1
    FROM public.message_threads t
    WHERE t.id = thread_participants.thread_id
      AND t.created_by_profile_id = (SELECT auth.uid())
  )
);

CREATE POLICY thread_participants_delete ON public.thread_participants
FOR DELETE TO authenticated
USING (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    profile_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.message_threads t
      WHERE t.id = thread_participants.thread_id
        AND t.created_by_profile_id = (SELECT auth.uid())
    )
  )
);

-- messages
CREATE POLICY messages_select ON public.messages
FOR SELECT TO authenticated
USING (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND public.is_thread_participant(thread_id, (SELECT auth.uid()))
);

CREATE POLICY messages_insert ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND (
    sender_profile_id = (SELECT auth.uid())
    AND public.is_thread_participant(thread_id, (SELECT auth.uid()))
  )
);

CREATE POLICY messages_update_own ON public.messages
FOR UPDATE TO authenticated
USING (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND sender_profile_id = (SELECT auth.uid())
)
WITH CHECK (
  tenant_id = ANY ((SELECT public.member_tenant_ids())::uuid[])
  AND sender_profile_id = (SELECT auth.uid())
);

CREATE POLICY messages_delete_staff ON public.messages
FOR DELETE TO authenticated
USING (tenant_id = ANY ((SELECT public.staff_tenant_ids())::uuid[]));

-- ---------------------------------------------------------------------------
-- Atomic thread + participants RPC (deferred Rule-of-Two constraint triggers)
-- SECURITY INVOKER: RLS applies as the authenticated user.
-- ---------------------------------------------------------------------------

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
    RAISE EXCEPTION 'not_authenticated'
      USING MESSAGE = 'You must be signed in to create a thread.';
  END IF;

  IF p_participant_profile_ids IS NULL OR cardinality(p_participant_profile_ids) = 0 THEN
    RAISE EXCEPTION 'no_participants'
      USING MESSAGE = 'At least one participant is required.';
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

REVOKE ALL ON FUNCTION public.create_message_thread_with_participants (uuid, text, uuid[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_message_thread_with_participants (uuid, text, uuid[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- Grants (default privileges are revoked platform-wide; RLS filters rows)
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.athletes TO authenticated;

GRANT ALL ON public.athletes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaches TO authenticated;

GRANT ALL ON public.coaches TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.membership_plans TO authenticated;

GRANT ALL ON public.membership_plans TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.memberships TO authenticated;

GRANT ALL ON public.memberships TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.programs TO authenticated;

GRANT ALL ON public.programs TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.athlete_program_assignments TO authenticated;

GRANT ALL ON public.athlete_program_assignments TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_athlete_assignments TO authenticated;

GRANT ALL ON public.coach_athlete_assignments TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;

GRANT ALL ON public.sessions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;

GRANT ALL ON public.bookings TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_notes TO authenticated;

GRANT ALL ON public.cap_notes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_evaluations TO authenticated;

GRANT ALL ON public.compliance_evaluations TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_accounts TO authenticated;

GRANT ALL ON public.billing_accounts TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.injury_flags TO authenticated;

GRANT ALL ON public.injury_flags TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_threads TO authenticated;

GRANT ALL ON public.message_threads TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.thread_participants TO authenticated;

GRANT ALL ON public.thread_participants TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;

GRANT ALL ON public.messages TO service_role;

-- ---------------------------------------------------------------------------
-- Summary (for review)
--   Enums:     6  (membership_frequency, payment_status, membership_status,
--                  booking_status, session_status, compliance_evaluation_kind)
--   Tables:    17 (profiles global; 16 tenant-scoped with tenant_id)
--   Indexes:   21 explicit CREATE INDEX (plus implicit unique-constraint
--                  indexes: 6x (tenant_id, id), 2x (tenant_id, profile_id),
--                  bookings_session_athlete_uniq, thread_participants_uniq)
--   Functions: 10 (profile_owns_athlete, is_assigned_coach_for_athlete,
--                  is_thread_participant, profile_is_minor,
--                  validate_thread_rule_of_two,
--                  trg_thread_participants_rule_of_two,
--                  trg_messages_sender_must_be_participant,
--                  booking_frequency_ok_for_confirm,
--                  trg_bookings_membership_and_payment,
--                  create_message_thread_with_participants)
--   Triggers:  13 (9 updated_at, 2 deferred rule-of-two on thread_participants,
--                  messages sender check, bookings membership/payment)
--   Policies:  49 across 17 RLS-enabled tables
--                  (profiles 3, athletes 4, coaches 2, membership_plans 2,
--                   memberships 2, programs 2, athlete_program_assignments 2,
--                   coach_athlete_assignments 2, sessions 4, bookings 4,
--                   cap_notes 4, compliance_evaluations 2, billing_accounts 2,
--                   injury_flags 2, message_threads 4, thread_participants 4,
--                   messages 4)
-- ---------------------------------------------------------------------------
