# Students table – status column (for Deactivate/Activate)

If your `students` table does not have a `status` column, run the following in the Supabase SQL editor.

## Add column (if missing)

```sql
-- Add status column to students (for active / deactivated / transferred / alumni / deleted)
ALTER TABLE students
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Optional: backfill existing rows
UPDATE students SET status = 'active' WHERE status IS NULL;

-- Optional: add a check constraint for allowed values
ALTER TABLE students
DROP CONSTRAINT IF EXISTS students_status_check;

ALTER TABLE students
ADD CONSTRAINT students_status_check
CHECK (status IS NULL OR status IN ('active', 'deactivated', 'inactive', 'transferred', 'alumni', 'graduated', 'deleted'));
```

## Index (optional, for filtering by status)

```sql
CREATE INDEX IF NOT EXISTS idx_students_status ON students(school_code, status);
```

The Student Directory uses this column to show Active/Deactivated tabs and to allow deactivating or reactivating a student from the Actions column.
