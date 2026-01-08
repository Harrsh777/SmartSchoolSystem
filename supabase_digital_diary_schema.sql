-- ============================================
-- DIGITAL DIARY SCHEMA
-- Smart School ERP - Supabase + Next.js
-- ============================================

-- Diary Type Enum
CREATE TYPE diary_type AS ENUM (
  'HOMEWORK',
  'ANNOUNCEMENT',
  'HOLIDAY',
  'OTHER'
);

-- Diary Mode Enum
CREATE TYPE diary_mode AS ENUM (
  'GENERAL',
  'SUBJECT_WISE'
);

-- Diary Entries Table
CREATE TABLE IF NOT EXISTS public.diaries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_code text NOT NULL,
  school_id uuid REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  
  -- Diary Details
  title text NOT NULL,
  content text, -- Rich text/HTML content
  type diary_type NOT NULL,
  mode diary_mode DEFAULT 'GENERAL',
  
  -- Metadata
  created_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone,
  is_active boolean DEFAULT true
);

-- Diary Target Classes/Sections (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.diary_targets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  diary_id uuid REFERENCES public.diaries(id) ON DELETE CASCADE,
  class_id uuid, -- References classes table (if exists) or store as text
  class_name text NOT NULL,
  section_id uuid, -- References sections table (if exists) or store as text
  section_name text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(diary_id, class_name, section_name)
);

-- Diary Read Receipts
CREATE TABLE IF NOT EXISTS public.diary_reads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  diary_id uuid REFERENCES public.diaries(id) ON DELETE CASCADE,
  user_id uuid, -- Can be student_id or parent_id
  user_type text NOT NULL, -- 'STUDENT' or 'PARENT'
  read_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(diary_id, user_id, user_type)
);

-- Diary Attachments
CREATE TABLE IF NOT EXISTS public.diary_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  diary_id uuid REFERENCES public.diaries(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL, -- 'PDF', 'IMAGE', 'OTHER'
  file_size bigint, -- Size in bytes
  uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
  uploaded_by uuid REFERENCES public.staff(id) ON DELETE SET NULL
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_diaries_school_code ON public.diaries(school_code);
CREATE INDEX IF NOT EXISTS idx_diaries_academic_year ON public.diaries(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_diaries_type ON public.diaries(school_code, type);
CREATE INDEX IF NOT EXISTS idx_diaries_created_at ON public.diaries(school_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diaries_active ON public.diaries(school_code, is_active) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_diary_targets_diary ON public.diary_targets(diary_id);
CREATE INDEX IF NOT EXISTS idx_diary_targets_class ON public.diary_targets(class_name, section_name);

CREATE INDEX IF NOT EXISTS idx_diary_reads_diary ON public.diary_reads(diary_id);
CREATE INDEX IF NOT EXISTS idx_diary_reads_user ON public.diary_reads(user_id, user_type);

CREATE INDEX IF NOT EXISTS idx_diary_attachments_diary ON public.diary_attachments(diary_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.diaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read diaries" ON public.diaries;
DROP POLICY IF EXISTS "Allow Admin/Teacher to manage diaries" ON public.diaries;
DROP POLICY IF EXISTS "Allow authenticated users to read diary_targets" ON public.diary_targets;
DROP POLICY IF EXISTS "Allow Admin/Teacher to manage diary_targets" ON public.diary_targets;
DROP POLICY IF EXISTS "Allow authenticated users to read diary_reads" ON public.diary_reads;
DROP POLICY IF EXISTS "Allow users to manage own diary_reads" ON public.diary_reads;
DROP POLICY IF EXISTS "Allow authenticated users to read diary_attachments" ON public.diary_attachments;
DROP POLICY IF EXISTS "Allow Admin/Teacher to manage diary_attachments" ON public.diary_attachments;

-- DIARIES: All authenticated users can read (filtered by school)
CREATE POLICY "Allow authenticated users to read diaries" ON public.diaries
  FOR SELECT TO authenticated USING (
    school_code IN (
      SELECT school_code FROM public.staff WHERE id::text = auth.uid()::text
      UNION
      SELECT school_code FROM public.students WHERE id::text = auth.uid()::text
    )
    AND deleted_at IS NULL
    AND is_active = true
  );

-- DIARIES: Only Admin/Teacher can manage
CREATE POLICY "Allow Admin/Teacher to manage diaries" ON public.diaries
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id::text = auth.uid()::text
      AND staff.school_code = diaries.school_code
      AND (staff.role IN ('Admin', 'Teacher', 'Principal') OR staff.designation IN ('Admin', 'Teacher', 'Principal'))
    )
  );

-- DIARY_TARGETS: All authenticated users can read
CREATE POLICY "Allow authenticated users to read diary_targets" ON public.diary_targets
  FOR SELECT TO authenticated USING (true);

-- DIARY_TARGETS: Only Admin/Teacher can manage
CREATE POLICY "Allow Admin/Teacher to manage diary_targets" ON public.diary_targets
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.diaries d
      JOIN public.staff s ON s.school_code = d.school_code
      WHERE d.id = diary_targets.diary_id
      AND s.id::text = auth.uid()::text
      AND (s.role IN ('Admin', 'Teacher', 'Principal') OR s.designation IN ('Admin', 'Teacher', 'Principal'))
    )
  );

-- DIARY_READS: All authenticated users can read
CREATE POLICY "Allow authenticated users to read diary_reads" ON public.diary_reads
  FOR SELECT TO authenticated USING (true);

-- DIARY_READS: Users can manage their own reads
CREATE POLICY "Allow users to manage own diary_reads" ON public.diary_reads
  FOR ALL TO authenticated USING (
    user_id::text = auth.uid()::text
  );

-- DIARY_ATTACHMENTS: All authenticated users can read
CREATE POLICY "Allow authenticated users to read diary_attachments" ON public.diary_attachments
  FOR SELECT TO authenticated USING (true);

-- DIARY_ATTACHMENTS: Only Admin/Teacher can manage
CREATE POLICY "Allow Admin/Teacher to manage diary_attachments" ON public.diary_attachments
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.diaries d
      JOIN public.staff s ON s.school_code = d.school_code
      WHERE d.id = diary_attachments.diary_id
      AND s.id::text = auth.uid()::text
      AND (s.role IN ('Admin', 'Teacher', 'Principal') OR s.designation IN ('Admin', 'Teacher', 'Principal'))
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION public.update_diary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_diaries_updated_at ON public.diaries;
CREATE TRIGGER update_diaries_updated_at
  BEFORE UPDATE ON public.diaries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_diary_updated_at();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.diaries IS 'Stores digital diary entries (homework, announcements, holidays, etc.)';
COMMENT ON TABLE public.diary_targets IS 'Stores which classes/sections each diary entry is assigned to';
COMMENT ON TABLE public.diary_reads IS 'Tracks read receipts for diary entries';
COMMENT ON TABLE public.diary_attachments IS 'Stores file attachments for diary entries';

