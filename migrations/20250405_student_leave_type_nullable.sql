-- Student leave: optional leave_type_id so students can submit without selecting a staff leave type.
-- Run once on your database if POST /api/leave/student-requests fails with NOT NULL on leave_type_id.

ALTER TABLE student_leave_requests
  ALTER COLUMN leave_type_id DROP NOT NULL;
