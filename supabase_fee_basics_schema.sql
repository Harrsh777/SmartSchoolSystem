-- ============================================
-- FEE BASICS SCHEMA (Components, Discounts, Misc Fees)
-- Smart School ERP - Supabase + Next.js
-- ============================================

-- Fee Components Table
CREATE TABLE IF NOT EXISTS public.fee_components (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_code text NOT NULL,
  school_id uuid REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  head_name text NOT NULL,
  component_name text NOT NULL,
  admission_type text DEFAULT 'All Students', -- 'All Students', 'New', 'Old'
  gender text DEFAULT 'All Students', -- 'All Students', 'Male', 'Female'
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Fee Discounts Table
CREATE TABLE IF NOT EXISTS public.fee_discounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_code text NOT NULL,
  school_id uuid REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  discount_name text NOT NULL,
  remarks text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Misc Fees Table
CREATE TABLE IF NOT EXISTS public.misc_fees (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_code text NOT NULL,
  school_id uuid REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  fee_name text NOT NULL,
  amount numeric(10, 2),
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Fee Fines Table - Update if exists, create if not
-- Note: This table might already exist, but we'll ensure it has fine_name field
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fee_fines') THEN
    CREATE TABLE public.fee_fines (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      school_code text NOT NULL,
      school_id uuid REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
      fine_name text NOT NULL,
      fine_type text NOT NULL, -- 'Fixed Amount', 'Percentage', 'Daily'
      fine_amount numeric(10, 2),
      fine_percentage numeric(5, 2),
      daily_fine_amount numeric(10, 2),
      grace_period_days integer DEFAULT 0,
      is_active boolean DEFAULT true,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    );
  ELSE
    -- Add fine_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_fines' AND column_name = 'fine_name') THEN
      ALTER TABLE public.fee_fines ADD COLUMN fine_name text;
    END IF;
  END IF;
END $$;

-- Academic Years Table
CREATE TABLE IF NOT EXISTS public.academic_years (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_code text NOT NULL,
  school_id uuid REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  year_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_current boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(school_code, year_name)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_fee_components_school_code ON public.fee_components(school_code);
CREATE INDEX IF NOT EXISTS idx_fee_components_display_order ON public.fee_components(school_code, display_order);
CREATE INDEX IF NOT EXISTS idx_fee_discounts_school_code ON public.fee_discounts(school_code);
CREATE INDEX IF NOT EXISTS idx_misc_fees_school_code ON public.misc_fees(school_code);
CREATE INDEX IF NOT EXISTS idx_academic_years_school_code ON public.academic_years(school_code);
CREATE INDEX IF NOT EXISTS idx_academic_years_current ON public.academic_years(school_code, is_current);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.fee_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.misc_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read fee_components" ON public.fee_components;
DROP POLICY IF EXISTS "Allow Principal/Admin to manage fee_components" ON public.fee_components;
DROP POLICY IF EXISTS "Allow authenticated users to read fee_discounts" ON public.fee_discounts;
DROP POLICY IF EXISTS "Allow Principal/Admin to manage fee_discounts" ON public.fee_discounts;
DROP POLICY IF EXISTS "Allow authenticated users to read misc_fees" ON public.misc_fees;
DROP POLICY IF EXISTS "Allow Principal/Admin to manage misc_fees" ON public.misc_fees;
DROP POLICY IF EXISTS "Allow authenticated users to read academic_years" ON public.academic_years;
DROP POLICY IF EXISTS "Allow Principal/Admin to manage academic_years" ON public.academic_years;

-- FEE_COMPONENTS: All authenticated users can read
CREATE POLICY "Allow authenticated users to read fee_components" ON public.fee_components
  FOR SELECT TO authenticated USING (true);

-- FEE_COMPONENTS: Only Principal/Admin can manage
CREATE POLICY "Allow Principal/Admin to manage fee_components" ON public.fee_components
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id::text = auth.uid()::text
      AND (staff.role = 'Principal' OR staff.role = 'Admin' OR staff.designation = 'Principal' OR staff.designation = 'Admin')
    )
  );

-- FEE_DISCOUNTS: All authenticated users can read
CREATE POLICY "Allow authenticated users to read fee_discounts" ON public.fee_discounts
  FOR SELECT TO authenticated USING (true);

-- FEE_DISCOUNTS: Only Principal/Admin can manage
CREATE POLICY "Allow Principal/Admin to manage fee_discounts" ON public.fee_discounts
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id::text = auth.uid()::text
      AND (staff.role = 'Principal' OR staff.role = 'Admin' OR staff.designation = 'Principal' OR staff.designation = 'Admin')
    )
  );

-- MISC_FEES: All authenticated users can read
CREATE POLICY "Allow authenticated users to read misc_fees" ON public.misc_fees
  FOR SELECT TO authenticated USING (true);

-- MISC_FEES: Only Principal/Admin can manage
CREATE POLICY "Allow Principal/Admin to manage misc_fees" ON public.misc_fees
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id::text = auth.uid()::text
      AND (staff.role = 'Principal' OR staff.role = 'Admin' OR staff.designation = 'Principal' OR staff.designation = 'Admin')
    )
  );

-- ACADEMIC_YEARS: All authenticated users can read
CREATE POLICY "Allow authenticated users to read academic_years" ON public.academic_years
  FOR SELECT TO authenticated USING (true);

-- ACADEMIC_YEARS: Only Principal/Admin can manage
CREATE POLICY "Allow Principal/Admin to manage academic_years" ON public.academic_years
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
CREATE OR REPLACE FUNCTION public.update_fee_basics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_fee_components_updated_at ON public.fee_components;
CREATE TRIGGER update_fee_components_updated_at
  BEFORE UPDATE ON public.fee_components
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fee_basics_updated_at();

DROP TRIGGER IF EXISTS update_fee_discounts_updated_at ON public.fee_discounts;
CREATE TRIGGER update_fee_discounts_updated_at
  BEFORE UPDATE ON public.fee_discounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fee_basics_updated_at();

DROP TRIGGER IF EXISTS update_misc_fees_updated_at ON public.misc_fees;
CREATE TRIGGER update_misc_fees_updated_at
  BEFORE UPDATE ON public.misc_fees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fee_basics_updated_at();

DROP TRIGGER IF EXISTS update_academic_years_updated_at ON public.academic_years;
CREATE TRIGGER update_academic_years_updated_at
  BEFORE UPDATE ON public.academic_years
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fee_basics_updated_at();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.fee_components IS 'Stores fee components (e.g., Transport Fee, Admission Fees)';
COMMENT ON TABLE public.fee_discounts IS 'Stores fee discount definitions';
COMMENT ON TABLE public.misc_fees IS 'Stores miscellaneous fees';
COMMENT ON TABLE public.academic_years IS 'Stores academic year definitions';

