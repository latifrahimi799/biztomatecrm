-- Public bucket for template images (email clients load by URL).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-template-assets',
  'email-template-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Read for everyone with object URL (public bucket).
CREATE POLICY "email_assets_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-template-assets');

-- Authenticated users can upload. For local demo with anon key, add a separate anon INSERT policy if needed.
CREATE POLICY "email_assets_authenticated_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'email-template-assets');

CREATE POLICY "email_assets_authenticated_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'email-template-assets');

CREATE POLICY "email_assets_authenticated_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'email-template-assets');

-- Optional: allow anon uploads for prototype builds (restrict or remove in production).
CREATE POLICY "email_assets_anon_insert"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'email-template-assets');

-- Template document alongside legacy HTML body
ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS body_format text NOT NULL DEFAULT 'html'
  CONSTRAINT email_templates_body_format_check CHECK (body_format IN ('html', 'blocks'));

ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS blocks jsonb;
