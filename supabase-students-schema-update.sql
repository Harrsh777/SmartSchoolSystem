-- =====================================================
-- STUDENTS TABLE SCHEMA UPDATE
-- Production-ready schema with comprehensive student fields
-- =====================================================

-- Add new columns to students table (if they don't exist)
-- Note: Run this incrementally - columns that already exist will be skipped

-- Personal Information
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS pincode TEXT,
ADD COLUMN IF NOT EXISTS aadhaar_number TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS student_contact TEXT,
ADD COLUMN IF NOT EXISTS blood_group TEXT;

-- Academic Information
ALTER TABLE students
ADD COLUMN IF NOT EXISTS sr_no TEXT,
ADD COLUMN IF NOT EXISTS date_of_admission DATE,
ADD COLUMN IF NOT EXISTS religion TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Indian',
ADD COLUMN IF NOT EXISTS house TEXT,
ADD COLUMN IF NOT EXISTS last_class TEXT,
ADD COLUMN IF NOT EXISTS last_school_name TEXT,
ADD COLUMN IF NOT EXISTS last_school_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS last_school_result TEXT,
ADD COLUMN IF NOT EXISTS medium TEXT,
ADD COLUMN IF NOT EXISTS schooling_type TEXT,
ADD COLUMN IF NOT EXISTS roll_number TEXT,
ADD COLUMN IF NOT EXISTS rfid TEXT,
ADD COLUMN IF NOT EXISTS pen_no TEXT,
ADD COLUMN IF NOT EXISTS apaar_no TEXT,
ADD COLUMN IF NOT EXISTS rte BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS new_admission BOOLEAN DEFAULT TRUE;

-- Parent/Guardian Information
ALTER TABLE students
ADD COLUMN IF NOT EXISTS father_name TEXT,
ADD COLUMN IF NOT EXISTS father_occupation TEXT,
ADD COLUMN IF NOT EXISTS father_contact TEXT,
ADD COLUMN IF NOT EXISTS mother_name TEXT,
ADD COLUMN IF NOT EXISTS mother_occupation TEXT,
ADD COLUMN IF NOT EXISTS mother_contact TEXT,
ADD COLUMN IF NOT EXISTS staff_relation TEXT,
ADD COLUMN IF NOT EXISTS transport_type TEXT;

-- Create indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_students_aadhaar ON students(aadhaar_number) WHERE aadhaar_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_roll_number ON students(roll_number) WHERE roll_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_rfid ON students(rfid) WHERE rfid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_date_of_admission ON students(date_of_admission) WHERE date_of_admission IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_category ON students(category) WHERE category IS NOT NULL;

-- Add check constraints for data validation
ALTER TABLE students
DROP CONSTRAINT IF EXISTS students_blood_group_check;

ALTER TABLE students
ADD CONSTRAINT students_blood_group_check 
CHECK (
  blood_group IS NULL OR 
  blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
);

ALTER TABLE students
DROP CONSTRAINT IF EXISTS students_gender_check;

ALTER TABLE students
ADD CONSTRAINT students_gender_check 
CHECK (
  gender IS NULL OR 
  gender IN ('Male', 'Female', 'Other', 'male', 'female', 'other')
);

-- Add unique constraint for Aadhaar (if provided, must be unique)
CREATE UNIQUE INDEX IF NOT EXISTS students_aadhaar_unique 
ON students(aadhaar_number) 
WHERE aadhaar_number IS NOT NULL AND aadhaar_number != '';

-- Add unique constraint for RFID (if provided, must be unique per school)
CREATE UNIQUE INDEX IF NOT EXISTS students_rfid_school_unique 
ON students(school_code, rfid) 
WHERE rfid IS NOT NULL AND rfid != '';

-- Add unique constraint for Roll Number (if provided, must be unique per class/section)
CREATE UNIQUE INDEX IF NOT EXISTS students_roll_number_class_unique 
ON students(school_code, class, section, roll_number) 
WHERE roll_number IS NOT NULL AND roll_number != '';

-- Update existing records: Split student_name into first_name and last_name if not already split
UPDATE students
SET 
  first_name = SPLIT_PART(student_name, ' ', 1),
  last_name = CASE 
    WHEN POSITION(' ' IN student_name) > 0 
    THEN SUBSTRING(student_name FROM POSITION(' ' IN student_name) + 1)
    ELSE ''
  END
WHERE (first_name IS NULL OR first_name = '') 
  AND student_name IS NOT NULL 
  AND student_name != '';

-- Add comments for documentation
COMMENT ON COLUMN students.aadhaar_number IS 'Aadhaar card number - optional, but must be unique if provided';
COMMENT ON COLUMN students.rfid IS 'RFID card number for attendance - optional, unique per school';
COMMENT ON COLUMN students.roll_number IS 'Roll number in class - optional, unique per class/section';
COMMENT ON COLUMN students.rte IS 'Right to Education (RTE) student flag';
COMMENT ON COLUMN students.new_admission IS 'Flag to indicate if this is a new admission';
COMMENT ON COLUMN students.date_of_admission IS 'Date when student was admitted to the school';

-- =====================================================
-- DEPENDENT TABLES - Update if needed
-- =====================================================

-- Note: student_attendance table already references students.id
-- No changes needed unless you want to add additional fields

-- If you have a fees table, ensure it can reference the new fields
-- Example (uncomment if you have a fees table):
-- ALTER TABLE fees ADD COLUMN IF NOT EXISTS student_rfid TEXT;
-- CREATE INDEX IF NOT EXISTS idx_fees_student_rfid ON fees(student_rfid) WHERE student_rfid IS NOT NULL;

-- If you have an exam_results table, you might want to link by roll_number
-- Example (uncomment if you have an exam_results table):
-- ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS student_roll_number TEXT;
-- CREATE INDEX IF NOT EXISTS idx_exam_results_roll_number ON exam_results(student_roll_number) WHERE student_roll_number IS NOT NULL;

