-- POWA security suite — run against any environment (including prod: the
-- fixture is created inside the transaction and the final RAISE rolls
-- everything back; results are smuggled out through the exception message).
--
-- Every line of TEST_RESULTS must read (OK); any (BAD) is a regression.
--
-- Covers: tenant isolation (SELECT/INSERT/UPDATE), composite-FK rejection
-- of service-role cross-tenant writes, privilege escalation via
-- tenant_members, sealed members table, audit-log append-only + scoped
-- reads, fail-closed caps without a subscription, anon surface, and the
-- Safe-Sport Rule of Two.

DO $$
DECLARE
  t_a uuid := gen_random_uuid();
  t_b uuid := gen_random_uuid();
  u_alice uuid := gen_random_uuid();  -- admin of A
  u_bob uuid := gen_random_uuid();    -- athlete of B
  ath_a uuid; ath_b uuid; sess_a uuid; sess_b uuid; thr uuid;
  n int; results text := '';
BEGIN
  -- ---------------- fixture (as postgres; never committed) ----------------
  INSERT INTO public.tenants (id, slug, name) VALUES
    (t_a, 'suite-a-' || left(t_a::text, 8), 'Suite A'),
    (t_b, 'suite-b-' || left(t_b::text, 8), 'Suite B');
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
    (u_alice,'00000000-0000-0000-0000-000000000000','authenticated','authenticated', u_alice::text || '@suite.test'),
    (u_bob,'00000000-0000-0000-0000-000000000000','authenticated','authenticated', u_bob::text || '@suite.test');
  INSERT INTO public.profiles (id, full_name, date_of_birth) VALUES
    (u_alice, 'Alice Adult', current_date - interval '30 years'),
    (u_bob, 'Bob Minor', current_date - interval '12 years');
  INSERT INTO public.tenant_subscriptions (tenant_id, plan_id, status) VALUES
    (t_a, 'pro', 'active'), (t_b, 'pro', 'active');
  INSERT INTO public.tenant_members (tenant_id, user_id, roles) VALUES
    (t_a, u_alice, '{admin}'), (t_b, u_bob, '{athlete}');
  INSERT INTO public.athletes (tenant_id, profile_id) VALUES (t_a, u_alice) RETURNING id INTO ath_a;
  INSERT INTO public.athletes (tenant_id, profile_id) VALUES (t_b, u_bob) RETURNING id INTO ath_b;
  INSERT INTO public.sessions (tenant_id, location, starts_at, ends_at) VALUES
    (t_a, 'A', now(), now() + interval '1 hour') RETURNING id INTO sess_a;
  INSERT INTO public.sessions (tenant_id, location, starts_at, ends_at) VALUES
    (t_b, 'B', now(), now() + interval '1 hour') RETURNING id INTO sess_b;
  INSERT INTO public.audit_logs (tenant_id, actor_user_id, action) VALUES
    (t_a, u_alice, 'suite_event'), (t_b, u_bob, 'suite_event');

  -- ---------------- as ALICE (admin of A) ----------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u_alice, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  SELECT count(*) INTO n FROM public.sessions;
  results := results || 'isolation_select=' || CASE WHEN n = 1 THEN '(OK)' ELSE n || '(BAD)' END;

  BEGIN
    INSERT INTO public.sessions (tenant_id, location, starts_at, ends_at) VALUES (t_b, 'x', now(), now() + interval '1 hour');
    results := results || ' isolation_insert=(BAD)';
  EXCEPTION WHEN insufficient_privilege THEN results := results || ' isolation_insert=(OK)';
  END;

  UPDATE public.sessions SET location = 'hax' WHERE tenant_id = t_b;
  GET DIAGNOSTICS n = ROW_COUNT;
  results := results || ' isolation_update=' || CASE WHEN n = 0 THEN '(OK)' ELSE n || '(BAD)' END;

  BEGIN
    INSERT INTO public.tenant_members (tenant_id, user_id, roles) VALUES (t_a, u_alice, '{owner}')
      ON CONFLICT (tenant_id, user_id) DO UPDATE SET roles = '{owner}';
    results := results || ' self_promote=(BAD)';
  EXCEPTION WHEN insufficient_privilege THEN results := results || ' self_promote=(OK)';
  END;

  BEGIN
    UPDATE public.tenant_members SET roles = '{owner}' WHERE user_id = (SELECT auth.uid());
    results := results || ' role_update=(BAD)';
  EXCEPTION WHEN insufficient_privilege THEN results := results || ' role_update=(OK)';
  END;

  BEGIN
    SELECT count(*) INTO n FROM public.members;
    results := results || ' members_sealed=(BAD)';
  EXCEPTION WHEN insufficient_privilege THEN results := results || ' members_sealed=(OK)';
  END;

  SELECT count(*) INTO n FROM public.audit_logs;
  results := results || ' audit_scoped=' || CASE WHEN n = 1 THEN '(OK)' ELSE n || '(BAD)' END;
  BEGIN
    UPDATE public.audit_logs SET action = 'tampered' WHERE tenant_id = t_a;
    results := results || ' audit_tamper=(BAD)';
  EXCEPTION WHEN insufficient_privilege THEN results := results || ' audit_tamper=(OK)';
  END;
  EXECUTE 'RESET ROLE';

  -- ---------------- as BOB (athlete of B) ----------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u_bob, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.sessions;
  results := results || ' bob_sessions=' || CASE WHEN n = 1 THEN '(OK)' ELSE n || '(BAD)' END;
  SELECT count(*) INTO n FROM public.audit_logs;
  results := results || ' bob_audit=' || CASE WHEN n = 0 THEN '(OK)' ELSE n || '(BAD)' END;
  EXECUTE 'RESET ROLE';

  -- ---------------- service-role structural limits ----------------
  BEGIN
    INSERT INTO public.bookings (tenant_id, session_id, athlete_id) VALUES (t_a, sess_b, ath_a);
    results := results || ' composite_fk=(BAD)';
  EXCEPTION WHEN foreign_key_violation THEN results := results || ' composite_fk=(OK)';
  END;

  -- ---------------- fail-closed caps ----------------
  DELETE FROM public.tenant_subscriptions WHERE tenant_id = t_b;
  BEGIN
    INSERT INTO public.athletes (tenant_id, profile_id) VALUES (t_b, u_alice);
    results := results || ' nosub_cap=(BAD)';
  EXCEPTION WHEN others THEN
    results := results || ' nosub_cap=' || CASE WHEN SQLERRM LIKE 'no_active_subscription%' THEN '(OK)' ELSE '(BAD:' || SQLERRM || ')' END;
  END;

  -- ---------------- Safe-Sport Rule of Two ----------------
  INSERT INTO public.message_threads (tenant_id, title, created_by_profile_id)
    VALUES (t_b, 'suite', u_bob) RETURNING id INTO thr;
  BEGIN
    INSERT INTO public.thread_participants (tenant_id, thread_id, profile_id) VALUES
      (t_b, thr, u_alice), (t_b, thr, u_bob);  -- one adult + one minor
    SET CONSTRAINTS ALL IMMEDIATE;
    results := results || ' rule_of_two=(BAD)';
  EXCEPTION WHEN others THEN
    results := results || ' rule_of_two=' || CASE WHEN SQLERRM LIKE 'rule_of_two_violation%' THEN '(OK)' ELSE '(BAD:' || SQLERRM || ')' END;
  END;

  -- ---------------- anon surface ----------------
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  EXECUTE 'SET LOCAL ROLE anon';
  BEGIN
    SELECT count(*) INTO n FROM public.tenants;
    results := results || ' anon_tables=(BAD)';
  EXCEPTION WHEN insufficient_privilege THEN results := results || ' anon_tables=(OK)';
  END;
  SELECT count(*) INTO n FROM public.get_tenant_public_branding('lps.powa.com');
  results := results || ' anon_branding=' || CASE WHEN n = 1 THEN '(OK)' ELSE n || '(BAD)' END;
  EXECUTE 'RESET ROLE';

  RAISE EXCEPTION 'TEST_RESULTS: %', results;
END $$;
