-- ============================================
-- GATE PASS SCHEMA
-- Smart School ERP - Supabase + Next.js
-- ============================================

-- Gate Passes Table
CREATE TABLE IF NOT EXISTS public.gate_passes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_code text NOT NULL,
  school_id uuid REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  
  -- Person Detail
  person_type text NOT NULL, -- 'Staff' or 'Student'
  person_id uuid, -- References staff.id or students.id
  person_name text NOT NULL,
  
  -- Purpose
  purpose text NOT NULL,
  leaving_with text,
  permitted_by_1 uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  permitted_by_1_name text,
  permitted_by_2 uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  permitted_by_2_name text,
  
  -- Date & Time
  out_date_time timestamp with time zone NOT NULL,
  in_date_time_tentative timestamp with time zone,
  in_date_time_actual timestamp with time zone,
  
  -- Authenticate (Optional)
  mobile_number text,
  remarks text,
  
  -- Status
  status text DEFAULT 'pending', -- 'pending', 'approved', 'completed', 'cancelled'
  is_active boolean DEFAULT true,
  
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid REFERENCES public.staff(id) ON DELETE SET NULL
);

-- Gate Pass Purposes Table (for dropdown options)
CREATE TABLE IF NOT EXISTS public.gate_pass_purposes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_code text NOT NULL,
  school_id uuid REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  purpose_name text NOT NULL,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_gate_passes_school_code ON public.gate_passes(school_code);
CREATE INDEX IF NOT EXISTS idx_gate_passes_person_id ON public.gate_passes(person_id);
CREATE INDEX IF NOT EXISTS idx_gate_passes_status ON public.gate_passes(school_code, status);
CREATE INDEX IF NOT EXISTS idx_gate_passes_out_date ON public.gate_passes(school_code, out_date_time);
CREATE INDEX IF NOT EXISTS idx_gate_pass_purposes_school_code ON public.gate_pass_purposes(school_code);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.gate_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_pass_purposes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read gate_passes" ON public.gate_passes;
DROP POLICY IF EXISTS "Allow Principal/Admin to manage gate_passes" ON public.gate_passes;
DROP POLICY IF EXISTS "Allow authenticated users to read gate_pass_purposes" ON public.gate_pass_purposes;
DROP POLICY IF EXISTS "Allow Principal/Admin to manage gate_pass_purposes" ON public.gate_pass_purposes;

-- GATE_PASSES: All authenticated users can read
CREATE POLICY "Allow authenticated users to read gate_passes" ON public.gate_passes
  FOR SELECT TO authenticated USING (true);

-- GATE_PASSES: Only Principal/Admin can manage
CREATE POLICY "Allow Principal/Admin to manage gate_passes" ON public.gate_passes
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id::text = auth.uid()::text
      AND (staff.role = 'Principal' OR staff.role = 'Admin' OR staff.designation = 'Principal' OR staff.designation = 'Admin')
    )
  );

-- GATE_PASS_PURPOSES: All authenticated users can read
CREATE POLICY "Allow authenticated users to read gate_pass_purposes" ON public.gate_pass_purposes
  FOR SELECT TO authenticated USING (true);

-- GATE_PASS_PURPOSES: Only Principal/Admin can manage
CREATE POLICY "Allow Principal/Admin to manage gate_pass_purposes" ON public.gate_pass_purposes
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id::text = auth.uid()::text
      AND (staff.role = 'Principal' OR staff.role = 'Admin' OR staff.designation = 'Principal' OR staff.designation = 'Admin')
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION public.update_gate_pass_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_gate_passes_updated_at ON public.gate_passes;
CREATE TRIGGER update_gate_passes_updated_at
  BEFORE UPDATE ON public.gate_passes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gate_pass_updated_at();

DROP TRIGGER IF EXISTS update_gate_pass_purposes_updated_at ON public.gate_pass_purposes;
CREATE TRIGGER update_gate_pass_purposes_updated_at
  BEFORE UPDATE ON public.gate_pass_purposes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gate_pass_updated_at();

-- ============================================
-- DEFAULT DATA
-- ============================================
-- Insert default purposes (can be customized per school)
-- Note: This will be handled in the application, not in SQL

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.gate_passes IS 'Stores gate pass records for staff and students';
COMMENT ON TABLE public.gate_pass_purposes IS 'Stores available purposes for gate passes';



