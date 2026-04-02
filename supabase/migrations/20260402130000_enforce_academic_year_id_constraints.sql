-- Enforce academic_year_id referential integrity (Task 4)
-- - Make academic_year_id NOT NULL
-- - Add FK to public.academic_years(id)
-- - Add indexes on (school_id, academic_year_id)
--
-- This migration is intentionally defensive:
-- it checks table/column existence before altering.

DO $$
DECLARE
  v_has_column boolean;
  v_has_school_id boolean;
  v_null_count bigint;
BEGIN
  -- ==========
  -- student_enrollments
  -- ==========
  IF to_regclass('public.student_enrollments') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='student_enrollments' AND column_name='academic_year_id'
    ) INTO v_has_column;

    IF v_has_column THEN
      SELECT COUNT(*) INTO v_null_count
      FROM public.student_enrollments
      WHERE academic_year_id IS NULL;

      IF v_null_count > 0 THEN
        RAISE EXCEPTION 'student_enrollments: % rows have academic_year_id IS NULL. Backfill must be completed before enforcing NOT NULL.', v_null_count;
      END IF;

      ALTER TABLE public.student_enrollments
        ALTER COLUMN academic_year_id SET NOT NULL;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname='fk_student_enrollments_academic_year_id'
      ) THEN
        ALTER TABLE public.student_enrollments
          ADD CONSTRAINT fk_student_enrollments_academic_year_id
          FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);
      END IF;

      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='student_enrollments' AND column_name='school_id'
      ) INTO v_has_school_id;

      IF v_has_school_id THEN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_student_enrollments_school_id_academic_year_id'
        ) THEN
          CREATE INDEX idx_student_enrollments_school_id_academic_year_id
            ON public.student_enrollments (school_id, academic_year_id);
        END IF;
      ELSE
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_student_enrollments_academic_year_id'
        ) THEN
          CREATE INDEX idx_student_enrollments_academic_year_id
            ON public.student_enrollments (academic_year_id);
        END IF;
      END IF;
    END IF;
  END IF;

  -- ==========
  -- student_attendance
  -- ==========
  IF to_regclass('public.student_attendance') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='student_attendance' AND column_name='academic_year_id'
    ) INTO v_has_column;

    IF v_has_column THEN
      SELECT COUNT(*) INTO v_null_count
      FROM public.student_attendance
      WHERE academic_year_id IS NULL;

      IF v_null_count > 0 THEN
        RAISE EXCEPTION 'student_attendance: % rows have academic_year_id IS NULL. Backfill must be completed before enforcing NOT NULL.', v_null_count;
      END IF;

      ALTER TABLE public.student_attendance
        ALTER COLUMN academic_year_id SET NOT NULL;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname='fk_student_attendance_academic_year_id'
      ) THEN
        ALTER TABLE public.student_attendance
          ADD CONSTRAINT fk_student_attendance_academic_year_id
          FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);
      END IF;

      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='student_attendance' AND column_name='school_id'
      ) INTO v_has_school_id;

      IF v_has_school_id THEN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_student_attendance_school_id_academic_year_id'
        ) THEN
          CREATE INDEX idx_student_attendance_school_id_academic_year_id
            ON public.student_attendance (school_id, academic_year_id);
        END IF;
      ELSE
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_student_attendance_academic_year_id'
        ) THEN
          CREATE INDEX idx_student_attendance_academic_year_id
            ON public.student_attendance (academic_year_id);
        END IF;
      END IF;
    END IF;
  END IF;

  -- ==========
  -- staff_attendance
  -- ==========
  IF to_regclass('public.staff_attendance') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='staff_attendance' AND column_name='academic_year_id'
    ) INTO v_has_column;

    IF v_has_column THEN
      SELECT COUNT(*) INTO v_null_count
      FROM public.staff_attendance
      WHERE academic_year_id IS NULL;

      IF v_null_count > 0 THEN
        RAISE EXCEPTION 'staff_attendance: % rows have academic_year_id IS NULL. Backfill must be completed before enforcing NOT NULL.', v_null_count;
      END IF;

      ALTER TABLE public.staff_attendance
        ALTER COLUMN academic_year_id SET NOT NULL;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname='fk_staff_attendance_academic_year_id'
      ) THEN
        ALTER TABLE public.staff_attendance
          ADD CONSTRAINT fk_staff_attendance_academic_year_id
          FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);
      END IF;

      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='staff_attendance' AND column_name='school_id'
      ) INTO v_has_school_id;

      IF v_has_school_id THEN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_staff_attendance_school_id_academic_year_id'
        ) THEN
          CREATE INDEX idx_staff_attendance_school_id_academic_year_id
            ON public.staff_attendance (school_id, academic_year_id);
        END IF;
      ELSE
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_staff_attendance_academic_year_id'
        ) THEN
          CREATE INDEX idx_staff_attendance_academic_year_id
            ON public.staff_attendance (academic_year_id);
        END IF;
      END IF;
    END IF;
  END IF;

  -- ==========
  -- marks
  -- ==========
  IF to_regclass('public.marks') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='marks' AND column_name='academic_year_id'
    ) INTO v_has_column;

    IF v_has_column THEN
      SELECT COUNT(*) INTO v_null_count
      FROM public.marks
      WHERE academic_year_id IS NULL;

      IF v_null_count > 0 THEN
        RAISE EXCEPTION 'marks: % rows have academic_year_id IS NULL. Backfill must be completed before enforcing NOT NULL.', v_null_count;
      END IF;

      ALTER TABLE public.marks
        ALTER COLUMN academic_year_id SET NOT NULL;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname='fk_marks_academic_year_id'
      ) THEN
        ALTER TABLE public.marks
          ADD CONSTRAINT fk_marks_academic_year_id
          FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);
      END IF;

      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='marks' AND column_name='school_id'
      ) INTO v_has_school_id;

      IF v_has_school_id THEN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_marks_school_id_academic_year_id'
        ) THEN
          CREATE INDEX idx_marks_school_id_academic_year_id
            ON public.marks (school_id, academic_year_id);
        END IF;
      ELSE
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_marks_academic_year_id'
        ) THEN
          CREATE INDEX idx_marks_academic_year_id
            ON public.marks (academic_year_id);
        END IF;
      END IF;
    END IF;
  END IF;

  -- ==========
  -- fees (legacy fees table)
  -- ==========
  IF to_regclass('public.fees') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='fees' AND column_name='academic_year_id'
    ) INTO v_has_column;

    IF v_has_column THEN
      SELECT COUNT(*) INTO v_null_count
      FROM public.fees
      WHERE academic_year_id IS NULL;

      IF v_null_count > 0 THEN
        RAISE EXCEPTION 'fees: % rows have academic_year_id IS NULL. Backfill must be completed before enforcing NOT NULL.', v_null_count;
      END IF;

      ALTER TABLE public.fees
        ALTER COLUMN academic_year_id SET NOT NULL;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname='fk_fees_academic_year_id'
      ) THEN
        ALTER TABLE public.fees
          ADD CONSTRAINT fk_fees_academic_year_id
          FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);
      END IF;

      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='fees' AND column_name='school_id'
      ) INTO v_has_school_id;

      IF v_has_school_id THEN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_fees_school_id_academic_year_id'
        ) THEN
          CREATE INDEX idx_fees_school_id_academic_year_id
            ON public.fees (school_id, academic_year_id);
        END IF;
      ELSE
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_fees_academic_year_id'
        ) THEN
          CREATE INDEX idx_fees_academic_year_id
            ON public.fees (academic_year_id);
        END IF;
      END IF;
    END IF;
  END IF;

  -- ==========
  -- classes
  -- ==========
  IF to_regclass('public.classes') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='classes' AND column_name='academic_year_id'
    ) INTO v_has_column;

    IF v_has_column THEN
      SELECT COUNT(*) INTO v_null_count
      FROM public.classes
      WHERE academic_year_id IS NULL;

      IF v_null_count > 0 THEN
        RAISE EXCEPTION 'classes: % rows have academic_year_id IS NULL. Backfill must be completed before enforcing NOT NULL.', v_null_count;
      END IF;

      ALTER TABLE public.classes
        ALTER COLUMN academic_year_id SET NOT NULL;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname='fk_classes_academic_year_id'
      ) THEN
        ALTER TABLE public.classes
          ADD CONSTRAINT fk_classes_academic_year_id
          FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_classes_school_id_academic_year_id'
      ) THEN
        -- classes always has school_id in this codebase
        CREATE INDEX idx_classes_school_id_academic_year_id
          ON public.classes (school_id, academic_year_id);
      END IF;
    END IF;
  END IF;

  -- ==========
  -- sections (if present)
  -- ==========
  IF to_regclass('public.sections') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='sections' AND column_name='academic_year_id'
    ) INTO v_has_column;

    IF v_has_column THEN
      SELECT COUNT(*) INTO v_null_count
      FROM public.sections
      WHERE academic_year_id IS NULL;

      IF v_null_count > 0 THEN
        RAISE EXCEPTION 'sections: % rows have academic_year_id IS NULL. Backfill must be completed before enforcing NOT NULL.', v_null_count;
      END IF;

      ALTER TABLE public.sections
        ALTER COLUMN academic_year_id SET NOT NULL;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname='fk_sections_academic_year_id'
      ) THEN
        ALTER TABLE public.sections
          ADD CONSTRAINT fk_sections_academic_year_id
          FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='sections' AND column_name='school_id'
      ) THEN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_sections_school_id_academic_year_id'
        ) THEN
          CREATE INDEX idx_sections_school_id_academic_year_id
            ON public.sections (school_id, academic_year_id);
        END IF;
      END IF;
    END IF;
  END IF;

  -- ==========
  -- exams (legacy/existing table if present)
  -- ==========
  IF to_regclass('public.exams') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='exams' AND column_name='academic_year_id'
    ) INTO v_has_column;

    IF v_has_column THEN
      SELECT COUNT(*) INTO v_null_count
      FROM public.exams
      WHERE academic_year_id IS NULL;

      IF v_null_count > 0 THEN
        RAISE EXCEPTION 'exams: % rows have academic_year_id IS NULL. Backfill must be completed before enforcing NOT NULL.', v_null_count;
      END IF;

      ALTER TABLE public.exams
        ALTER COLUMN academic_year_id SET NOT NULL;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname='fk_exams_academic_year_id'
      ) THEN
        ALTER TABLE public.exams
          ADD CONSTRAINT fk_exams_academic_year_id
          FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='exams' AND column_name='school_id'
      ) THEN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_exams_school_id_academic_year_id'
        ) THEN
          CREATE INDEX idx_exams_school_id_academic_year_id
            ON public.exams (school_id, academic_year_id);
        END IF;
      END IF;
    END IF;
  END IF;

  -- ==========
  -- examinations (main exams table in this repo)
  -- ==========
  IF to_regclass('public.examinations') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='examinations' AND column_name='academic_year_id'
    ) INTO v_has_column;

    IF v_has_column THEN
      SELECT COUNT(*) INTO v_null_count
      FROM public.examinations
      WHERE academic_year_id IS NULL;

      IF v_null_count > 0 THEN
        RAISE EXCEPTION 'examinations: % rows have academic_year_id IS NULL. Backfill must be completed before enforcing NOT NULL.', v_null_count;
      END IF;

      ALTER TABLE public.examinations
        ALTER COLUMN academic_year_id SET NOT NULL;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname='fk_examinations_academic_year_id'
      ) THEN
        ALTER TABLE public.examinations
          ADD CONSTRAINT fk_examinations_academic_year_id
          FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='examinations' AND column_name='school_id'
      ) THEN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_examinations_school_id_academic_year_id'
        ) THEN
          CREATE INDEX idx_examinations_school_id_academic_year_id
            ON public.examinations (school_id, academic_year_id);
        END IF;
      END IF;
    END IF;
  END IF;
END $$;

