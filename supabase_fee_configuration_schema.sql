-- ============================================
-- FEE CONFIGURATION SCHEMA
-- Smart School ERP - Supabase + Next.js
-- ============================================

-- Fee Configuration Table
CREATE TABLE IF NOT EXISTS public.fee_configuration (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_code text NOT NULL,
  school_id uuid REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  
  -- Fee Receipt Settings
  fee_receipt_layout text DEFAULT 'A4 Portrait',
  fee_invoice_layout text DEFAULT 'A4 Portrait',
  fee_receipt_template text DEFAULT 'Default Template',
  fee_wallet_template text,
  number_of_copies integer DEFAULT 2,
  default_payment_mode text DEFAULT 'Cash',
  payment_url_enabled boolean DEFAULT false,
  payment_url text,
  add_fee_due boolean DEFAULT true,
  add_fee_discount boolean DEFAULT true,
  add_fee_balance boolean DEFAULT true,
  note_on_fee_receipt text,
  note_on_fee_receipt_enabled boolean DEFAULT false,
  
  -- Other Payment Configuration
  show_zero_paid_component boolean DEFAULT true,
  collect_siblings_fee_together boolean DEFAULT false,
  keep_fee_receipt_date_editable boolean DEFAULT true,
  keep_fee_entry_date_editable boolean DEFAULT true,
  allow_later_installment_collection boolean DEFAULT true,
  allow_multiple_discount boolean DEFAULT false,
  do_not_show_zero_pending_component boolean DEFAULT false,
  do_not_repeat_discount boolean DEFAULT true,
  do_not_allow_cancelled_receipt_numbers boolean DEFAULT false,
  allow_manual_receipt_number boolean DEFAULT false,
  round_off_discount boolean DEFAULT false,
  fine_apply_as_per_receipt_date boolean DEFAULT false,
  enable_hide_installments boolean DEFAULT false,
  
  -- Parent Side Configuration
  allow_component_selection boolean DEFAULT true,
  allow_fee_fine_selection boolean DEFAULT true,
  dont_allow_partial_payment boolean DEFAULT true,
  do_not_show_components_on_app boolean DEFAULT false,
  
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(school_code)
);

-- Student Details on Receipt Configuration
CREATE TABLE IF NOT EXISTS public.fee_receipt_student_details (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_code text NOT NULL,
  field_name text NOT NULL,
  display_order integer NOT NULL,
  is_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(school_code, field_name)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_fee_configuration_school_code ON public.fee_configuration(school_code);
CREATE INDEX IF NOT EXISTS idx_fee_receipt_student_details_school_code ON public.fee_receipt_student_details(school_code);
CREATE INDEX IF NOT EXISTS idx_fee_receipt_student_details_order ON public.fee_receipt_student_details(school_code, display_order);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.fee_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_receipt_student_details ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read fee_configuration" ON public.fee_configuration;
DROP POLICY IF EXISTS "Allow Principal/Admin to manage fee_configuration" ON public.fee_configuration;
DROP POLICY IF EXISTS "Allow authenticated users to read fee_receipt_student_details" ON public.fee_receipt_student_details;
DROP POLICY IF EXISTS "Allow Principal/Admin to manage fee_receipt_student_details" ON public.fee_receipt_student_details;

-- FEE_CONFIGURATION: All authenticated users can read
CREATE POLICY "Allow authenticated users to read fee_configuration" ON public.fee_configuration
  FOR SELECT TO authenticated USING (true);

-- FEE_CONFIGURATION: Only Principal/Admin can manage
CREATE POLICY "Allow Principal/Admin to manage fee_configuration" ON public.fee_configuration
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id::text = auth.uid()::text
      AND (staff.role = 'Principal' OR staff.role = 'Admin' OR staff.designation = 'Principal' OR staff.designation = 'Admin')
    )
  );

-- FEE_RECEIPT_STUDENT_DETAILS: All authenticated users can read
CREATE POLICY "Allow authenticated users to read fee_receipt_student_details" ON public.fee_receipt_student_details
  FOR SELECT TO authenticated USING (true);

-- FEE_RECEIPT_STUDENT_DETAILS: Only Principal/Admin can manage
CREATE POLICY "Allow Principal/Admin to manage fee_receipt_student_details" ON public.fee_receipt_student_details
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
CREATE OR REPLACE FUNCTION public.update_fee_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_fee_configuration_updated_at ON public.fee_configuration;
CREATE TRIGGER update_fee_configuration_updated_at
  BEFORE UPDATE ON public.fee_configuration
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fee_config_updated_at();

DROP TRIGGER IF EXISTS update_fee_receipt_student_details_updated_at ON public.fee_receipt_student_details;
CREATE TRIGGER update_fee_receipt_student_details_updated_at
  BEFORE UPDATE ON public.fee_receipt_student_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fee_config_updated_at();

-- ============================================
-- INITIAL DATA FOR STUDENT DETAILS
-- ============================================
-- This will be inserted per school when they first access the page
-- The default fields are:
-- Receipt No., Receipt Date, Session, Student Name, Admission No., Class, Father Name, Mother Name, Address, Father Phone, Mother Phone

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.fee_configuration IS 'Stores fee receipt and payment configuration settings';
COMMENT ON TABLE public.fee_receipt_student_details IS 'Stores which student details to show on fee receipts and their order';

