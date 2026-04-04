-- Optional link to academic_years for reporting / locks (API retries without this if missing)

ALTER TABLE student_attendance
ADD COLUMN IF NOT EXISTS academic_year_id uuid REFERENCES academic_years(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_student_attendance_academic_year_id
ON student_attendance (academic_year_id)
WHERE academic_year_id IS NOT NULL;
