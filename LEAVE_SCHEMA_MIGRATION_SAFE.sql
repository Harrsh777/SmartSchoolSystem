-- Safe Leave Management System Migration Script
-- This script safely handles existing tables and only adds missing columns
-- IMPORTANT: Uses accepted_schools table (not schools) to match your database schema

-- ============================================================================
-- STEP 1: Create leave_types table (only if it doesn't exist)
-- ============================================================================
CREATE TABLE IF NOT EXISTS leave_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_code VARCHAR(50) NOT NULL REFERENCES accepted_schools(school_code) ON DELETE CASCADE,
  abbreviation VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  max_days INTEGER,
  carry_forward BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  academic_year VARCHAR(50) NOT NULL,
  staff_type VARCHAR(50) DEFAULT 'All',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_school_abbreviation_year UNIQUE(school_code, abbreviation, academic_year, staff_type)
);

-- Indexes for leave_types (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_leave_types_school_code ON leave_types(school_code);
CREATE INDEX IF NOT EXISTS idx_leave_types_academic_year ON leave_types(academic_year);
CREATE INDEX IF NOT EXISTS idx_leave_types_is_active ON leave_types(is_active);
CREATE INDEX IF NOT EXISTS idx_leave_types_staff_type ON leave_types(staff_type);

-- Trigger to update updated_at for leave_types
CREATE OR REPLACE FUNCTION update_leave_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_leave_types_updated_at ON leave_types;
CREATE TRIGGER trigger_update_leave_types_updated_at
  BEFORE UPDATE ON leave_types
  FOR EACH ROW
  EXECUTE FUNCTION update_leave_types_updated_at();

-- ============================================================================
-- STEP 2: Handle staff_leave_requests table
-- ============================================================================
-- Add missing columns to existing table or create if it doesn't exist
DO $$ 
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_leave_requests') THEN
    -- Table exists, add missing columns only
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_leave_requests' AND column_name = 'reason') THEN
      ALTER TABLE staff_leave_requests ADD COLUMN reason TEXT;
      COMMENT ON COLUMN staff_leave_requests.reason IS 'Reason for leave application';
    END IF;
    
    -- Add other missing columns if needed (check each one)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_leave_requests' AND column_name = 'comment') THEN
      ALTER TABLE staff_leave_requests ADD COLUMN comment TEXT;
    END IF;
  ELSE
    -- Table doesn't exist, create it
    EXECUTE '
    CREATE TABLE staff_leave_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      school_code VARCHAR(50) NOT NULL REFERENCES accepted_schools(school_code) ON DELETE CASCADE,
      staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
      leave_applied_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      leave_start_date DATE NOT NULL,
      leave_end_date DATE NOT NULL,
      total_days INTEGER NOT NULL,
      comment TEXT,
      reason TEXT,
      status VARCHAR(20) DEFAULT ''pending'' CHECK (status IN (''pending'', ''approved'', ''rejected'')),
      rejected_reason TEXT,
      approved_by UUID REFERENCES staff(id),
      approved_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      CONSTRAINT check_dates CHECK (leave_end_date >= leave_start_date),
      CONSTRAINT check_total_days CHECK (total_days > 0)
    )';
  END IF;
END $$;

-- Indexes for staff_leave_requests (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_staff_leave_requests_school_code ON staff_leave_requests(school_code);
CREATE INDEX IF NOT EXISTS idx_staff_leave_requests_staff_id ON staff_leave_requests(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_leave_requests_leave_type_id ON staff_leave_requests(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_staff_leave_requests_status ON staff_leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_staff_leave_requests_dates ON staff_leave_requests(leave_start_date, leave_end_date);
CREATE INDEX IF NOT EXISTS idx_staff_leave_requests_applied_date ON staff_leave_requests(leave_applied_date);

-- Trigger to update updated_at for staff_leave_requests
CREATE OR REPLACE FUNCTION update_staff_leave_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_staff_leave_requests_updated_at ON staff_leave_requests;
CREATE TRIGGER trigger_update_staff_leave_requests_updated_at
  BEFORE UPDATE ON staff_leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_leave_requests_updated_at();

-- Trigger to automatically set approved_at when status changes to approved
CREATE OR REPLACE FUNCTION set_staff_approved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.approved_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_staff_approved_at ON staff_leave_requests;
CREATE TRIGGER trigger_set_staff_approved_at
  BEFORE UPDATE ON staff_leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_staff_approved_at();

-- ============================================================================
-- STEP 3: Create student_leave_requests table (only if it doesn't exist)
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_code VARCHAR(50) NOT NULL REFERENCES accepted_schools(school_code) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
  leave_title VARCHAR(200),
  leave_applied_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  leave_start_date DATE NOT NULL,
  leave_end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  absent_form_submitted BOOLEAN DEFAULT false,
  attachment TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejected_reason TEXT,
  approved_by UUID REFERENCES staff(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT check_student_dates CHECK (leave_end_date >= leave_start_date)
);

-- Indexes for student_leave_requests (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_student_leave_requests_school_code ON student_leave_requests(school_code);
CREATE INDEX IF NOT EXISTS idx_student_leave_requests_student_id ON student_leave_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_student_leave_requests_leave_type_id ON student_leave_requests(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_student_leave_requests_status ON student_leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_student_leave_requests_dates ON student_leave_requests(leave_start_date, leave_end_date);
CREATE INDEX IF NOT EXISTS idx_student_leave_requests_applied_date ON student_leave_requests(leave_applied_date);

-- Trigger to update updated_at for student_leave_requests
CREATE OR REPLACE FUNCTION update_student_leave_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_student_leave_requests_updated_at ON student_leave_requests;
CREATE TRIGGER trigger_update_student_leave_requests_updated_at
  BEFORE UPDATE ON student_leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_student_leave_requests_updated_at();

-- Trigger to automatically set approved_at when status changes to approved
CREATE OR REPLACE FUNCTION set_student_approved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.approved_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_student_approved_at ON student_leave_requests;
CREATE TRIGGER trigger_set_student_approved_at
  BEFORE UPDATE ON student_leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_student_approved_at();

-- ============================================================================
-- STEP 4: Row Level Security (RLS) Policies for leave_types
-- ============================================================================
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view leave types for their school" ON leave_types;
DROP POLICY IF EXISTS "Admins can insert leave types" ON leave_types;
DROP POLICY IF EXISTS "Admins can update leave types" ON leave_types;
DROP POLICY IF EXISTS "Admins can delete leave types" ON leave_types;

-- Policy: Users can view leave types for their school
CREATE POLICY "Users can view leave types for their school"
  ON leave_types FOR SELECT
  USING (true);

-- Policy: Only admins can insert leave types
CREATE POLICY "Admins can insert leave types"
  ON leave_types FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff 
      WHERE id = auth.uid() 
      AND role = 'School Admin'
      AND school_code = leave_types.school_code
    )
  );

-- Policy: Only admins can update leave types
CREATE POLICY "Admins can update leave types"
  ON leave_types FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff 
      WHERE id = auth.uid() 
      AND role = 'School Admin'
      AND school_code = leave_types.school_code
    )
  );

-- Policy: Only admins can delete leave types
CREATE POLICY "Admins can delete leave types"
  ON leave_types FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM staff 
      WHERE id = auth.uid() 
      AND role = 'School Admin'
      AND school_code = leave_types.school_code
    )
  );

