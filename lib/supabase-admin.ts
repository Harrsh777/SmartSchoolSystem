import { createClient } from '@supabase/supabase-js'; // Supabase client factory function
import { getSupabaseFetchOptions } from './supabase-fetch'; // Custom fetch config (headers, caching, etc.)

/**
 * Get Supabase client with service role key
 * This bypasses RLS (Row Level Security) and should only be used in API routes
 * where we handle access control at the application level
 */
type SupabaseClient = ReturnType<typeof createClient<any>>; // Type definition for strong typing

declare global {
  // Helps Next.js HMR reuse the same client in dev.
  var __supabaseAdminClient: SupabaseClient | undefined; // Global variable to store single instance (singleton)
}

export function getSupabaseAdminClient(): SupabaseClient {
  // Check if client already exists (important: avoids creating new client every time)
  if (!global.__supabaseAdminClient) { // Agar pehle se client nahi hai tabhi naya banega

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL; // Supabase project URL from env
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role key (admin access)

    if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set'); // Safety check
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set'); // Safety check

    // Create client ONLY ONCE and store globally
    global.__supabaseAdminClient = createClient<any>(
      url,
      key,
      getSupabaseFetchOptions() // Custom fetch options (can affect performance)
    ); // Yaha ek hi baar client create hoga
  }

  return global.__supabaseAdminClient; 
  // Existing client return hoga → har API call pe naya client nahi banega (reuse ho raha hai)
}

// Backward compatible name used across the codebase.
export function getServiceRoleClient() {
  return getSupabaseAdminClient(); // Same function ko alias ki tarah use kar rahe hain
}