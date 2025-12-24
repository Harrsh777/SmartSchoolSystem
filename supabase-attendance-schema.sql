-- Student Attendance Table
-- This table stores daily attendance records for students
-- Only class teachers can mark attendance for their assigned classes

CREATE TABLE IF NOT EXISTS public.student_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  school_code TEXT NOT NULL,
  class_id UUID NOT NULL,
  student_id UUID NOT NULL,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  marked_by UUID NOT NULL, -- staff.id (class teacher)
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT student_attendance_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_unique UNIQUE (student_id, attendance_date),
  CONSTRAINT attendance_student_fkey FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT attendance_class_fkey FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
  CONSTRAINT attendance_staff_fkey FOREIGN KEY (marked_by) REFERENCES staff (id) ON DELETE RESTRICT,
  CONSTRAINT attendance_school_fkey FOREIGN KEY (school_id) REFERENCES accepted_schools (id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_school_code ON public.student_attendance(school_code);
CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON public.student_attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.student_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.student_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_marked_by ON public.student_attendance(marked_by);

-- RLS Policies
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

-- Policy: Schools can view their own attendance records
CREATE POLICY "Schools can view their own attendance"
  ON public.student_attendance
  FOR SELECT
  USING (
    school_code IN (
      SELECT school_code FROM accepted_schools WHERE id = school_id
    )
  );

-- Policy: Class teachers can insert attendance for their classes
CREATE POLICY "Class teachers can mark attendance"
  ON public.student_attendance
  FOR INSERT
  WITH CHECK (
    marked_by IN (
      SELECT id FROM staff WHERE school_code = student_attendance.school_code
    )
    AND class_id IN (
      SELECT id FROM classes WHERE class_teacher_id = marked_by
    )
  );

-- Policy: Class teachers can update same-day attendance
CREATE POLICY "Class teachers can update same-day attendance"
  ON public.student_attendance
  FOR UPDATE
  USING (
    marked_by IN (
      SELECT id FROM staff WHERE school_code = student_attendance.school_code
    )
    AND class_id IN (
      SELECT id FROM classes WHERE class_teacher_id = marked_by
    )
    AND attendance_date = CURRENT_DATE
  );

-- Policy: Principals can view all attendance for their school
CREATE POLICY "Principals can view all attendance"
  ON public.student_attendance
  FOR SELECT
  USING (
    school_code IN (
      SELECT school_code FROM accepted_schools
    )
  );

