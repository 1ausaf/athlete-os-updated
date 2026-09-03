-- Storage (approved plan, Phase 8): the tenant branding bucket.
--
--   tenant-assets/{tenant_id}/logo.png | logo-dark.png | favicon.png
--
-- PUBLIC READ by design — logos render on public login pages before any
-- session exists. WRITES are service-role only (the owner-gated branding
-- action runs server-side): no INSERT/UPDATE/DELETE policies exist for the
-- api roles, so even an authenticated user cannot touch storage directly.
--
-- Private member files (documents, media) get a SEPARATE private bucket
-- when a feature needs one — pattern documented in docs/security.md:
-- tenant/{tenant_id}/... paths + membership-checked storage.objects
-- policies + signed URLs. Deliberately NOT created empty here.
--
-- Rollback: delete objects, then `delete from storage.buckets where id =
-- 'tenant-assets'`.

INSERT INTO storage.buckets
  (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-assets',
  'tenant-assets',
  true,
  2097152, -- 2MB per asset
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/x-icon']
)
ON CONFLICT (id) DO NOTHING;

-- Belt and braces: an explicit anon/authenticated READ policy scoped to
-- this bucket only (public buckets serve via CDN regardless; this keeps
-- the API path consistent), and no write policies for api roles.
CREATE POLICY tenant_assets_public_read ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'tenant-assets');
