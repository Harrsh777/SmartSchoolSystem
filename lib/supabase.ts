import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client for server-side API routes
 * Uses service role key to bypass RLS (Row Level Security)
 * This is appropriate for API routes where we handle access control at the application level
 */
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    const error = new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
    console.error('Supabase initialization error:', error.message);
    throw error;
  }

  if (!supabaseKey) {
    const error = new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
    console.error('Supabase initialization error:', error.message);
    throw error;
  }

  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    return supabaseClient;
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    throw error;
  }
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = client[prop as keyof SupabaseClient];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

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

export interface Class {
  id: string;
  school_id: string;
  school_code: string;
  class: string;
  section: string;
  academic_year: string;
  class_teacher_id?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface ClassWithDetails extends Class {
  student_count: number;
  class_teacher: {
    id: string;
    full_name: string;
    staff_id: string;
  } | null;
  class_teacher_staff_id?: string;
}

export interface Notice {
  id: string;
  school_id: string;
  school_code: string;
  title: string;
  content: string;
  category: string;
  priority: string;
  status: string;
  publish_at?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface Examination {
  id: string;
  exam_name: string;
  academic_year: string;
  status: string;
  school_code: string;
  class_id?: string | null;
  created_by?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface Mark {
  id: string;
  exam_id: string;
  student_id: string;
  class_id?: string | null;
  school_code: string;
  marks_obtained: number;
  max_marks: number;
  percentage?: number | null;
  grade?: string | null;
  remarks?: string | null;
  entered_by?: string | null;
  entered_by_name?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface Exam {
  id: string;
  exam_name: string;
  name?: string;
  academic_year: string;
  status: string;
  school_code: string;
  class_id?: string | null;
  created_by?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface ExamSchedule {
  id: string;
  exam_id: string;
  school_code: string;
  exam_date: string;
  class: string;
  section: string;
  subject: string;
  start_time: string;
  end_time: string;
  room?: string | null;
  exam_name?: string | null;
  duration_minutes?: number | null;
  max_marks?: number | null;
  instructions?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}
