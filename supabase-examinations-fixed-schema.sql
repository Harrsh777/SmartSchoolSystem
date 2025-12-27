-- =====================================================
-- EXAMINATIONS & MARKS ENTRY SYSTEM - FIXED SCHEMA
-- =====================================================

-- Drop existing constraints if they exist (in case of previous incorrect schema)
DO $$ 
BEGIN
  -- Drop exam_subjects constraints
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_subjects_subject_id_fkey') THEN
    ALTER TABLE public.exam_subjects DROP CONSTRAINT IF EXISTS exam_subjects_subject_id_fkey;
  END IF;
  
  -- Drop student_subject_marks constraints
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_subject_marks_subject_id_fkey') THEN
    ALTER TABLE public.student_subject_marks DROP CONSTRAINT IF EXISTS student_subject_marks_subject_id_fkey;
  END IF;
  
  -- Drop examinations constraints
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'examinations_class_id_fkey') THEN
    ALTER TABLE public.examinations DROP CONSTRAINT IF EXISTS examinations_class_id_fkey;
  END IF;
  
  -- Drop student_subject_marks class_id constraint
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_subject_marks_class_id_fkey') THEN
    ALTER TABLE public.student_subject_marks DROP CONSTRAINT IF EXISTS student_subject_marks_class_id_fkey;
  END IF;
END $$;

-- Verify subjects table exists (create if it doesn't - basic structure)
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  school_code TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
  CONSTRAINT subjects_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- 1. Examinations table (created by Principal)
CREATE TABLE IF NOT EXISTS public.examinations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  school_code TEXT NOT NULL,
  class_id UUID NOT NULL,
  name TEXT NOT NULL,
  exam_type TEXT NULL,
  total_max_marks INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
  CONSTRAINT examinations_pkey PRIMARY KEY (id),
  CONSTRAINT examinations_school_id_fkey FOREIGN KEY (school_id) REFERENCES accepted_schools (id) ON DELETE CASCADE,
  CONSTRAINT examinations_total_max_marks_check CHECK (total_max_marks >= 0)
) TABLESPACE pg_default;

-- Add missing columns and constraints for examinations table
DO $$
BEGIN
  -- Add class_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'examinations' 
    AND column_name = 'class_id'
  ) THEN
    ALTER TABLE public.examinations ADD COLUMN class_id UUID;
  END IF;
  
  -- Add created_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'examinations' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.examinations ADD COLUMN created_by UUID;
  END IF;
  
  -- Add foreign key constraint for class_id only if classes table exists and column exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'classes') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'examinations' 
      AND column_name = 'class_id'
    ) THEN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'examinations_class_id_fkey') THEN
        ALTER TABLE public.examinations 
        ADD CONSTRAINT examinations_class_id_fkey 
        FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE;
      END IF;
    END IF;
  END IF;
  
  -- Add foreign key constraint for created_by only if staff table exists and column exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'examinations' 
      AND column_name = 'created_by'
    ) THEN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'examinations_created_by_fkey') THEN
        ALTER TABLE public.examinations 
        ADD CONSTRAINT examinations_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES staff (id) ON DELETE RESTRICT;
      END IF;
    END IF;
  END IF;
END $$;

-- 2. Exam Subjects (subjects + max marks per exam)
CREATE TABLE IF NOT EXISTS public.exam_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  max_marks INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
  CONSTRAINT exam_subjects_pkey PRIMARY KEY (id),
  CONSTRAINT exam_subjects_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES examinations (id) ON DELETE CASCADE,
  CONSTRAINT exam_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE,
  CONSTRAINT exam_subjects_unique UNIQUE (exam_id, subject_id),
  CONSTRAINT exam_subjects_max_marks_check CHECK (max_marks > 0)
) TABLESPACE pg_default;

-- 3. Student Subject Marks (core marks entry table)
CREATE TABLE IF NOT EXISTS public.student_subject_marks (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL,
  student_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  class_id UUID NOT NULL,
  school_id UUID NOT NULL,
  school_code TEXT NOT NULL,
  max_marks INTEGER NOT NULL,
  marks_obtained INTEGER NOT NULL,
  remarks TEXT NULL,
  entered_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
  CONSTRAINT student_subject_marks_pkey PRIMARY KEY (id),
  CONSTRAINT student_subject_marks_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES examinations (id) ON DELETE CASCADE,
  CONSTRAINT student_subject_marks_student_id_fkey FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT student_subject_marks_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE,
  CONSTRAINT student_subject_marks_school_id_fkey FOREIGN KEY (school_id) REFERENCES accepted_schools (id) ON DELETE CASCADE,
  CONSTRAINT student_subject_marks_entered_by_fkey FOREIGN KEY (entered_by) REFERENCES staff (id) ON DELETE RESTRICT,
  CONSTRAINT student_subject_marks_unique UNIQUE (exam_id, student_id, subject_id),
  CONSTRAINT student_subject_marks_obtained_check CHECK (marks_obtained >= 0),
  CONSTRAINT student_subject_marks_max_check CHECK (marks_obtained <= max_marks)
) TABLESPACE pg_default;

