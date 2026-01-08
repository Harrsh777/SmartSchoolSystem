-- ============================================
-- FINANCE MANAGEMENT SCHEMA
-- Smart School ERP - Supabase + Next.js
-- ============================================

-- Financial Years Table
CREATE TABLE IF NOT EXISTS public.financial_years (
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

-- Income Entries Table
CREATE TABLE IF NOT EXISTS public.income_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_code text NOT NULL,
  school_id uuid REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  financial_year_id uuid REFERENCES public.financial_years(id) ON DELETE SET NULL,
  
  -- Income Details
  source text NOT NULL, -- 'Fees', 'Donation', 'Grant', 'Other'
  amount numeric(12, 2) NOT NULL,
  entry_date date NOT NULL,
  reference_number text,
  notes text,
  
  -- Metadata
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.staff(id) ON DELETE SET NULL
);

-- Expense Entries Table
CREATE TABLE IF NOT EXISTS public.expense_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_code text NOT NULL,
  school_id uuid REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  financial_year_id uuid REFERENCES public.financial_years(id) ON DELETE SET NULL,
  
  -- Expense Details
  category text NOT NULL, -- 'Salary', 'Utility', 'Maintenance', 'Vendor', 'Other'
  amount numeric(12, 2) NOT NULL,
  entry_date date NOT NULL,
  paid_to text NOT NULL,
  payment_mode text NOT NULL, -- 'Cash', 'Bank', 'UPI'
  notes text,
  
  -- Salary Link (if expense is salary-related)
  salary_record_id uuid, -- Will reference salary_records table
  
  -- Metadata
  is_finalized boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.staff(id) ON DELETE SET NULL
);

-- Salary Records Table
CREATE TABLE IF NOT EXISTS public.salary_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_code text NOT NULL,
  school_id uuid REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  financial_year_id uuid REFERENCES public.financial_years(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES public.staff(id) ON DELETE CASCADE,
  
  -- Salary Details
  salary_month date NOT NULL, -- First day of the month
  base_salary numeric(12, 2) NOT NULL DEFAULT 0,
  bonus numeric(12, 2) NOT NULL DEFAULT 0,
  deduction numeric(12, 2) NOT NULL DEFAULT 0,
  net_salary numeric(12, 2) NOT NULL, -- Computed: base_salary + bonus - deduction
  
  -- Payment Details
  payment_status text NOT NULL DEFAULT 'UNPAID', -- 'PAID', 'UNPAID'
  payment_date date,
  payment_mode text, -- 'Cash', 'Bank', 'UPI'
  payment_reference text,
  
  -- Metadata
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  
  -- Prevent duplicate salary for same staff and month
  UNIQUE(school_code, staff_id, salary_month)
);

-- Finance Audit Log Table
CREATE TABLE IF NOT EXISTS public.finance_audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_code text NOT NULL,
  table_name text NOT NULL, -- 'income_entries', 'expense_entries', 'salary_records'
  record_id uuid NOT NULL,
  action text NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'PAY_SALARY'
  old_values jsonb,
  new_values jsonb,
  changed_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_financial_years_school_code ON public.financial_years(school_code);
CREATE INDEX IF NOT EXISTS idx_financial_years_current ON public.financial_years(school_code, is_current);

CREATE INDEX IF NOT EXISTS idx_income_entries_school_code ON public.income_entries(school_code);
CREATE INDEX IF NOT EXISTS idx_income_entries_date ON public.income_entries(school_code, entry_date);
CREATE INDEX IF NOT EXISTS idx_income_entries_source ON public.income_entries(school_code, source);
CREATE INDEX IF NOT EXISTS idx_income_entries_financial_year ON public.income_entries(financial_year_id);

CREATE INDEX IF NOT EXISTS idx_expense_entries_school_code ON public.expense_entries(school_code);
CREATE INDEX IF NOT EXISTS idx_expense_entries_date ON public.expense_entries(school_code, entry_date);
CREATE INDEX IF NOT EXISTS idx_expense_entries_category ON public.expense_entries(school_code, category);
CREATE INDEX IF NOT EXISTS idx_expense_entries_financial_year ON public.expense_entries(financial_year_id);
CREATE INDEX IF NOT EXISTS idx_expense_entries_salary_record ON public.expense_entries(salary_record_id);

CREATE INDEX IF NOT EXISTS idx_salary_records_school_code ON public.salary_records(school_code);
CREATE INDEX IF NOT EXISTS idx_salary_records_staff ON public.salary_records(school_code, staff_id);
CREATE INDEX IF NOT EXISTS idx_salary_records_month ON public.salary_records(school_code, salary_month);
CREATE INDEX IF NOT EXISTS idx_salary_records_status ON public.salary_records(school_code, payment_status);
CREATE INDEX IF NOT EXISTS idx_salary_records_financial_year ON public.salary_records(financial_year_id);

