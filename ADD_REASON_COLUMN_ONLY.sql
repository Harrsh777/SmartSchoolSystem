-- Simple script to add 'reason' column to existing staff_leave_requests table
-- Run this if you're getting "column specified more than once" error

-- Add reason column if it doesn't exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_leave_requests') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_leave_requests' AND column_name = 'reason') THEN
      ALTER TABLE staff_leave_requests ADD COLUMN reason TEXT;
      COMMENT ON COLUMN staff_leave_requests.reason IS 'Reason for leave application';
      RAISE NOTICE 'Added reason column to staff_leave_requests table';
    ELSE
      RAISE NOTICE 'reason column already exists in staff_leave_requests table';
    END IF;
  ELSE
    RAISE NOTICE 'staff_leave_requests table does not exist';
  END IF;
END $$;

