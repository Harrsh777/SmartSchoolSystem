-- ============================================
-- COPY CHECKING SCHEMA
-- Smart School ERP - Supabase + Next.js
-- ============================================

-- 1. Copy Checking Records Table
-- Stores student copy checking records for classwork and homework
CREATE TABLE IF NOT EXISTS public.copy_checking (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  school_code text NOT NULL,
  academic_year text NOT NULL,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  section text,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  subject_name text NOT NULL,
  work_date date NOT NULL,
  work_type text NOT NULL CHECK (work_type IN ('class_work', 'homework')),
  topic text,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_marked' CHECK (status IN ('green', 'yellow', 'red', 'not_marked')),
  remarks text,
  marked_by uuid NOT NULL REFERENCES public.staff(id) ON DELETE RESTRICT,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT unique_student_work UNIQUE (student_id, work_date, work_type, subject_id, class_id, school_code)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_copy_checking_school_code ON public.copy_checking(school_code);
CREATE INDEX IF NOT EXISTS idx_copy_checking_school_id ON public.copy_checking(school_id);
CREATE INDEX IF NOT EXISTS idx_copy_checking_class_id ON public.copy_checking(class_id);
CREATE INDEX IF NOT EXISTS idx_copy_checking_student_id ON public.copy_checking(student_id);
CREATE INDEX IF NOT EXISTS idx_copy_checking_work_date ON public.copy_checking(work_date);
CREATE INDEX IF NOT EXISTS idx_copy_checking_work_type ON public.copy_checking(work_type);
CREATE INDEX IF NOT EXISTS idx_copy_checking_subject_id ON public.copy_checking(subject_id);
CREATE INDEX IF NOT EXISTS idx_copy_checking_marked_by ON public.copy_checking(marked_by);
CREATE INDEX IF NOT EXISTS idx_copy_checking_status ON public.copy_checking(status);
CREATE INDEX IF NOT EXISTS idx_copy_checking_class_date ON public.copy_checking(class_id, work_date);
CREATE INDEX IF NOT EXISTS idx_copy_checking_class_subject_date ON public.copy_checking(class_id, subject_id, work_date);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
ALTER TABLE public.copy_checking ENABLE ROW LEVEL SECURITY;

-- Policies for copy_checking
DROP POLICY IF EXISTS "Allow authenticated school staff to read copy checking" ON public.copy_checking;
CREATE POLICY "Allow authenticated school staff to read copy checking" ON public.copy_checking
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.staff WHERE staff.id = auth.uid() AND staff.school_id = copy_checking.school_id)
  );

DROP POLICY IF EXISTS "Allow authenticated school staff to manage copy checking" ON public.copy_checking;
CREATE POLICY "Allow authenticated school staff to manage copy checking" ON public.copy_checking
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.staff WHERE staff.id = auth.uid() AND staff.school_id = copy_checking.school_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.staff WHERE staff.id = auth.uid() AND staff.school_id = copy_checking.school_id)
  );

-- ============================================
-- TRIGGERS
-- ============================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_copy_checking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_copy_checking_updated_at ON public.copy_checking;
CREATE TRIGGER update_copy_checking_updated_at
  BEFORE UPDATE ON public.copy_checking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_copy_checking_updated_at();

