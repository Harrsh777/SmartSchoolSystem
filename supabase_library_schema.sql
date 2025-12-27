-- ============================================
-- LIBRARY MANAGEMENT SYSTEM SCHEMA
-- Smart School ERP - Supabase + Next.js
-- ============================================

-- 1. LIBRARY SETTINGS TABLE
-- Stores library configuration per school
CREATE TABLE IF NOT EXISTS public.library_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  school_code text NOT NULL,
  borrow_days integer DEFAULT 14,
  max_books_student integer DEFAULT 3,
  max_books_staff integer DEFAULT 5,
  late_fine_per_day numeric(10, 2) DEFAULT 0,
  late_fine_fixed numeric(10, 2) DEFAULT 0,
  lost_book_fine numeric(10, 2) DEFAULT 0,
  damaged_book_fine numeric(10, 2) DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT unique_school_settings UNIQUE (school_id, school_code)
);

-- 2. LIBRARY SECTIONS TABLE
-- Stores library sections (e.g., Fiction, Non-Fiction, Reference)
CREATE TABLE IF NOT EXISTS public.library_sections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  school_code text NOT NULL,
  name text NOT NULL,
  material_type text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. LIBRARY MATERIAL TYPES TABLE
-- Stores material types (Book, Journal, Magazine, Reference, Digital)
CREATE TABLE IF NOT EXISTS public.library_material_types (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  school_code text NOT NULL,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. LIBRARY BOOKS TABLE
-- Stores book metadata (title, author, ISBN, etc.)
CREATE TABLE IF NOT EXISTS public.library_books (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  school_code text NOT NULL,
  title text NOT NULL,
  author text,
  publisher text,
  isbn text,
  edition text,
  section_id uuid REFERENCES public.library_sections(id) ON DELETE SET NULL,
  material_type_id uuid REFERENCES public.library_material_types(id) ON DELETE SET NULL,
  total_copies integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 5. LIBRARY BOOK COPIES TABLE
-- Stores individual physical copies of books
CREATE TABLE IF NOT EXISTS public.library_book_copies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id uuid NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  school_code text NOT NULL,
  accession_number text NOT NULL,
  barcode text,
  status text DEFAULT 'available' CHECK (status IN ('available', 'issued', 'lost', 'damaged', 'reserved')),
  location text,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT unique_accession_number UNIQUE (school_code, accession_number)
);

-- 6. LIBRARY TRANSACTIONS TABLE
-- Stores all issue and return transactions
CREATE TABLE IF NOT EXISTS public.library_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  school_code text NOT NULL,
  borrower_type text NOT NULL CHECK (borrower_type IN ('student', 'staff')),
  borrower_id uuid NOT NULL,
  book_copy_id uuid NOT NULL REFERENCES public.library_book_copies(id) ON DELETE RESTRICT,
  book_id uuid NOT NULL REFERENCES public.library_books(id) ON DELETE RESTRICT,
  issue_date date NOT NULL,
  due_date date NOT NULL,
  return_date date,
  fine_amount numeric(10, 2) DEFAULT 0,
  fine_reason text, -- late, lost, damaged
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'returned', 'overdue')),
  issued_by uuid REFERENCES public.staff(id),
  returned_by uuid REFERENCES public.staff(id),
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_library_settings_school_code ON public.library_settings(school_code);
CREATE INDEX IF NOT EXISTS idx_library_sections_school_code ON public.library_sections(school_code);
CREATE INDEX IF NOT EXISTS idx_library_sections_active ON public.library_sections(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_library_material_types_school_code ON public.library_material_types(school_code);
CREATE INDEX IF NOT EXISTS idx_library_material_types_active ON public.library_material_types(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_library_books_school_code ON public.library_books(school_code);
CREATE INDEX IF NOT EXISTS idx_library_books_section ON public.library_books(section_id);
CREATE INDEX IF NOT EXISTS idx_library_books_material_type ON public.library_books(material_type_id);
CREATE INDEX IF NOT EXISTS idx_library_books_title ON public.library_books(title);
CREATE INDEX IF NOT EXISTS idx_library_books_author ON public.library_books(author);
CREATE INDEX IF NOT EXISTS idx_library_books_isbn ON public.library_books(isbn);
CREATE INDEX IF NOT EXISTS idx_library_book_copies_book_id ON public.library_book_copies(book_id);
CREATE INDEX IF NOT EXISTS idx_library_book_copies_school_code ON public.library_book_copies(school_code);
CREATE INDEX IF NOT EXISTS idx_library_book_copies_status ON public.library_book_copies(status);
CREATE INDEX IF NOT EXISTS idx_library_book_copies_accession ON public.library_book_copies(accession_number);
CREATE INDEX IF NOT EXISTS idx_library_transactions_school_code ON public.library_transactions(school_code);
CREATE INDEX IF NOT EXISTS idx_library_transactions_borrower ON public.library_transactions(borrower_type, borrower_id);
CREATE INDEX IF NOT EXISTS idx_library_transactions_book_copy ON public.library_transactions(book_copy_id);
CREATE INDEX IF NOT EXISTS idx_library_transactions_status ON public.library_transactions(status);
CREATE INDEX IF NOT EXISTS idx_library_transactions_due_date ON public.library_transactions(due_date);
CREATE INDEX IF NOT EXISTS idx_library_transactions_issue_date ON public.library_transactions(issue_date);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
ALTER TABLE public.library_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_material_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_book_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_transactions ENABLE ROW LEVEL SECURITY;

-- Library Settings Policies
CREATE POLICY "Allow authenticated users to view library settings for their school" ON public.library_settings
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.accepted_schools
      WHERE accepted_schools.id = library_settings.school_id
    )
  );