CREATE INDEX IF NOT EXISTS idx_finance_audit_logs_school_code ON public.finance_audit_logs(school_code);
CREATE INDEX IF NOT EXISTS idx_finance_audit_logs_record ON public.finance_audit_logs(table_name, record_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.financial_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read financial_years" ON public.financial_years;
DROP POLICY IF EXISTS "Allow Admin/Accountant to manage financial_years" ON public.financial_years;
DROP POLICY IF EXISTS "Allow authenticated users to read income_entries" ON public.income_entries;
DROP POLICY IF EXISTS "Allow Admin/Accountant to manage income_entries" ON public.income_entries;
DROP POLICY IF EXISTS "Allow authenticated users to read expense_entries" ON public.expense_entries;
DROP POLICY IF EXISTS "Allow Admin/Accountant to manage expense_entries" ON public.expense_entries;
DROP POLICY IF EXISTS "Allow authenticated users to read salary_records" ON public.salary_records;
DROP POLICY IF EXISTS "Allow Admin/Accountant to manage salary_records" ON public.salary_records;
DROP POLICY IF EXISTS "Allow Admin/Accountant to read finance_audit_logs" ON public.finance_audit_logs;

-- FINANCIAL_YEARS: All authenticated users can read
CREATE POLICY "Allow authenticated users to read financial_years" ON public.financial_years
  FOR SELECT TO authenticated USING (true);

-- FINANCIAL_YEARS: Only Admin/Accountant can manage
CREATE POLICY "Allow Admin/Accountant to manage financial_years" ON public.financial_years
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id::text = auth.uid()::text
      AND staff.school_code = financial_years.school_code
      AND (staff.role IN ('Admin', 'Accountant', 'Principal') OR staff.designation IN ('Admin', 'Accountant', 'Principal'))
    )
  );

-- INCOME_ENTRIES: All authenticated users can read
CREATE POLICY "Allow authenticated users to read income_entries" ON public.income_entries
  FOR SELECT TO authenticated USING (true);

-- INCOME_ENTRIES: Only Admin/Accountant can manage
CREATE POLICY "Allow Admin/Accountant to manage income_entries" ON public.income_entries
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id::text = auth.uid()::text
      AND staff.school_code = income_entries.school_code
      AND (staff.role IN ('Admin', 'Accountant', 'Principal') OR staff.designation IN ('Admin', 'Accountant', 'Principal'))
    )
  );

-- EXPENSE_ENTRIES: All authenticated users can read
CREATE POLICY "Allow authenticated users to read expense_entries" ON public.expense_entries
  FOR SELECT TO authenticated USING (true);

-- EXPENSE_ENTRIES: Only Admin/Accountant can manage
CREATE POLICY "Allow Admin/Accountant to manage expense_entries" ON public.expense_entries
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id::text = auth.uid()::text
      AND staff.school_code = expense_entries.school_code
      AND (staff.role IN ('Admin', 'Accountant', 'Principal') OR staff.designation IN ('Admin', 'Accountant', 'Principal'))
    )
  );

-- SALARY_RECORDS: All authenticated users can read
CREATE POLICY "Allow authenticated users to read salary_records" ON public.salary_records
  FOR SELECT TO authenticated USING (true);

-- SALARY_RECORDS: Only Admin/Accountant can manage
CREATE POLICY "Allow Admin/Accountant to manage salary_records" ON public.salary_records
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id::text = auth.uid()::text
      AND staff.school_code = salary_records.school_code
      AND (staff.role IN ('Admin', 'Accountant', 'Principal') OR staff.designation IN ('Admin', 'Accountant', 'Principal'))
    )
  );

-- FINANCE_AUDIT_LOGS: Only Admin/Accountant can read
CREATE POLICY "Allow Admin/Accountant to read finance_audit_logs" ON public.finance_audit_logs
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id::text = auth.uid()::text
      AND staff.school_code = finance_audit_logs.school_code
      AND (staff.role IN ('Admin', 'Accountant', 'Principal') OR staff.designation IN ('Admin', 'Accountant', 'Principal'))
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION public.update_finance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update triggers
DROP TRIGGER IF EXISTS update_financial_years_updated_at ON public.financial_years;
CREATE TRIGGER update_financial_years_updated_at
  BEFORE UPDATE ON public.financial_years
  FOR EACH ROW
  EXECUTE FUNCTION public.update_finance_updated_at();

DROP TRIGGER IF EXISTS update_income_entries_updated_at ON public.income_entries;
CREATE TRIGGER update_income_entries_updated_at
  BEFORE UPDATE ON public.income_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_finance_updated_at();

DROP TRIGGER IF EXISTS update_expense_entries_updated_at ON public.expense_entries;
CREATE TRIGGER update_expense_entries_updated_at
  BEFORE UPDATE ON public.expense_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_finance_updated_at();

DROP TRIGGER IF EXISTS update_salary_records_updated_at ON public.salary_records;
CREATE TRIGGER update_salary_records_updated_at
  BEFORE UPDATE ON public.salary_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_finance_updated_at();

-- Trigger to compute net_salary
CREATE OR REPLACE FUNCTION public.compute_net_salary()
RETURNS TRIGGER AS $$
BEGIN
  NEW.net_salary := COALESCE(NEW.base_salary, 0) + COALESCE(NEW.bonus, 0) - COALESCE(NEW.deduction, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS compute_salary_net_salary ON public.salary_records;
CREATE TRIGGER compute_salary_net_salary
  BEFORE INSERT OR UPDATE ON public.salary_records
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_net_salary();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.financial_years IS 'Stores financial year definitions';
COMMENT ON TABLE public.income_entries IS 'Stores all income transactions';
COMMENT ON TABLE public.expense_entries IS 'Stores all expense transactions';
COMMENT ON TABLE public.salary_records IS 'Stores monthly salary records for staff';
COMMENT ON TABLE public.finance_audit_logs IS 'Audit trail for all finance operations';



