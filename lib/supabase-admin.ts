import { createClient } from '@supabase/supabase-js';
import { getSupabaseFetchOptions } from './supabase-fetch';

/**
 * Get Supabase client with service role key
 * This bypasses RLS (Row Level Security) and should only be used where access control
 * is handled at the application level (API routes, server actions, middleware).
 *
 * Singleton is stored on `globalThis` (not `global`) so it works in Edge middleware
 * as well as Node — Edge does not define `global`.
 */
type SupabaseClient = ReturnType<typeof createClient<any>>;

type GlobalSupabase = typeof globalThis & {
  __supabaseAdminClient?: SupabaseClient;
};

const g = globalThis as GlobalSupabase;

export function getSupabaseAdminClient(): SupabaseClient {
  if (!g.__supabaseAdminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

    g.__supabaseAdminClient = createClient<any>(url, key, getSupabaseFetchOptions());
  }

  return g.__supabaseAdminClient;
}

export function getServiceRoleClient() {
  return getSupabaseAdminClient();
}
