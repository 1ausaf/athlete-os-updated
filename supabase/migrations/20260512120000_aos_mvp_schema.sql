-- AOS MVP: core schema, indexes, RLS, Safe Sport Rule-of-Two, booking limits
-- Requires: Supabase (auth.users). Uses gen_random_uuid() (PG 13+).

-- ---------------------------------------------------------------------------
-- ENUM types
-- ---------------------------------------------------------------------------

CREATE TYPE public.user_role AS ENUM ('athlete', 'coach', 'admin', 'owner');

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

CREATE TABLE public.user_roles (
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  PRIMARY KEY (profile_id, role)
);

CREATE TABLE public.athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles (id) ON DELETE CASCADE,
  injury_flag boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  name text NOT NULL,
  description text,
  membership_frequency public.membership_frequency NOT NULL,
  sessions_allowed_per_period integer,
  period_days integer,
  price_cents integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now (),
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
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  athlete_id uuid NOT NULL REFERENCES public.athletes (id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.membership_plans (id) ON DELETE RESTRICT,
  status public.membership_status NOT NULL DEFAULT 'active',
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now ()
);

CREATE TABLE public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now ()
);

CREATE TABLE public.athlete_program_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  athlete_id uuid NOT NULL REFERENCES public.athletes (id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.programs (id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  unassigned_at timestamptz
);

CREATE TABLE public.coach_athlete_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  coach_id uuid NOT NULL REFERENCES public.coaches (id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES public.athletes (id) ON DELETE CASCADE,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz
);

CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  program_id uuid REFERENCES public.programs (id) ON DELETE SET NULL,
  primary_coach_id uuid REFERENCES public.coaches (id) ON DELETE SET NULL,
  location text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  capacity integer NOT NULL DEFAULT 1,
  status public.session_status NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now (),
  CONSTRAINT sessions_time_ck CHECK (ends_at > starts_at),
  CONSTRAINT sessions_capacity_ck CHECK (capacity >= 1)
);

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  session_id uuid NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES public.athletes (id) ON DELETE CASCADE,
  status public.booking_status NOT NULL DEFAULT 'pending',
  payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now (),
  CONSTRAINT bookings_session_athlete_uniq UNIQUE (session_id, athlete_id)
);

CREATE TABLE public.cap_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  athlete_id uuid NOT NULL REFERENCES public.athletes (id) ON DELETE CASCADE,
  author_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  body text NOT NULL,
  note_week_start date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.compliance_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  athlete_id uuid NOT NULL REFERENCES public.athletes (id) ON DELETE CASCADE,
  evaluation_kind public.compliance_evaluation_kind NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  is_compliant boolean NOT NULL,
  details jsonb,
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT compliance_evaluations_period_ck CHECK (period_end >= period_start)
);

CREATE TABLE public.billing_accounts (
  athlete_id uuid PRIMARY KEY REFERENCES public.athletes (id) ON DELETE CASCADE,
  balance_cents bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.injury_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  athlete_id uuid NOT NULL REFERENCES public.athletes (id) ON DELETE CASCADE,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_by_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL
);

