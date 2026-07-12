-- Atomic thread + participants for deferred Rule-of-Two constraint triggers.
-- SECURITY INVOKER: RLS applies as the authenticated user.

CREATE OR REPLACE FUNCTION public.create_message_thread_with_participants(
  p_title text,
  p_participant_profile_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tid uuid;
  v_pid uuid;
BEGIN
  IF auth.uid () IS NULL THEN
    RAISE EXCEPTION 'not_authenticated'
      USING MESSAGE = 'You must be signed in to create a thread.';
  END IF;

  IF p_participant_profile_ids IS NULL OR cardinality(p_participant_profile_ids) = 0 THEN
    RAISE EXCEPTION 'no_participants'
      USING MESSAGE = 'At least one participant is required.';
  END IF;

  INSERT INTO public.message_threads (title, created_by_profile_id)
  VALUES (p_title, auth.uid ())
  RETURNING
    id INTO v_tid;

  FOR v_pid IN
  SELECT DISTINCT
    u
  FROM
    unnest(p_participant_profile_ids) AS u
  LOOP
    INSERT INTO public.thread_participants (thread_id, profile_id)
    VALUES (v_tid, v_pid);
  END LOOP;

  RETURN v_tid;
END;
$$;

REVOKE ALL ON FUNCTION public.create_message_thread_with_participants (text, uuid[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_message_thread_with_participants (text, uuid[]) TO authenticated;