-- ============================================================================
-- STEP 5: Row Level Security (RLS) Policies for staff_leave_requests
-- ============================================================================
ALTER TABLE staff_leave_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Staff can view their own leave requests" ON staff_leave_requests;
DROP POLICY IF EXISTS "Staff can insert their own leave requests" ON staff_leave_requests;
DROP POLICY IF EXISTS "Admins can update leave requests" ON staff_leave_requests;

-- Policy: Staff can view their own leave requests
CREATE POLICY "Staff can view their own leave requests"
  ON staff_leave_requests FOR SELECT
  USING (
    staff_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM staff 
      WHERE id = auth.uid() 
      AND (role = 'School Admin' OR role = 'Principal')
      AND school_code = staff_leave_requests.school_code
    )
  );

-- Policy: Staff can insert their own leave requests
CREATE POLICY "Staff can insert their own leave requests"
  ON staff_leave_requests FOR INSERT
  WITH CHECK (staff_id = auth.uid());

-- Policy: Only admins can update leave requests (approve/reject)
CREATE POLICY "Admins can update leave requests"
  ON staff_leave_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff 
      WHERE id = auth.uid() 
      AND (role = 'School Admin' OR role = 'Principal')
      AND school_code = staff_leave_requests.school_code
    )
  );

-- ============================================================================
-- STEP 6: Row Level Security (RLS) Policies for student_leave_requests
-- ============================================================================
ALTER TABLE student_leave_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can view their own leave requests" ON student_leave_requests;
DROP POLICY IF EXISTS "Students can insert their own leave requests" ON student_leave_requests;
DROP POLICY IF EXISTS "Admins and teachers can update student leave requests" ON student_leave_requests;

-- Policy: Students can view their own leave requests
CREATE POLICY "Students can view their own leave requests"
  ON student_leave_requests FOR SELECT
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM staff 
      WHERE id = auth.uid() 
      AND (role = 'School Admin' OR role = 'Principal' OR role = 'Teacher')
      AND school_code = student_leave_requests.school_code
    )
  );

-- Policy: Students can insert their own leave requests
CREATE POLICY "Students can insert their own leave requests"
  ON student_leave_requests FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Policy: Only admins and teachers can update student leave requests (approve/reject)
CREATE POLICY "Admins and teachers can update student leave requests"
  ON student_leave_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff 
      WHERE id = auth.uid() 
      AND (role = 'School Admin' OR role = 'Principal' OR role = 'Teacher')
      AND school_code = student_leave_requests.school_code
    )
  );

-- ============================================================================
-- STEP 7: Create Views (Optional but helpful for queries)
-- ============================================================================

-- View: Student Leave Requests Summary
CREATE OR REPLACE VIEW student_leave_requests_summary AS
SELECT 
  slr.*,
  s.student_name,
  s.admission_no,
  s.class,
  s.section,
  lt.abbreviation AS leave_type_abbreviation,
  lt.name AS leave_type_name
FROM student_leave_requests slr
JOIN students s ON slr.student_id = s.id
JOIN leave_types lt ON slr.leave_type_id = lt.id;

-- View: Staff Leave Requests Summary
CREATE OR REPLACE VIEW staff_leave_requests_summary AS
SELECT 
  slr.*,
  s.full_name AS staff_name,
  s.staff_id,
  s.role,
  s.department,
  lt.abbreviation AS leave_type_abbreviation,
  lt.name AS leave_type_name
FROM staff_leave_requests slr
JOIN staff s ON slr.staff_id = s.id
JOIN leave_types lt ON slr.leave_type_id = lt.id;

