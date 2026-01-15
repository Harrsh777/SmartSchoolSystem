import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client for server-side API routes
 * Uses service role key to bypass RLS (Row Level Security)
 * This is appropriate for API routes where we handle access control at the application level
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Type definitions
export interface AcceptedSchool {
  id: string;
  school_name: string;
  school_code: string;
  school_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  school_email?: string;
  school_phone?: string;
  principal_name?: string;
  principal_email?: string;
  principal_phone?: string;
  established_year?: number;
  school_type?: string;
  affiliation?: string;
  approved_at?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface Staff {
  id: string;
  staff_id?: string;
  full_name: string;
  email?: string;
  phone?: string;
  role?: string;
  school_code?: string;
  [key: string]: unknown;
}

export interface Student {
  id: string;
  student_name?: string;
  admission_no?: string;
  class?: string;
  section?: string;
  email?: string;
  phone?: string;
  school_code?: string;
  academic_year?: string;
  [key: string]: unknown;
}
