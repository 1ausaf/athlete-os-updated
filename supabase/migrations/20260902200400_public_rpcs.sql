-- Narrow SECURITY DEFINER RPCs — the only anon-reachable surface. No table
-- ever gets anon grants; these functions return tiny, deliberate shapes.

-- accept_tenant_invitation hashes tokens with pgcrypto's digest().
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Hostname -> tenant + branding, for login pages and layout theming.
-- Verified domains of active/pilot tenants only.
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
         coalesce(public.tenant_entitlements(t.id), '{}'::jsonb)
  FROM public.tenant_domains d
  JOIN public.tenants t ON t.id = d.tenant_id AND t.status IN ('active', 'pilot')
  LEFT JOIN public.tenant_branding b ON b.tenant_id = t.id
  WHERE d.hostname = lower(p_hostname)
    AND d.status = 'verified';
$$;

REVOKE ALL ON FUNCTION public.get_tenant_public_branding(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_public_branding(text) TO anon, authenticated;

-- The signed-in user's membership of one tenant (auth entry gate).
CREATE OR REPLACE FUNCTION public.get_my_membership(p_tenant_id uuid)
RETURNS TABLE (
  tenant_id uuid,
  roles     public.user_role[],
  status    public.tenant_member_status
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT tm.tenant_id, tm.roles, tm.status
  FROM public.tenant_members tm
  WHERE tm.tenant_id = p_tenant_id
    AND tm.user_id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION public.get_my_membership(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_membership(uuid) TO authenticated;

-- Invitation acceptance: token possession + expiry is the credential (the
-- invited email often differs from the signup email for guardians).
-- Single-use via accepted_at; upserts the membership with the invite's roles.
CREATE OR REPLACE FUNCTION public.accept_tenant_invitation(p_token text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid;
  v_invite public.tenant_invitations%ROWTYPE;
BEGIN
  v_uid := (SELECT auth.uid());
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_invite
  FROM public.tenant_invitations i
  WHERE i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    AND i.accepted_at IS NULL
    AND i.revoked_at IS NULL
    AND i.expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_or_expired_invitation';
  END IF;

  INSERT INTO public.tenant_members (tenant_id, user_id, roles)
  VALUES (v_invite.tenant_id, v_uid, v_invite.roles)
  ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET roles = (
      SELECT array_agg(DISTINCT r)
      FROM unnest(public.tenant_members.roles || excluded.roles) AS r
    ),
        status = 'active';

  UPDATE public.tenant_invitations
  SET accepted_at = now(), accepted_by = v_uid
  WHERE id = v_invite.id;

  RETURN v_invite.tenant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_tenant_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_tenant_invitation(text) TO authenticated;
