-- Run this in Supabase SQL Editor (or your migration pipeline) before using manual attendance.
-- Stores per-student cumulative manual attendance for a class + academic year (separate from daily student_attendance).

CREATE TABLE IF NOT EXISTS public.student_manual_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.accepted_schools (id) ON DELETE CASCADE,
  school_code TEXT NOT NULL,
  class_id UUID NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  student_id UUID NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  total_working_days INTEGER NOT NULL,
  attended_days INTEGER NOT NULL,
  attendance_percentage NUMERIC(7, 2) NOT NULL,
  created_by UUID REFERENCES public.staff (id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.staff (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT student_manual_attendance_twd_positive CHECK (total_working_days > 0),
  CONSTRAINT student_manual_attendance_attended_nonnegative CHECK (attended_days >= 0),
  CONSTRAINT student_manual_attendance_attended_lte_twd CHECK (attended_days <= total_working_days),
  CONSTRAINT student_manual_attendance_unique_student UNIQUE (school_code, class_id, academic_year, student_id)
);

CREATE INDEX IF NOT EXISTS idx_student_manual_attendance_lookup
  ON public.student_manual_attendance (school_code, class_id, academic_year);

CREATE INDEX IF NOT EXISTS idx_student_manual_attendance_student
  ON public.student_manual_attendance (student_id);

COMMENT ON TABLE public.student_manual_attendance IS 'Manual cumulative attendance (TWD / attended days / %) per class and academic year; not daily registers.';