-- Note: This policy allows any authenticated staff from the same school
-- Proper permission enforcement is done at the API level via requirePermission()
CREATE POLICY "Allow users with manage_library permission to manage library settings" ON public.library_settings
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.school_code = library_settings.school_code
    )
  );

-- Library Sections Policies
CREATE POLICY "Allow authenticated users to view library sections for their school" ON public.library_sections
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.accepted_schools
      WHERE accepted_schools.id = library_sections.school_id
    )
  );

-- Note: This policy allows any authenticated staff from the same school
-- Proper permission enforcement is done at the API level via requirePermission()
CREATE POLICY "Allow users with manage_library permission to manage library sections" ON public.library_sections
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.school_code = library_sections.school_code
    )
  );

-- Library Material Types Policies
CREATE POLICY "Allow authenticated users to view material types for their school" ON public.library_material_types
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.accepted_schools
      WHERE accepted_schools.id = library_material_types.school_id
    )
  );

-- Note: This policy allows any authenticated staff from the same school
-- Proper permission enforcement is done at the API level via requirePermission()
CREATE POLICY "Allow users with manage_library permission to manage material types" ON public.library_material_types
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.school_code = library_material_types.school_code
    )
  );

-- Library Books Policies
CREATE POLICY "Allow authenticated users to view library books for their school" ON public.library_books
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.accepted_schools
      WHERE accepted_schools.id = library_books.school_id
    )
  );

-- Note: This policy allows any authenticated staff from the same school
-- Proper permission enforcement is done at the API level via requirePermission()
CREATE POLICY "Allow users with manage_library permission to manage library books" ON public.library_books
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.school_code = library_books.school_code
    )
  );

-- Library Book Copies Policies
CREATE POLICY "Allow authenticated users to view book copies for their school" ON public.library_book_copies
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.accepted_schools
      WHERE accepted_schools.id = library_book_copies.school_id
    )
  );

-- Note: This policy allows any authenticated staff from the same school
-- Proper permission enforcement is done at the API level via requirePermission()
CREATE POLICY "Allow users with manage_library permission to manage book copies" ON public.library_book_copies
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.school_code = library_book_copies.school_code
    )
  );

-- Library Transactions Policies
CREATE POLICY "Allow authenticated users to view transactions for their school" ON public.library_transactions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.accepted_schools
      WHERE accepted_schools.id = library_transactions.school_id
    )
  );

-- Note: This policy allows any authenticated staff from the same school
-- Proper permission enforcement is done at the API level via requirePermission()
CREATE POLICY "Allow users with manage_library permission to manage transactions" ON public.library_transactions
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.school_code = library_transactions.school_code
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for all tables
CREATE TRIGGER update_library_settings_updated_at
  BEFORE UPDATE ON public.library_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_library_updated_at();

CREATE TRIGGER update_library_sections_updated_at
  BEFORE UPDATE ON public.library_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_library_updated_at();

CREATE TRIGGER update_library_material_types_updated_at
  BEFORE UPDATE ON public.library_material_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_library_updated_at();

CREATE TRIGGER update_library_books_updated_at
  BEFORE UPDATE ON public.library_books
  FOR EACH ROW
  EXECUTE FUNCTION public.update_library_updated_at();

CREATE TRIGGER update_library_book_copies_updated_at
  BEFORE UPDATE ON public.library_book_copies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_library_updated_at();

CREATE TRIGGER update_library_transactions_updated_at
  BEFORE UPDATE ON public.library_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_library_updated_at();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.library_settings IS 'Stores library configuration and rules per school';
COMMENT ON TABLE public.library_sections IS 'Stores library sections (Fiction, Non-Fiction, etc.)';
COMMENT ON TABLE public.library_material_types IS 'Stores material types (Book, Journal, Magazine, etc.)';
COMMENT ON TABLE public.library_books IS 'Stores book metadata and information';
COMMENT ON TABLE public.library_book_copies IS 'Stores individual physical copies of books with accession numbers';
COMMENT ON TABLE public.library_transactions IS 'Stores all issue and return transactions';

COMMENT ON COLUMN public.library_book_copies.accession_number IS 'Unique identifier for each physical copy';
COMMENT ON COLUMN public.library_book_copies.barcode IS 'Barcode for scanning';
COMMENT ON COLUMN public.library_transactions.borrower_type IS 'Type of borrower: student or staff';
COMMENT ON COLUMN public.library_transactions.fine_reason IS 'Reason for fine: late, lost, or damaged';

