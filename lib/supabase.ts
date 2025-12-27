import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface AcceptedSchool {
  id?: string;
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
  established_year?: string;
  school_type?: string;
  affiliation?: string;
  logo_url?: string;
  status?: 'pending' | 'accepted' | 'rejected';
  created_at?: string;
  updated_at?: string;
}

export interface Student {
  id?: string;
  school_id: string;
  school_code: string;
  admission_no: string;
  student_name: string;
  first_name?: string;
  last_name?: string;
  class: string;
  section: string;
  date_of_birth?: string;
  gender?: 'Male' | 'Female' | 'Other';
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
  transport_type?: string;
  staff_relation?: string;
  new_admission?: boolean;
  roll_number?: string;
  rfid?: string;
  pen_no?: string;
  apaar_no?: string;
  rte?: boolean;
  // Parent/Guardian Information
  parent_name?: string; // Deprecated, use father_name/mother_name
  parent_phone?: string; // Deprecated, use father_contact/mother_contact
  parent_email?: string; // Deprecated
  father_name?: string;
  father_occupation?: string;
  father_contact?: string;
  mother_name?: string;
  mother_occupation?: string;
  mother_contact?: string;
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
  // New fields from schema update
  dob?: string; // Date of birth
  adhar_no?: string; // Aadhaar number
  blood_group?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  religion?: string;
  category?: string;
  nationality?: string;
  contact1?: string; // Primary contact
  contact2?: string; // Secondary contact
  employee_code?: string; // Employee code (maps to staff_id if not provided)
  dop?: string; // Date of promotion
  short_code?: string; // Short code identifier
  rfid?: string; // RFID card number
  uuid?: string; // Additional UUID field
  alma_mater?: string; // University/institution
  major?: string; // Subject specialization
  website?: string;
  is_active?: boolean;
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
    staff_id: string;
  };
}

export interface Examination {
  id?: string;
  school_id: string;
  school_code: string;
  exam_name: string;
  academic_year: string;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Mark {
  id?: string;
  exam_id: string;
  student_id: string;
  class_id: string;
  school_id: string;
  school_code: string;
  admission_no: string;
  max_marks: number;
  marks_obtained: number;
  grade?: string;
  percentage?: number;
  remarks?: string;
  entered_by: string;
  entered_by_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MarkWithStudent extends Mark {
  student?: {
    id: string;
    admission_no: string;
    student_name: string;
    class: string;
    section: string;
    roll_number?: string;
  };
}

export interface MarkWithExam extends Mark {
  examination?: {
    id: string;
    exam_name: string;
    academic_year: string;
    start_date: string;
    end_date: string;
    status: string;
  };
}

export interface Exam {
  id?: string;
  school_id: string;
  school_code: string;
  exam_name: string;
  exam_type: string;
  academic_year: string;
  start_date?: string;
  end_date?: string;
  status?: 'upcoming' | 'ongoing' | 'completed';
  created_at?: string;
  updated_at?: string;
}

export interface ExamSchedule {
  id?: string;
  exam_id: string;
  class: string;
  section: string;
  subject: string;
  exam_date: string;
  exam_time?: string;
  duration?: number;
  max_marks?: number;
  created_at?: string;
}

export interface Notice {
  id?: string;
  school_id: string;
  school_code: string;
  title: string;
  message: string;
  category?: string;
  priority?: 'High' | 'Medium' | 'Low';
  target_audience?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

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

export interface Fee {
  id?: string;
  school_id: string;
  school_code: string;
  student_id: string;
  admission_no: string;
  amount: number;
  payment_mode: 'cash' | 'online' | 'cheque' | 'card' | 'bank_transfer';
  receipt_no: string;
  payment_date: string;
  collected_by: string; // staff.id
  collected_by_name?: string; // Denormalized staff name
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FeeWithStudent extends Fee {
  student?: {
    id: string;
    admission_no: string;
    student_name: string;
    class: string;
    section: string;
  };
}
