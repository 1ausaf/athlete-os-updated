-- Attach the live LPS roster (134 rows) to the LPS tenant. The pinned uuid
-- keeps the backfill deterministic across environments. members stays
-- service-role-only (RLS on, zero policies) — it is a staging roster with
-- minors' PII; the product surface is profiles/athletes, populated later by
-- an audited import path.

INSERT INTO public.tenants (id, slug, name, status)
VALUES ('00000000-0000-4000-8000-000000000001', 'lps', 'LPS Athletic', 'pilot')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.tenant_branding (tenant_id, display_name, theme)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'LPS Athletic',
  -- The app's current LPS palette, as CSS HSL triplets (light + dark).
  '{
    "colors": {
      "light": {"brand": "353 78% 44%", "brandForeground": "0 0% 100%", "brandSoft": "353 78% 95%", "brandInk": "353 72% 38%"},
      "dark":  {"brand": "353 82% 54%", "brandForeground": "0 0% 100%", "brandSoft": "353 50% 16%", "brandInk": "353 90% 66%"}
    }
  }'::jsonb
)
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO public.tenant_domains (tenant_id, hostname, domain_type, status, is_primary, verified_at)
VALUES ('00000000-0000-4000-8000-000000000001', 'lps.powa.com', 'subdomain', 'verified', true, now())
ON CONFLICT (hostname) DO NOTHING;

-- LPS starts on the white_label tier (the flagship tenant).
INSERT INTO public.tenant_subscriptions (tenant_id, plan_id, status)
VALUES ('00000000-0000-4000-8000-000000000001', 'white_label', 'active')
ON CONFLICT (tenant_id) DO NOTHING;

ALTER TABLE public.members
  ADD COLUMN tenant_id uuid REFERENCES public.tenants (id) ON DELETE RESTRICT;

UPDATE public.members SET tenant_id = '00000000-0000-4000-8000-000000000001';

ALTER TABLE public.members ALTER COLUMN tenant_id SET NOT NULL;

DROP INDEX IF EXISTS public.members_tenant_name_idx;
DROP INDEX IF EXISTS public.members_name_idx;
CREATE INDEX members_tenant_name_idx
  ON public.members (tenant_id, lower(last_name), lower(first_name));
