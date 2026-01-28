import { createClient } from '@supabase/supabase-js';
import { getSupabaseFetchOptions } from './supabase-fetch';

/**
 * Get Supabase client with service role key
 * This bypasses RLS (Row Level Security) and should only be used in API routes
 * where we handle access control at the application level
 */
export function getServiceRoleClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    getSupabaseFetchOptions()
  );
}
