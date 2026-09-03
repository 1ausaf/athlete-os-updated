-- Security audit log (approved plan, Phase 9 table — created early so the
-- auth flows can log from day one). Append-only by design:
--   * writes: service-role only (the app's logSecurityEvent helper);
--   * reads:  owner/admin of the tenant (RLS);
--   * no UPDATE/DELETE policies for ANY api role — not even staff can
--     alter history. tenant_id is nullable so platform-level events
--     (e.g. failed logins with no resolvable tenant) are retained, and
--     ON DELETE SET NULL keeps rows even if a tenant/user is removed.
-- Rollback: drop table public.audit_logs (history loss — avoid).

CREATE TABLE public.audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid REFERENCES public.tenants (id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  action        text NOT NULL,
  resource_type text,
  resource_id   text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address    text,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_tenant_created_idx
  ON public.audit_logs (tenant_id, created_at DESC);
CREATE INDEX audit_logs_actor_idx
  ON public.audit_logs (actor_user_id, created_at DESC);
CREATE INDEX audit_logs_action_idx
  ON public.audit_logs (action, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Owner/admin of a tenant can READ that tenant's log. Nothing else.
CREATE POLICY audit_logs_select_staff ON public.audit_logs FOR SELECT TO authenticated
  USING (tenant_id = ANY ((SELECT private.staff_tenant_ids())::uuid[]));

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

COMMENT ON TABLE public.audit_logs IS
  'Append-only security event log. Service-role writes; owner/admin tenant-scoped reads; no API update/delete path.';
