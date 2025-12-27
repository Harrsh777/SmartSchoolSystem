import { createClient } from '@supabase/supabase-js';

/**
 * Get Supabase service role client for admin operations
 * This bypasses Row Level Security (RLS) policies
 * @throws Error if environment variables are not set
 */
export function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is not set');
  }

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY environment variable is not set. ' +
      'Please add it to your .env.local file. ' +
      'You can find this key in your Supabase project settings under API → service_role key.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

