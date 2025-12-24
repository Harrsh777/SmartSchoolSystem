hool code directly

-- Add the column
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS school_code TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_students_school_code ON students(school_code);

-- Update existing records to populate school_code from accepted_schools
UPDATE students s
SET school_code = a.school_code
FROM accepted_schools a
WHERE s.school_id = a.id
AND s.school_code IS NULL;

-- Make school_code NOT NULL after populating existing data
-- (Uncomment this after verifying all records have school_code)
-- ALTER TABLE students ALTER COLUMN school_code SET NOT NULL;

-- Add unique constraint for school_code + admission_no combination
-- This ensures admission numbers are unique per school
-- Note: The existing constraint on (school_id, admission_no) already ensures this,
-- but adding school_code makes queries more efficient
CREATE UNIQUE INDEX IF NOT EXISTS students_school_code_admission_unique 
ON students(school_code, admission_no) 
WHERE school_code IS NOT NULL;
