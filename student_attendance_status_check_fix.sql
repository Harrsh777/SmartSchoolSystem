-- Fix: Allow 'leave' (and other statuses) in student_attendance so Mark Attendance "Leave" works.
-- Run this in Supabase SQL Editor if you get: violates check constraint "student_attendance_status_check"

ALTER TABLE student_attendance
DROP CONSTRAINT IF EXISTS student_attendance_status_check;

ALTER TABLE student_attendance
ADD CONSTRAINT student_attendance_status_check
CHECK (
  status IS NOT NULL
  AND status IN (
    'present',
    'absent',
    'leave',
    'half_day',
    'halfday',
    'late',
    'duty_leave',
    'duty leave'
  )
);
