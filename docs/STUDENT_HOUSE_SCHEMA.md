# Student–House Mapping (Institute Houses)

## Current schema (no change required)

The **students** table already has a `house` column (text, nullable). Use it to store the **house name** from **institute_houses** when you assign a student to a house in the Student Directory.

- **institute_houses**: `id`, `school_id`, `school_code`, `house_name`, `house_color`, `description`, `is_active`, ...
- **students**: `house` (text) — store `institute_houses.house_name` here when assigning.

House assignment is done only from **Student Directory** (per-student and bulk). It is **not** in the Add Student form.

---

## Optional: use house_id for referential integrity

If you prefer a foreign key to **institute_houses** instead of storing the house name as text, run this migration in Supabase SQL Editor:

```sql
-- Add house_id to students (optional; links to institute_houses)
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS house_id uuid NULL
  REFERENCES public.institute_houses (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.students.house_id IS 'Optional FK to institute_houses; use house (text) for name if not using this.';

-- Index for filtering by house
CREATE INDEX IF NOT EXISTS idx_students_house_id
  ON public.students (house_id)
  WHERE house_id IS NOT NULL;
```

If you use **house_id**:

- When assigning a house, set `students.house_id = <institute_house.id>` and optionally keep `students.house = house_name` for display.
- API: PATCH `/api/students/[id]` can accept `house_id` and/or `house`; list/detail can return house info via join.

The app currently uses the **house** text column only (no migration required).
