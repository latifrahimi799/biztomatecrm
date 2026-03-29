import { supabase, isSupabaseConfigured } from './client';

const BUCKET = 'email-template-assets';

export async function uploadEmailTemplateImage(
  file: File,
): Promise<{ url: string } | { error: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      error:
        'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to upload images.',
    };
  }

  const ext = file.name.includes('.') ? file.name.split('.').pop()!.slice(0, 8) : 'bin';
  const path = `templates/${crypto.randomUUID()}.${ext}`;

  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    return { error: error.message };
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return { url: pub.publicUrl };
}
