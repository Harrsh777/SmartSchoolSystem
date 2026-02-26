# Institute Houses – Incharges (Staff + Student)

Each house can have **1 Staff Incharge** and **2 Student Incharges**. Run the migration below in **Supabase → SQL Editor** to add the columns and foreign keys.

## Migration: Add incharge columns to `institute_houses`

```sql
-- Add House Incharge columns to institute_houses
-- 1 Staff Incharge, 2 Student Incharges per house

ALTER TABLE public.institute_houses
  ADD COLUMN IF NOT EXISTS staff_incharge_id uuid NULL
    REFERENCES public.staff (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS student_incharge_1_id uuid NULL
    REFERENCES public.students (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS student_incharge_2_id uuid NULL
    REFERENCES public.students (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.institute_houses.staff_incharge_id IS 'Staff member who is the house incharge (1 per house).';
COMMENT ON COLUMN public.institute_houses.student_incharge_1_id IS 'First student incharge of the house.';
COMMENT ON COLUMN public.institute_houses.student_incharge_2_id IS 'Second student incharge of the house.';

-- Optional: indexes for lookups
CREATE INDEX IF NOT EXISTS idx_institute_houses_staff_incharge
  ON public.institute_houses (staff_incharge_id) WHERE staff_incharge_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_institute_houses_student_incharge_1
  ON public.institute_houses (student_incharge_1_id) WHERE student_incharge_1_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_institute_houses_student_incharge_2
  ON public.institute_houses (student_incharge_2_id) WHERE student_incharge_2_id IS NOT NULL;
```

## Updated table shape (reference)

After running the migration, `institute_houses` includes:

| Column                  | Type    | Description                          |
|-------------------------|---------|--------------------------------------|
| id                      | uuid    | Primary key                          |
| school_id               | uuid    | FK to accepted_schools               |
| school_code             | text    |                                      |
| house_name              | text    |                                      |
| house_color             | text    | nullable                             |
| description             | text    | nullable                             |
| is_active               | boolean | default true                          |
| staff_incharge_id       | uuid    | nullable, FK to staff.id             |
| student_incharge_1_id   | uuid    | nullable, FK to students.id          |
| student_incharge_2_id   | uuid    | nullable, FK to students.id          |
| created_at              | timestamptz |                                  |
| updated_at              | timestamptz |                                  |

**Note:** Staff and students must belong to the same school (same `school_code`) as the house. The app filters staff/students by `school_code` when showing dropdowns; no DB constraint is added for that.

## App behaviour after migration

- **Institute Info → Update Institute's Houses:** When you **Edit** a house, you can set **Staff Incharge (1)** and **Student Incharge 1** / **Student Incharge 2** from dropdowns. Save updates the house record with these IDs.
- **GET** `/api/institute/houses` returns all columns (including the new IDs once the migration is applied).
- **PATCH** `/api/institute/houses/[id]` accepts `staff_incharge_id`, `student_incharge_1_id`, `student_incharge_2_id` (each optional; send `null` or omit to clear).
