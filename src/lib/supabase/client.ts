import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * True when both URL and anon key are set. Use this to gate UI that calls the API.
 */
export const isSupabaseConfigured: boolean = Boolean(url?.trim() && anonKey?.trim());

/**
 * Typed lazily as generic until you generate Database types:
 * `npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts`
 */
export const supabase: SupabaseClient | null =
  isSupabaseConfigured && url && anonKey ? createClient(url, anonKey) : null;
