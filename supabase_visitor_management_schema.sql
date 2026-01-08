-- ============================================
-- VISITOR MANAGEMENT SCHEMA
-- Smart School ERP - Supabase + Next.js
-- ============================================

-- 1. Visitors Table
-- Stores visitor information and visit details
CREATE TABLE IF NOT EXISTS public.visitors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  school_code text NOT NULL,
  visitor_name text NOT NULL,
  visitor_photo_url text,
  purpose_of_visit text NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  student_name text,
  host_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  host_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'not_approved', 'direct_entry')),
  requested_by text NOT NULL DEFAULT 'manual_entry' CHECK (requested_by IN ('manual_entry', 'app_request', 'online_request')),
  requested_by_staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  check_in_date date,
  check_in_time time,
  exit_date date,
  exit_time time,
  phone_number text,
  email text,
  id_proof_type text,
  id_proof_number text,
  id_proof_document_url text,
  vehicle_number text,
  remarks text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Visitor Purposes Table (Optional - for predefined purposes)
CREATE TABLE IF NOT EXISTS public.visitor_purposes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  school_code text NOT NULL,
  purpose_name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT unique_school_purpose UNIQUE (school_id, purpose_name)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_visitors_school_code ON public.visitors(school_code);
CREATE INDEX IF NOT EXISTS idx_visitors_school_id ON public.visitors(school_id);
CREATE INDEX IF NOT EXISTS idx_visitors_status ON public.visitors(status);
CREATE INDEX IF NOT EXISTS idx_visitors_check_in_date ON public.visitors(check_in_date);
CREATE INDEX IF NOT EXISTS idx_visitors_host_id ON public.visitors(host_id);
CREATE INDEX IF NOT EXISTS idx_visitors_student_id ON public.visitors(student_id);
CREATE INDEX IF NOT EXISTS idx_visitors_created_at ON public.visitors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_purposes_school_code ON public.visitor_purposes(school_code);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_purposes ENABLE ROW LEVEL SECURITY;

-- Policies for visitors
DROP POLICY IF EXISTS "Allow authenticated school staff to read visitors" ON public.visitors;
CREATE POLICY "Allow authenticated school staff to read visitors" ON public.visitors
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.staff WHERE staff.id = auth.uid() AND staff.school_id = visitors.school_id)
  );

DROP POLICY IF EXISTS "Allow authenticated school staff to manage visitors" ON public.visitors;
CREATE POLICY "Allow authenticated school staff to manage visitors" ON public.visitors
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.staff WHERE staff.id = auth.uid() AND staff.school_id = visitors.school_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.staff WHERE staff.id = auth.uid() AND staff.school_id = visitors.school_id)
  );

-- Policies for visitor_purposes
DROP POLICY IF EXISTS "Allow authenticated school staff to read visitor purposes" ON public.visitor_purposes;
CREATE POLICY "Allow authenticated school staff to read visitor purposes" ON public.visitor_purposes
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.staff WHERE staff.id = auth.uid() AND staff.school_id = visitor_purposes.school_id)
  );

DROP POLICY IF EXISTS "Allow Principal/Admin to manage visitor purposes" ON public.visitor_purposes;
CREATE POLICY "Allow Principal/Admin to manage visitor purposes" ON public.visitor_purposes
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id = auth.uid()
      AND staff.school_id = visitor_purposes.school_id
      AND (staff.role = 'Principal' OR staff.role = 'Admin' OR staff.designation = 'Principal' OR staff.designation = 'Admin')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id = auth.uid()
      AND staff.school_id = visitor_purposes.school_id
      AND (staff.role = 'Principal' OR staff.role = 'Admin' OR staff.designation = 'Principal' OR staff.designation = 'Admin')
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_visitor_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_visitors_updated_at ON public.visitors;
CREATE TRIGGER update_visitors_updated_at
  BEFORE UPDATE ON public.visitors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_visitor_updated_at();

DROP TRIGGER IF EXISTS update_visitor_purposes_updated_at ON public.visitor_purposes;
CREATE TRIGGER update_visitor_purposes_updated_at
  BEFORE UPDATE ON public.visitor_purposes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_visitor_updated_at();

