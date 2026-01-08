# Supabase Schema for Leave Management System

This document contains the SQL schema for the Leave Management system.

## Tables

### 1. leave_types

Stores the different types of leaves available in the system.

```sql
CREATE TABLE leave_types (
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

-- Indexes
CREATE INDEX idx_leave_types_school_code ON leave_types(school_code);
CREATE INDEX idx_leave_types_academic_year ON leave_types(academic_year);
CREATE INDEX idx_leave_types_is_active ON leave_types(is_active);
CREATE INDEX idx_leave_types_staff_type ON leave_types(staff_type);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_leave_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_leave_types_updated_at
  BEFORE UPDATE ON leave_types
  FOR EACH ROW
  EXECUTE FUNCTION update_leave_types_updated_at();
```

### 2. staff_leave_requests

Stores leave requests submitted by staff members.

```sql
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
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejected_reason TEXT,
  approved_by UUID REFERENCES staff(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT check_dates CHECK (leave_end_date >= leave_start_date),
  CONSTRAINT check_total_days CHECK (total_days > 0)
);

-- Indexes
CREATE INDEX idx_staff_leave_requests_school_code ON staff_leave_requests(school_code);
CREATE INDEX idx_staff_leave_requests_staff_id ON staff_leave_requests(staff_id);
CREATE INDEX idx_staff_leave_requests_leave_type_id ON staff_leave_requests(leave_type_id);
CREATE INDEX idx_staff_leave_requests_status ON staff_leave_requests(status);
CREATE INDEX idx_staff_leave_requests_dates ON staff_leave_requests(leave_start_date, leave_end_date);
CREATE INDEX idx_staff_leave_requests_applied_date ON staff_leave_requests(leave_applied_date);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_staff_leave_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_staff_leave_requests_updated_at
  BEFORE UPDATE ON staff_leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_leave_requests_updated_at();

-- Trigger to automatically set approved_at when status changes to approved
CREATE OR REPLACE FUNCTION set_approved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.approved_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_approved_at
  BEFORE UPDATE ON staff_leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_approved_at();
```

## Row Level Security (RLS) Policies

### leave_types

```sql
-- Enable RLS
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view leave types for their school
CREATE POLICY "Users can view leave types for their school"
  ON leave_types FOR SELECT
  USING (school_code IN (
    SELECT school_code FROM accepted_schools WHERE id = auth.uid()
  ));

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
```

### staff_leave_requests

```sql
-- Enable RLS
ALTER TABLE staff_leave_requests ENABLE ROW LEVEL SECURITY;

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
```

## Sample Data

### Insert Sample Leave Types

```sql
-- For a school with code 'SCH001'
INSERT INTO leave_types (school_code, abbreviation, name, max_days, carry_forward, is_active, academic_year, staff_type)
VALUES
  ('SCH001', 'CL', 'Casual Leaves', 12, false, true, 'Apr 2025 - Mar 2026', 'Teaching'),
  ('SCH001', 'EL', 'Earned Leaves', 15, true, true, 'Apr 2025 - Mar 2026', 'Teaching'),
  ('SCH001', 'SL', 'Sick Leaves', 10, false, true, 'Apr 2025 - Mar 2026', 'Teaching'),
  ('SCH001', 'LWP', 'Leave Without Pay', NULL, false, true, 'Apr 2025 - Mar 2026', 'Teaching'),
  ('SCH001', 'RH', 'Restricted Holiday', 2, false, true, 'Apr 2025 - Mar 2026', 'Teaching');
```

## Views (Optional)

### View: Active Leave Types

```sql
CREATE VIEW active_leave_types AS
SELECT 
  lt.*,
  s.school_name
FROM leave_types lt
JOIN accepted_schools s ON lt.school_code = s.school_code
WHERE lt.is_active = true;
```

### View: Leave Requests Summary

```sql
CREATE VIEW leave_requests_summary AS
SELECT 
  slr.*,
  s.full_name AS staff_name,
  s.staff_id,
  lt.abbreviation AS leave_type_abbreviation,
  lt.name AS leave_type_name
FROM staff_leave_requests slr
JOIN staff s ON slr.staff_id = s.id
JOIN leave_types lt ON slr.leave_type_id = lt.id;
```

## Notes

1. **Date Validation**: The `check_dates` constraint ensures that the end date is not before the start date.

2. **Total Days Calculation**: The `total_days` field should be calculated on the application side before insertion. The formula is: `total_days = (end_date - start_date) + 1`.

3. **Status Flow**: 
   - New requests start as `pending`
   - Can be changed to `approved` or `rejected` by admins
   - Once approved or rejected, the status should not change back to pending

4. **Academic Year**: The academic year format should be consistent (e.g., "Apr 2025 - Mar 2026").

5. **Staff Type**: Leave types can be specific to "Teaching", "Non-Teaching", or available to "All" staff types.

6. **Cascade Deletes**: 
   - If a school is deleted, all leave types and requests are deleted
   - If a staff member is deleted, all their leave requests are deleted
   - If a leave type is deleted, leave requests referencing it are restricted (you may want to change this to SET NULL or handle differently)

