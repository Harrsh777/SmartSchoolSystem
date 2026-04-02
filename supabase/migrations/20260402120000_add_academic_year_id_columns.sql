-- Add nullable academic_year_id UUID partition key columns (no constraints yet)
-- TASK 1: schema refactor foundation

DO $$
BEGIN
  -- student_enrollments
  IF to_regclass('public.student_enrollments') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'student_enrollments'
        AND column_name = 'academic_year_id'
    ) THEN
      ALTER TABLE public.student_enrollments
      ADD COLUMN academic_year_id uuid;
    END IF;
  END IF;

  -- attendance (in this codebase: student_attendance + staff_attendance)
  IF to_regclass('public.student_attendance') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'student_attendance'
        AND column_name = 'academic_year_id'
    ) THEN
      ALTER TABLE public.student_attendance
      ADD COLUMN academic_year_id uuid;
    END IF;
  END IF;

  IF to_regclass('public.staff_attendance') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'staff_attendance'
        AND column_name = 'academic_year_id'
    ) THEN
      ALTER TABLE public.staff_attendance
      ADD COLUMN academic_year_id uuid;
    END IF;
  END IF;

  -- marks (in this codebase: marks table used by /api/marks)
  IF to_regclass('public.marks') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'marks'
        AND column_name = 'academic_year_id'
    ) THEN
      ALTER TABLE public.marks
      ADD COLUMN academic_year_id uuid;
    END IF;
  END IF;

  -- fees (legacy fees table used by /api/fees)
  IF to_regclass('public.fees') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'fees'
        AND column_name = 'academic_year_id'
    ) THEN
      ALTER TABLE public.fees
      ADD COLUMN academic_year_id uuid;
    END IF;
  END IF;

  -- classes
  IF to_regclass('public.classes') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'classes'
        AND column_name = 'academic_year_id'
    ) THEN
      ALTER TABLE public.classes
      ADD COLUMN academic_year_id uuid;
    END IF;
  END IF;

  -- sections (legacy/possible separate table; this repo primarily uses classes.section)
  IF to_regclass('public.sections') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'sections'
        AND column_name = 'academic_year_id'
    ) THEN
      ALTER TABLE public.sections
      ADD COLUMN academic_year_id uuid;
    END IF;
  END IF;

  -- exams (legacy possible: exams; main app table: examinations)
  IF to_regclass('public.exams') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'exams'
        AND column_name = 'academic_year_id'
    ) THEN
      ALTER TABLE public.exams
      ADD COLUMN academic_year_id uuid;
    END IF;
  END IF;

  IF to_regclass('public.examinations') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'examinations'
        AND column_name = 'academic_year_id'
    ) THEN
      ALTER TABLE public.examinations
      ADD COLUMN academic_year_id uuid;
    END IF;
  END IF;
END $$;

