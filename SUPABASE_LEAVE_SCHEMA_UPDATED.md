# Updated Supabase Schema for Leave Management System

This document contains the updated SQL schema for the Leave Management system including student leaves and staff leave reason field.

## Table Alterations

### 1. Alter staff_leave_requests table to add reason field

```sql
-- Add reason column to staff_leave_requests table
ALTER TABLE staff_leave_requests 
ADD COLUMN IF NOT EXISTS reason TEXT;

-- Add comment to the column
COMMENT ON COLUMN staff_leave_requests.reason IS 'Reason for leave application';
```

## New Tables

### 2. student_leave_requests

Stores leave requests submitted by students.

```sql
CREATE TABLE student_leave_requests (
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
  attachment TEXT, -- URL or path to attachment file
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejected_reason TEXT,
  approved_by UUID REFERENCES staff(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT check_student_dates CHECK (leave_end_date >= leave_start_date)
);

-- Indexes
CREATE INDEX idx_student_leave_requests_school_code ON student_leave_requests(school_code);
CREATE INDEX idx_student_leave_requests_student_id ON student_leave_requests(student_id);
CREATE INDEX idx_student_leave_requests_leave_type_id ON student_leave_requests(leave_type_id);
CREATE INDEX idx_student_leave_requests_status ON student_leave_requests(status);
CREATE INDEX idx_student_leave_requests_dates ON student_leave_requests(leave_start_date, leave_end_date);
CREATE INDEX idx_student_leave_requests_applied_date ON student_leave_requests(leave_applied_date);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_student_leave_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE TRIGGER trigger_set_student_approved_at
  BEFORE UPDATE ON student_leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_student_approved_at();
```

## Row Level Security (RLS) Policies

### student_leave_requests

```sql
-- Enable RLS
ALTER TABLE student_leave_requests ENABLE ROW LEVEL SECURITY;

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
```

## Updated Views

### View: Student Leave Requests Summary

```sql
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
```

### View: Staff Leave Requests Summary (Updated)

```sql
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
```

## Complete Schema for Reference

### leave_types (unchanged)

```sql
CREATE TABLE IF NOT EXISTS leave_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_code VARCHAR(50) NOT NULL REFERENCES accepted_schools(school_code) ON DELETE CASCADE,
  abbreviation VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  max_days INTEGER,
  carry_forward BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  academic_year VARCHAR(50) NOT NULL,
  staff_type VARCHAR(50) DEFAULT 'All', -- 'Teaching', 'Non-Teaching', or 'All'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_school_abbreviation_year UNIQUE(school_code, abbreviation, academic_year, staff_type)
);
```

### staff_leave_requests (updated with reason field)

```sql
CREATE TABLE IF NOT EXISTS staff_leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_code VARCHAR(50) NOT NULL REFERENCES accepted_schools(school_code) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
  leave_applied_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  leave_start_date DATE NOT NULL,
  leave_end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  comment TEXT,
  reason TEXT, -- NEW FIELD: Reason for leave
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejected_reason TEXT,
  approved_by UUID REFERENCES staff(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT check_dates CHECK (leave_end_date >= leave_start_date),
  CONSTRAINT check_total_days CHECK (total_days > 0)
);
```

## Migration Script

Run this script to update existing database:

```sql
-- Step 1: Add reason column to staff_leave_requests
ALTER TABLE staff_leave_requests 
ADD COLUMN IF NOT EXISTS reason TEXT;

-- Step 2: Create student_leave_requests table
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

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_student_leave_requests_school_code ON student_leave_requests(school_code);
CREATE INDEX IF NOT EXISTS idx_student_leave_requests_student_id ON student_leave_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_student_leave_requests_leave_type_id ON student_leave_requests(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_student_leave_requests_status ON student_leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_student_leave_requests_dates ON student_leave_requests(leave_start_date, leave_end_date);
CREATE INDEX IF NOT EXISTS idx_student_leave_requests_applied_date ON student_leave_requests(leave_applied_date);

-- Step 4: Create triggers
CREATE OR REPLACE FUNCTION update_student_leave_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_student_leave_requests_updated_at
  BEFORE UPDATE ON student_leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_student_leave_requests_updated_at();

CREATE OR REPLACE FUNCTION set_student_approved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.approved_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_student_approved_at
  BEFORE UPDATE ON student_leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_student_approved_at();

-- Step 5: Enable RLS and create policies
ALTER TABLE student_leave_requests ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Students can insert their own leave requests"
  ON student_leave_requests FOR INSERT
  WITH CHECK (student_id = auth.uid());

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

-- Step 6: Create views
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
```

## Notes

1. **Reason Field**: The `reason` field in `staff_leave_requests` is optional (TEXT, nullable), while in `student_leave_requests` it is required (TEXT NOT NULL).

2. **Leave Title**: Students can optionally provide a leave title, which defaults to the leave type name if not provided.

3. **Absent Form**: Students can mark if they have submitted an absent form separately.

4. **Attachment**: Students can attach files (stored as URL or file path).

5. **Teacher Access**: Teachers can view and manage leave requests for students in their classes.

6. **Status Flow**: Same as staff leaves - pending → approved/rejected.

