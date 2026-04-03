-- Aadhaar must be unique per school, not globally across all tenants.
-- Without this change, school B cannot import staff whose Aadhaar already exists under school A.
--
-- Apply in Supabase: SQL Editor → run this script, or `supabase db push` if you use the CLI.
--
-- If DROP fails with "constraint does not exist", find the exact name under
-- Database → staff table → Constraints (look for UNIQUE on adhar_no only).

ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_adhar_no_unique;
-- PostgreSQL default naming for UNIQUE(column)
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_adhar_no_key;
-- If uniqueness was created as a standalone unique index
DROP INDEX IF EXISTS public.staff_adhar_no_unique;

-- One non-null Aadhaar per (school_code); multiple NULLs allowed; same Aadhaar OK in different schools.
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_school_code_adhar_no_unique
  ON public.staff (school_code, adhar_no)
  WHERE adhar_no IS NOT NULL AND btrim(adhar_no::text) <> '';