-- Add class_id column if it doesn't exist, then add foreign key constraint
DO $$
BEGIN
  -- Add class_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'student_subject_marks' 
    AND column_name = 'class_id'
  ) THEN
    ALTER TABLE public.student_subject_marks ADD COLUMN class_id UUID;
  END IF;
  
  -- Add foreign key constraint only if classes table exists and column exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'classes') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'student_subject_marks' 
      AND column_name = 'class_id'
    ) THEN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_subject_marks_class_id_fkey') THEN
        ALTER TABLE public.student_subject_marks 
        ADD CONSTRAINT student_subject_marks_class_id_fkey 
        FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE;
      END IF;
    END IF;
  END IF;
END $$;

-- 4. Student Exam Summary (auto-calculated totals)
CREATE TABLE IF NOT EXISTS public.student_exam_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL,
  student_id UUID NOT NULL,
  school_id UUID NOT NULL,
  school_code TEXT NOT NULL,
  total_marks INTEGER NOT NULL DEFAULT 0,
  total_max_marks INTEGER NOT NULL DEFAULT 0,
  percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
  grade TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
  CONSTRAINT student_exam_summary_pkey PRIMARY KEY (id),
  CONSTRAINT student_exam_summary_unique UNIQUE (exam_id, student_id),
  CONSTRAINT student_exam_summary_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES examinations (id) ON DELETE CASCADE,
  CONSTRAINT student_exam_summary_student_id_fkey FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT student_exam_summary_school_id_fkey FOREIGN KEY (school_id) REFERENCES accepted_schools (id) ON DELETE CASCADE,
  CONSTRAINT student_exam_summary_percentage_check CHECK (percentage >= 0 AND percentage <= 100)
) TABLESPACE pg_default;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_examinations_school_code ON public.examinations USING btree (school_code) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_examinations_school_id ON public.examinations USING btree (school_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_examinations_class_id ON public.examinations USING btree (class_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_examinations_created_by ON public.examinations USING btree (created_by) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_exam_subjects_exam_id ON public.exam_subjects USING btree (exam_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_exam_subjects_subject_id ON public.exam_subjects USING btree (subject_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_student_subject_marks_exam_id ON public.student_subject_marks USING btree (exam_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_student_subject_marks_student_id ON public.student_subject_marks USING btree (student_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_student_subject_marks_subject_id ON public.student_subject_marks USING btree (subject_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_student_subject_marks_class_id ON public.student_subject_marks USING btree (class_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_student_subject_marks_school_code ON public.student_subject_marks USING btree (school_code) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_student_exam_summary_exam_id ON public.student_exam_summary USING btree (exam_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_student_exam_summary_student_id ON public.student_exam_summary USING btree (student_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_student_exam_summary_school_code ON public.student_exam_summary USING btree (school_code) TABLESPACE pg_default;

-- Triggers
DROP TRIGGER IF EXISTS update_examinations_updated_at ON public.examinations;
CREATE TRIGGER update_examinations_updated_at
  BEFORE UPDATE ON public.examinations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_subject_marks_updated_at ON public.student_subject_marks;
CREATE TRIGGER update_student_subject_marks_updated_at
  BEFORE UPDATE ON public.student_subject_marks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_exam_summary_updated_at ON public.student_exam_summary;
CREATE TRIGGER update_student_exam_summary_updated_at
  BEFORE UPDATE ON public.student_exam_summary
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-calculate exam summary
CREATE OR REPLACE FUNCTION calculate_exam_summary()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO student_exam_summary (
    exam_id,
    student_id,
    school_id,
    school_code,
    total_marks,
    total_max_marks,
    percentage
  )
  SELECT
    NEW.exam_id,
    NEW.student_id,
    NEW.school_id,
    NEW.school_code,
    COALESCE(SUM(marks_obtained), 0),
    COALESCE(SUM(max_marks), 0),
    CASE 
      WHEN COALESCE(SUM(max_marks), 0) > 0 
      THEN ROUND((COALESCE(SUM(marks_obtained), 0)::NUMERIC / COALESCE(SUM(max_marks), 0)) * 100, 2)
      ELSE 0
    END
  FROM student_subject_marks
  WHERE exam_id = NEW.exam_id
    AND student_id = NEW.student_id
  GROUP BY exam_id, student_id, school_id, school_code
  ON CONFLICT (exam_id, student_id)
  DO UPDATE SET
    total_marks = EXCLUDED.total_marks,
    total_max_marks = EXCLUDED.total_max_marks,
    percentage = EXCLUDED.percentage,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate summary
DROP TRIGGER IF EXISTS trg_calculate_exam_summary ON public.student_subject_marks;
CREATE TRIGGER trg_calculate_exam_summary
  AFTER INSERT OR UPDATE ON public.student_subject_marks
  FOR EACH ROW
  EXECUTE FUNCTION calculate_exam_summary();

-- Comments
COMMENT ON TABLE public.examinations IS 'Examinations created by Principal for classes';
COMMENT ON TABLE public.exam_subjects IS 'Subjects and max marks for each examination';
COMMENT ON TABLE public.student_subject_marks IS 'Subject-wise marks for each student in each exam';
COMMENT ON TABLE public.student_exam_summary IS 'Auto-calculated total marks and percentage per student per exam';

