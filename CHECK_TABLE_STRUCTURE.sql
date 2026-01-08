-- Diagnostic script to check existing table structures
-- Run this first to see what columns exist in your tables

-- Check if staff_leave_requests table exists and show its structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'staff_leave_requests'
ORDER BY ordinal_position;

-- Check for duplicate column names (this should return empty if no duplicates)
SELECT 
    column_name,
    COUNT(*) as count
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'staff_leave_requests'
GROUP BY column_name
HAVING COUNT(*) > 1;

-- Check if leave_types table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_types') 
        THEN 'EXISTS' 
        ELSE 'DOES NOT EXIST' 
    END as leave_types_status;

-- Check if student_leave_requests table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_leave_requests') 
        THEN 'EXISTS' 
        ELSE 'DOES NOT EXIST' 
    END as student_leave_requests_status;