CREATE TABLE public.message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  title text,
  created_by_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.thread_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  thread_id uuid NOT NULL REFERENCES public.message_threads (id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT thread_participants_uniq UNIQUE (thread_id, profile_id)
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  thread_id uuid NOT NULL REFERENCES public.message_threads (id) ON DELETE CASCADE,
  sender_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Indexes (dashboards + hot paths)
-- ---------------------------------------------------------------------------

CREATE INDEX athletes_profile_id_idx ON public.athletes (profile_id);

CREATE INDEX athletes_injury_flag_partial_idx ON public.athletes (id)
WHERE
  injury_flag = true;

CREATE INDEX coaches_profile_id_idx ON public.coaches (profile_id);

CREATE INDEX memberships_athlete_id_idx ON public.memberships (athlete_id);

CREATE INDEX memberships_status_idx ON public.memberships (status)
WHERE
  status = 'active';

CREATE INDEX athlete_program_assignments_athlete_idx ON public.athlete_program_assignments (athlete_id);

CREATE INDEX coach_athlete_assignments_coach_athlete_active_partial_idx ON public.coach_athlete_assignments (coach_id, athlete_id)
WHERE
  valid_to IS NULL;

CREATE INDEX sessions_starts_at_idx ON public.sessions (starts_at);

CREATE INDEX sessions_program_starts_idx ON public.sessions (program_id, starts_at);

CREATE INDEX sessions_coach_starts_idx ON public.sessions (primary_coach_id, starts_at);

CREATE INDEX bookings_athlete_created_idx ON public.bookings (athlete_id, created_at DESC);

CREATE INDEX bookings_session_id_idx ON public.bookings (session_id);

CREATE INDEX bookings_payment_status_idx ON public.bookings (payment_status);

CREATE INDEX bookings_athlete_confirmed_partial_idx ON public.bookings (athlete_id, session_id)
WHERE
  status = 'confirmed';

CREATE INDEX cap_notes_athlete_week_idx ON public.cap_notes (athlete_id, note_week_start);

CREATE INDEX cap_notes_athlete_created_idx ON public.cap_notes (athlete_id, created_at DESC);

CREATE INDEX compliance_evaluations_athlete_kind_period_idx ON public.compliance_evaluations (athlete_id, evaluation_kind, period_start);

CREATE INDEX compliance_evaluations_noncompliant_partial_idx ON public.compliance_evaluations (athlete_id, evaluation_kind)
WHERE
  is_compliant = false;

CREATE INDEX thread_participants_thread_idx ON public.thread_participants (thread_id);

CREATE INDEX thread_participants_profile_idx ON public.thread_participants (profile_id);

CREATE INDEX messages_thread_created_idx ON public.messages (thread_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- updated_at helper + triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

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
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.jwt_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT
  auth.uid ();

$$;

CREATE OR REPLACE FUNCTION public.has_global_staff_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT
  EXISTS (
    SELECT
      1
    FROM
      public.user_roles ur
    WHERE
      ur.profile_id = auth.uid ()
      AND ur.role IN ('admin', 'owner')
  );

$$;

CREATE OR REPLACE FUNCTION public.profile_owns_athlete(p_athlete_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT
  EXISTS (
    SELECT
      1
    FROM
      public.athletes a
    WHERE
      a.id = p_athlete_id
      AND a.profile_id = auth.uid ()
  );

$$;

CREATE OR REPLACE FUNCTION public.is_assigned_coach_for_athlete(p_athlete_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT
  EXISTS (
    SELECT
      1
    FROM
      public.coach_athlete_assignments caa
      JOIN public.coaches c ON c.id = caa.coach_id
    WHERE
      caa.athlete_id = p_athlete_id
      AND c.profile_id = auth.uid ()
      AND caa.valid_from <= now()
      AND (caa.valid_to IS NULL OR caa.valid_to > now())
  );

$$;

CREATE OR REPLACE FUNCTION public.is_thread_participant(p_thread_id uuid, p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT
  EXISTS (
    SELECT
      1
    FROM
      public.thread_participants tp
    WHERE
      tp.thread_id = p_thread_id
      AND tp.profile_id = p_profile_id
  );

$$;

-- Unknown DOB is treated as NOT a minor (see product note in plan).
CREATE OR REPLACE FUNCTION public.profile_is_minor(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT
  EXISTS (
    SELECT
      1
    FROM
      public.profiles pr
    WHERE
      pr.id = p_profile_id
      AND pr.date_of_birth IS NOT NULL
      AND pr.date_of_birth > (CURRENT_DATE - INTERVAL '18 years')
  );

$$;

CREATE OR REPLACE FUNCTION public.validate_thread_rule_of_two(p_thread_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_minors integer;

  v_adults integer;

  v_total integer;
BEGIN
  SELECT
    COUNT(*) FILTER (
      WHERE
        public.profile_is_minor (tp.profile_id)
    ),
    COUNT(*) FILTER (
      WHERE
        NOT public.profile_is_minor (tp.profile_id)
    ),
    COUNT(*) INTO v_minors,
    v_adults,
    v_total
  FROM
    public.thread_participants tp
  WHERE
    tp.thread_id = p_thread_id;

  IF v_total = 0 THEN
    RETURN;
  END IF;

  IF v_minors >= 1 THEN
    IF v_adults < 2 THEN
      RAISE EXCEPTION 'rule_of_two_violation'
        USING MESSAGE = 'Threads including a minor must include at least two adults.';
    END IF;

    IF v_total = 2
    AND v_minors = 1
    AND v_adults = 1 THEN
      RAISE EXCEPTION 'rule_of_two_violation'
        USING MESSAGE = 'One-to-one adult–minor threads are not allowed.';
    END IF;
  END IF;
END;

$$;

CREATE OR REPLACE FUNCTION public.trg_thread_participants_rule_of_two()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tid uuid;
BEGIN
  tid := coalesce(NEW.thread_id, OLD.thread_id);

  PERFORM public.validate_thread_rule_of_two (tid);

  RETURN NULL;
END;

$$;

CREATE CONSTRAINT TRIGGER thread_participants_rule_of_two_deferred
AFTER INSERT
OR
UPDATE ON public.thread_participants DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION public.trg_thread_participants_rule_of_two ();

CREATE CONSTRAINT TRIGGER thread_participants_rule_of_two_delete_deferred
AFTER DELETE ON public.thread_participants DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION public.trg_thread_participants_rule_of_two ();

CREATE OR REPLACE FUNCTION public.trg_messages_sender_must_be_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_thread_participant (NEW.thread_id, NEW.sender_profile_id) THEN
    RAISE EXCEPTION 'messages_sender_not_in_thread'
      USING MESSAGE = 'Sender must be a participant in the thread.';
  END IF;

  RETURN NEW;
END;

$$;

CREATE TRIGGER messages_sender_and_rule_of_two
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.trg_messages_sender_must_be_participant ();

CREATE OR REPLACE FUNCTION public.booking_frequency_ok_for_confirm(
  p_athlete_id uuid,
  p_session_id uuid,
  p_booking_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m RECORD;

  v_session_start timestamptz;

  v_window_start timestamptz;

  v_count integer;
BEGIN
  SELECT
    s.starts_at INTO v_session_start
  FROM
    public.sessions s
  WHERE
    s.id = p_session_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT
    mbr.*,
    mp.membership_frequency,
    mp.sessions_allowed_per_period,
    mp.period_days INTO m
  FROM
    public.memberships mbr
    JOIN public.membership_plans mp ON mp.id = mbr.plan_id
  WHERE
    mbr.athlete_id = p_athlete_id
    AND mbr.status = 'active'
    AND mbr.valid_from <= v_session_start
    AND (mbr.valid_to IS NULL OR mbr.valid_to >= v_session_start)
    AND mbr.payment_status IN ('authorized', 'paid', 'waived')
  ORDER BY
    mbr.valid_from DESC
  LIMIT
    1;

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

  SELECT
    COUNT(*)::integer INTO v_count
  FROM
    public.bookings b
    JOIN public.sessions s ON s.id = b.session_id
  WHERE
    b.athlete_id = p_athlete_id
    AND b.status = 'confirmed'
    AND s.starts_at >= v_window_start
    AND s.starts_at <= v_session_start
    AND b.id IS DISTINCT FROM p_booking_id;

  RETURN v_count < m.sessions_allowed_per_period;
END;

$$;

CREATE OR REPLACE FUNCTION public.trg_bookings_membership_and_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

    IF NOT public.booking_frequency_ok_for_confirm (NEW.athlete_id, NEW.session_id, NEW.id) THEN
      RAISE EXCEPTION 'booking_membership_limit'
        USING MESSAGE = 'Booking exceeds active membership frequency or membership is not in good standing.';
    END IF;
  END IF;

  RETURN NEW;
END;

$$;

CREATE TRIGGER bookings_membership_and_payment
BEFORE INSERT
OR
UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.trg_bookings_membership_and_payment ();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

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

-- profiles
CREATE POLICY profiles_select ON public.profiles FOR
SELECT
  TO authenticated USING (
    id = auth.uid ()
    OR public.has_global_staff_access ()
    OR EXISTS (
      SELECT
        1
      FROM
        public.athletes ath
      WHERE
        ath.profile_id = profiles.id
        AND public.is_assigned_coach_for_athlete (ath.id)
    )
  );

CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated
WITH
  CHECK (id = auth.uid ());

CREATE POLICY profiles_update ON public.profiles
FOR UPDATE
  TO authenticated USING (
    id = auth.uid ()
    OR public.has_global_staff_access ()
  )
WITH
  CHECK (
    id = auth.uid ()
    OR public.has_global_staff_access ()
  );

-- user_roles
CREATE POLICY user_roles_select ON public.user_roles FOR
SELECT
  TO authenticated USING (
    profile_id = auth.uid ()
    OR public.has_global_staff_access ()
  );

CREATE POLICY user_roles_write_staff ON public.user_roles FOR ALL TO authenticated USING (public.has_global_staff_access ())
WITH
  CHECK (public.has_global_staff_access ());

-- athletes
CREATE POLICY athletes_select ON public.athletes FOR
SELECT
  TO authenticated USING (
    profile_id = auth.uid ()
    OR public.is_assigned_coach_for_athlete (id)
    OR public.has_global_staff_access ()
  );

CREATE POLICY athletes_insert_staff ON public.athletes FOR INSERT TO authenticated WITH CHECK (public.has_global_staff_access ());

CREATE POLICY athletes_update ON public.athletes
FOR UPDATE
  TO authenticated USING (
    profile_id = auth.uid ()
    OR public.is_assigned_coach_for_athlete (id)
    OR public.has_global_staff_access ()
  )
WITH
  CHECK (
    profile_id = auth.uid ()
    OR public.is_assigned_coach_for_athlete (id)
    OR public.has_global_staff_access ()
  );

CREATE POLICY athletes_delete_staff ON public.athletes FOR DELETE TO authenticated USING (public.has_global_staff_access ());

-- coaches
CREATE POLICY coaches_select ON public.coaches FOR
SELECT
  TO authenticated USING (
    profile_id = auth.uid ()
    OR public.has_global_staff_access ()
  );

CREATE POLICY coaches_write_staff ON public.coaches FOR ALL TO authenticated USING (public.has_global_staff_access ())
WITH
  CHECK (public.has_global_staff_access ());

-- membership_plans
CREATE POLICY membership_plans_select ON public.membership_plans FOR
SELECT
  TO authenticated USING (true);

CREATE POLICY membership_plans_write_staff ON public.membership_plans FOR ALL TO authenticated USING (public.has_global_staff_access ())
WITH
  CHECK (public.has_global_staff_access ());

-- memberships
CREATE POLICY memberships_select ON public.memberships FOR
SELECT
  TO authenticated USING (
    public.profile_owns_athlete (athlete_id)
    OR public.is_assigned_coach_for_athlete (athlete_id)
    OR public.has_global_staff_access ()
  );

CREATE POLICY memberships_write_staff ON public.memberships FOR ALL TO authenticated USING (public.has_global_staff_access ())
WITH
  CHECK (public.has_global_staff_access ());

-- programs
CREATE POLICY programs_select ON public.programs FOR
SELECT
  TO authenticated USING (true);

CREATE POLICY programs_write_staff ON public.programs FOR ALL TO authenticated USING (public.has_global_staff_access ())
WITH
  CHECK (public.has_global_staff_access ());

-- athlete_program_assignments
CREATE POLICY athlete_program_assignments_select ON public.athlete_program_assignments FOR
SELECT
  TO authenticated USING (
    public.profile_owns_athlete (athlete_id)
    OR public.is_assigned_coach_for_athlete (athlete_id)
    OR public.has_global_staff_access ()
  );

CREATE POLICY athlete_program_assignments_write_staff ON public.athlete_program_assignments FOR ALL TO authenticated USING (public.has_global_staff_access ())
WITH
  CHECK (public.has_global_staff_access ());

-- coach_athlete_assignments
CREATE POLICY coach_athlete_assignments_select ON public.coach_athlete_assignments FOR
SELECT
  TO authenticated USING (
    EXISTS (
      SELECT
        1
      FROM
        public.coaches c
      WHERE
        c.id = coach_athlete_assignments.coach_id
        AND c.profile_id = auth.uid ()
    )
    OR public.profile_owns_athlete (athlete_id)
    OR public.has_global_staff_access ()
  );

CREATE POLICY coach_athlete_assignments_write_staff ON public.coach_athlete_assignments FOR ALL TO authenticated USING (public.has_global_staff_access ())
WITH
  CHECK (public.has_global_staff_access ());

-- sessions
CREATE POLICY sessions_select ON public.sessions FOR
SELECT
  TO authenticated USING (true);

CREATE POLICY sessions_insert ON public.sessions FOR INSERT TO authenticated
WITH
  CHECK (
    public.has_global_staff_access ()
    OR EXISTS (
      SELECT
        1
      FROM
        public.coaches c
      WHERE
        c.id = sessions.primary_coach_id
        AND c.profile_id = auth.uid ()
    )
  );

CREATE POLICY sessions_update ON public.sessions
FOR UPDATE
  TO authenticated USING (
    public.has_global_staff_access ()
    OR EXISTS (
      SELECT
        1
      FROM
        public.coaches c
      WHERE
        c.id = sessions.primary_coach_id
        AND c.profile_id = auth.uid ()
    )
  )
WITH
  CHECK (
    public.has_global_staff_access ()
    OR EXISTS (
      SELECT
        1
      FROM
        public.coaches c
      WHERE
        c.id = sessions.primary_coach_id
        AND c.profile_id = auth.uid ()
    )
  );

CREATE POLICY sessions_delete_staff ON public.sessions FOR DELETE TO authenticated USING (public.has_global_staff_access ());

-- bookings
CREATE POLICY bookings_select ON public.bookings FOR
SELECT
  TO authenticated USING (
    public.profile_owns_athlete (athlete_id)
    OR public.is_assigned_coach_for_athlete (athlete_id)
    OR public.has_global_staff_access ()
  );

CREATE POLICY bookings_insert ON public.bookings FOR INSERT TO authenticated
WITH
  CHECK (
    public.profile_owns_athlete (athlete_id)
    OR public.is_assigned_coach_for_athlete (athlete_id)
    OR public.has_global_staff_access ()
  );

CREATE POLICY bookings_update ON public.bookings
FOR UPDATE
  TO authenticated USING (
    public.profile_owns_athlete (athlete_id)
    OR public.is_assigned_coach_for_athlete (athlete_id)
    OR public.has_global_staff_access ()
  )
WITH
  CHECK (
    public.profile_owns_athlete (athlete_id)
    OR public.is_assigned_coach_for_athlete (athlete_id)
    OR public.has_global_staff_access ()
  );

CREATE POLICY bookings_delete_staff ON public.bookings FOR DELETE TO authenticated USING (public.has_global_staff_access ());

-- cap_notes
CREATE POLICY cap_notes_select ON public.cap_notes FOR
SELECT
  TO authenticated USING (
    public.profile_owns_athlete (athlete_id)
    OR author_profile_id = auth.uid ()
    OR public.is_assigned_coach_for_athlete (athlete_id)
    OR public.has_global_staff_access ()
  );

CREATE POLICY cap_notes_insert ON public.cap_notes FOR INSERT TO authenticated
WITH
  CHECK (
    (
      public.is_assigned_coach_for_athlete (athlete_id)
      OR public.has_global_staff_access ()
    )
    AND author_profile_id = auth.uid ()
  );

CREATE POLICY cap_notes_update ON public.cap_notes
FOR UPDATE
  TO authenticated USING (
    author_profile_id = auth.uid ()
    OR public.has_global_staff_access ()
  )
WITH
  CHECK (
    author_profile_id = auth.uid ()
    OR public.has_global_staff_access ()
  );

CREATE POLICY cap_notes_delete_staff ON public.cap_notes FOR DELETE TO authenticated USING (public.has_global_staff_access ());

-- compliance_evaluations
CREATE POLICY compliance_evaluations_select ON public.compliance_evaluations FOR
SELECT
  TO authenticated USING (
    public.profile_owns_athlete (athlete_id)
    OR public.is_assigned_coach_for_athlete (athlete_id)
    OR public.has_global_staff_access ()
  );

CREATE POLICY compliance_evaluations_write_staff ON public.compliance_evaluations FOR ALL TO authenticated USING (public.has_global_staff_access ())
WITH
  CHECK (public.has_global_staff_access ());

-- billing_accounts
CREATE POLICY billing_accounts_select ON public.billing_accounts FOR
SELECT
  TO authenticated USING (
    public.profile_owns_athlete (athlete_id)
    OR public.is_assigned_coach_for_athlete (athlete_id)
    OR public.has_global_staff_access ()
  );

CREATE POLICY billing_accounts_write_staff ON public.billing_accounts FOR ALL TO authenticated USING (public.has_global_staff_access ())
WITH
  CHECK (public.has_global_staff_access ());

-- injury_flags
CREATE POLICY injury_flags_select ON public.injury_flags FOR
SELECT
  TO authenticated USING (
    public.profile_owns_athlete (athlete_id)
    OR public.is_assigned_coach_for_athlete (athlete_id)
    OR public.has_global_staff_access ()
  );

CREATE POLICY injury_flags_write ON public.injury_flags FOR ALL TO authenticated USING (
  public.is_assigned_coach_for_athlete (athlete_id)
  OR public.has_global_staff_access ()
)
WITH
  CHECK (
    public.is_assigned_coach_for_athlete (athlete_id)
    OR public.has_global_staff_access ()
  );

-- message_threads (participant-only reads; staff moderation uses service_role)
CREATE POLICY message_threads_select ON public.message_threads FOR
SELECT
  TO authenticated USING (
    created_by_profile_id = auth.uid ()
    OR public.is_thread_participant (id, auth.uid ())
  );

CREATE POLICY message_threads_insert ON public.message_threads FOR INSERT TO authenticated
WITH
  CHECK (created_by_profile_id = auth.uid ());

CREATE POLICY message_threads_update_creator ON public.message_threads
FOR UPDATE
  TO authenticated USING (created_by_profile_id = auth.uid ())
WITH
  CHECK (created_by_profile_id = auth.uid ());

CREATE POLICY message_threads_delete_staff ON public.message_threads FOR DELETE TO authenticated USING (public.has_global_staff_access ());

-- thread_participants
CREATE POLICY thread_participants_select ON public.thread_participants FOR
SELECT
  TO authenticated USING (public.is_thread_participant (thread_id, auth.uid ()));

CREATE POLICY thread_participants_insert ON public.thread_participants FOR INSERT TO authenticated
WITH
  CHECK (
    profile_id = auth.uid ()
    OR EXISTS (
      SELECT
        1
      FROM
        public.message_threads t
      WHERE
        t.id = thread_participants.thread_id
        AND t.created_by_profile_id = auth.uid ()
    )
  );

CREATE POLICY thread_participants_update ON public.thread_participants
FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT
        1
      FROM
        public.message_threads t
      WHERE
        t.id = thread_participants.thread_id
        AND t.created_by_profile_id = auth.uid ()
    )
  )
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.message_threads t
      WHERE
        t.id = thread_participants.thread_id
        AND t.created_by_profile_id = auth.uid ()
    )
  );

CREATE POLICY thread_participants_delete ON public.thread_participants FOR DELETE TO authenticated USING (
  profile_id = auth.uid ()
  OR EXISTS (
    SELECT
      1
    FROM
      public.message_threads t
    WHERE
      t.id = thread_participants.thread_id
      AND t.created_by_profile_id = auth.uid ()
  )
);

-- messages
CREATE POLICY messages_select ON public.messages FOR
SELECT
  TO authenticated USING (public.is_thread_participant (thread_id, auth.uid ()));

CREATE POLICY messages_insert ON public.messages FOR INSERT TO authenticated
WITH
  CHECK (
    sender_profile_id = auth.uid ()
    AND public.is_thread_participant (thread_id, auth.uid ())
  );

CREATE POLICY messages_update_own ON public.messages
FOR UPDATE
  TO authenticated USING (sender_profile_id = auth.uid ())
WITH
  CHECK (sender_profile_id = auth.uid ());

CREATE POLICY messages_delete_staff ON public.messages FOR DELETE TO authenticated USING (public.has_global_staff_access ());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO postgres;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres;

GRANT USAGE ON SCHEMA public TO anon;

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT USAGE ON SCHEMA public TO service_role;

GRANT
SELECT
,
INSERT,
UPDATE,
DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
