import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials are missing. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface SchoolSignup {
  id?: string;
  school_name: string;
  school_code: string;
  school_address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  school_email: string;
  school_phone: string;
  principal_name: string;
  principal_email: string;
  principal_phone: string;
  established_year: string;
  school_type: string;
  affiliation: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at?: string;
  updated_at?: string;
}

export interface AcceptedSchool {
  id?: string;
  school_name: string;
  school_code: string;
  school_address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  school_email: string;
  school_phone: string;
  principal_name: string;
  principal_email: string;
  principal_phone: string;
  established_year: string;
  school_type: string;
  affiliation: string;
  password: string;
  approved_at?: string;
  approved_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RejectedSchool {
  id?: string;
  school_name: string;
  school_code: string;
  school_address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  school_email: string;
  school_phone: string;
  principal_name: string;
  principal_email: string;
  principal_phone: string;
  established_year: string;
  school_type: string;
  affiliation: string;
  rejection_reason: string;
  rejected_at?: string;
  rejected_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Student {
  id?: string;
  school_id: string;
  school_code: string;
  admission_no: string;
  student_name: string; // Keep for backward compatibility
  first_name?: string;
  last_name?: string;
  class: string;
  section: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  aadhaar_number?: string;
  email?: string;
  student_contact?: string;
  blood_group?: string;
  sr_no?: string;
  date_of_admission?: string;
  religion?: string;
  category?: string;
  nationality?: string;
  house?: string;
  last_class?: string;
  last_school_name?: string;
  last_school_percentage?: number;
  last_school_result?: string;
  medium?: string;
  schooling_type?: string;
  roll_number?: string;
  rfid?: string;
  pen_no?: string;
  apaar_no?: string;
  rte?: boolean;
  new_admission?: boolean;
  // Parent/Guardian Information
  parent_name?: string; // Keep for backward compatibility
  parent_phone?: string; // Keep for backward compatibility
  parent_email?: string; // Keep for backward compatibility
  father_name?: string;
  father_occupation?: string;
  father_contact?: string;
  mother_name?: string;
  mother_occupation?: string;
  mother_contact?: string;
  staff_relation?: string;
  transport_type?: string;
  // Academic
  academic_year: string;
  status: 'active' | 'inactive' | 'graduated' | 'transferred';
  created_at?: string;
  updated_at?: string;
}

export interface Staff {
  id?: string;
  school_id: string;
  school_code: string;
  staff_id: string;
  full_name: string;
  role: string;
  department?: string;
  designation?: string;
  email?: string;
  phone: string;
  date_of_joining: string;
  employment_type?: string;
  qualification?: string;
  experience_years?: number;
  gender?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Class {
  id?: string;
  school_id: string;
  school_code: string;
  class: string;
  section: string;
  academic_year: string;
  class_teacher_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ClassWithDetails extends Class {
  student_count?: number;
  class_teacher?: {
    id: string;
    full_name: string;
  };
}

export interface Exam {
  id?: string;
  school_id: string;
  school_code: string;
  name: string;
  academic_year: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'scheduled';
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExamSchedule {
  id?: string;
  exam_id: string;
  school_id: string;
  school_code: string;
  class: string;
  section: string;
  subject: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  room?: string;
  invigilator_id?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Notice {
  id?: string;
  school_id: string;
  school_code: string;
  title: string;
  content: string;
  category: 'Examination' | 'General' | 'Holiday' | 'Event' | 'Urgent';
  priority: 'High' | 'Medium' | 'Low';
  status: 'Active' | 'Draft' | 'Archived';
  publish_at?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StudentAttendance {
  id?: string;
  school_id: string;
  school_code: string;
  class_id: string;
  student_id: string;
  attendance_date: string;
  status: 'present' | 'absent' | 'late';
  marked_by: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Admin employees (super admin / internal staff)
export interface AdminEmployee {
  id?: string;
  emp_id: string;
  full_name: string;
  email?: string;
  password_hash: string;
  created_at?: string;
}

export interface EmployeeSchool {
  id?: string;
  employee_id: string;
  school_id: string;
}

