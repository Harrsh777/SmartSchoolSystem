-- ============================================
-- COMPLETE STAFF PERMISSIONS SCHEMA
-- Smart School ERP - Supabase + Next.js
-- All 42 Modules with Sub-modules
-- ============================================

-- First, ensure the base schema is created (run supabase_staff_permissions_schema.sql first)
-- This file adds all modules and sub-modules

-- ============================================
-- INSERT ALL MODULES (42 Modules)
-- ============================================
INSERT INTO public.modules (name, display_order, description) VALUES
  ('Home', 1, 'Home module'),
  ('School Info', 2, 'School information module'),
  ('Admin Role Management', 3, 'Admin role management module'),
  ('Password Management', 4, 'Password management module'),
  ('Storage Used', 5, 'Storage usage module'),
  ('Staff Management', 6, 'Staff management module'),
  ('Class, Subject & Teacher Assignment', 7, 'Class, Subject & Teacher Assignment module'),
  ('Time Table', 8, 'Time Table module'),
  ('Student Management', 9, 'Student Management module'),
  ('Download Statistics', 10, 'Download Statistics module'),
  ('Fee Management', 11, 'Fee Management module'),
  ('Student-wise Fee', 12, 'Student-wise Fee module'),
  ('Leave Management', 13, 'Leave Management module'),
  ('Communication', 14, 'Communication module'),
  ('SMS', 15, 'SMS module'),
  ('Report Card', 16, 'Report Card module'),
  ('ACADXtra', 17, 'ACADXtra module'),
  ('Admissions', 18, 'Admissions module'),
  ('Transport Management', 19, 'Transport Management module'),
  ('Library Management', 20, 'Library Management module'),
  ('I-card', 21, 'I-card module'),
  ('Event and Holiday Management', 22, 'Event and Holiday Management module'),
  ('Gallery', 23, 'Gallery module'),
  ('Performance Analytics', 24, 'Performance Analytics module'),
  ('Front Office', 25, 'Front Office module'),
  ('Certificate Management', 26, 'Certificate Management module'),
  ('Digital Diary', 27, 'Digital Diary module'),
  ('Income and Expenditure', 28, 'Income and Expenditure module'),
  ('Payroll Management', 29, 'Payroll Management module'),
  ('Inventory Management', 30, 'Inventory Management module'),
  ('CCTV', 31, 'CCTV module'),
  ('Student Discipline Module', 32, 'Student Discipline Module'),
  ('Student Personal Details', 33, 'Student Personal Details module'),
  ('Accounts management', 34, 'Accounts management module'),
  ('Task Management', 35, 'Task Management module'),
  ('Hostel Management', 36, 'Hostel Management module'),
  ('Canteen Management', 37, 'Canteen Management module'),
  ('Alumni Management', 38, 'Alumni Management module'),
  ('Event Planner', 39, 'Event Planner module'),
  ('Copy Checking', 40, 'Copy Checking module'),
  ('Inspections and Observations', 41, 'Inspections and Observations module'),
  ('Sanction Management', 42, 'Sanction Management module')
ON CONFLICT DO NOTHING;

-- ============================================
-- INSERT ALL SUB-MODULES
-- ============================================

-- 1. Home
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Dashboard', 1, true, false
FROM public.modules m WHERE m.name = 'Home'
ON CONFLICT DO NOTHING;

-- 2. School Info
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Basic School Info', 1, true, true
FROM public.modules m WHERE m.name = 'School Info'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Implementation Process', 2, true, true
FROM public.modules m WHERE m.name = 'School Info'
ON CONFLICT DO NOTHING;

-- 3. Admin Role Management
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Staff Access Control', 1, true, true
FROM public.modules m WHERE m.name = 'Admin Role Management'
ON CONFLICT DO NOTHING;

-- 4. Password Management
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Reset Password', 1, false, true
FROM public.modules m WHERE m.name = 'Password Management'
ON CONFLICT DO NOTHING;

-- 5. Storage Used
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Module-wise GBs used', 1, true, false
FROM public.modules m WHERE m.name = 'Storage Used'
ON CONFLICT DO NOTHING;

-- 6. Staff Management
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Staff Directory', 1, true, true
FROM public.modules m WHERE m.name = 'Staff Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Add Staff', 2, false, true
FROM public.modules m WHERE m.name = 'Staff Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Bulk Staff import', 3, false, true
FROM public.modules m WHERE m.name = 'Staff Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Bulk Photo Upload', 4, false, true
FROM public.modules m WHERE m.name = 'Staff Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Staff Attendance', 5, true, true
FROM public.modules m WHERE m.name = 'Staff Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Student Attendance Marking Report', 6, true, false
FROM public.modules m WHERE m.name = 'Staff Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Quick Staff Search', 7, true, false
FROM public.modules m WHERE m.name = 'Staff Management'
ON CONFLICT DO NOTHING;

-- 7. Class, Subject & Teacher Assignment
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Add/Modify Class', 1, true, true
FROM public.modules m WHERE m.name = 'Class, Subject & Teacher Assignment'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Add/Modify Subjects', 2, true, true
FROM public.modules m WHERE m.name = 'Class, Subject & Teacher Assignment'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Assign Teachers', 3, true, true
FROM public.modules m WHERE m.name = 'Class, Subject & Teacher Assignment'
ON CONFLICT DO NOTHING;

-- 8. Time Table
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Teacher Workload', 1, true, false
FROM public.modules m WHERE m.name = 'Time Table'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Group wise Timetable', 2, true, true
FROM public.modules m WHERE m.name = 'Time Table'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Class Time Table', 3, true, true
FROM public.modules m WHERE m.name = 'Time Table'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Teacher Time Table', 4, true, true
FROM public.modules m WHERE m.name = 'Time Table'
ON CONFLICT DO NOTHING;

-- 9. Student Management
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Add student', 1, false, true
FROM public.modules m WHERE m.name = 'Student Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Bulk Student Import', 2, false, true
FROM public.modules m WHERE m.name = 'Student Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Bulk Photo Upload', 3, false, true
FROM public.modules m WHERE m.name = 'Student Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Student Optional Subject Allocation', 4, true, true
FROM public.modules m WHERE m.name = 'Student Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Student Directory', 5, true, false
FROM public.modules m WHERE m.name = 'Student Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'New Admission Report', 6, true, false
FROM public.modules m WHERE m.name = 'Student Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Student Attendance', 7, true, true
FROM public.modules m WHERE m.name = 'Student Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Student Report', 8, true, false
FROM public.modules m WHERE m.name = 'Student Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Student Info. Update Settings on App', 9, true, true
FROM public.modules m WHERE m.name = 'Student Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Student Form Config', 10, true, true
FROM public.modules m WHERE m.name = 'Student Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Student Sibling', 11, true, true
FROM public.modules m WHERE m.name = 'Student Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Student Attendance Report', 12, true, false
FROM public.modules m WHERE m.name = 'Student Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'PTM Attendance', 13, true, true
FROM public.modules m WHERE m.name = 'Student Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Quick Student Search', 14, true, false
FROM public.modules m WHERE m.name = 'Student Management'
ON CONFLICT DO NOTHING;

-- 10. Download Statistics
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Student Download Status', 1, true, false
FROM public.modules m WHERE m.name = 'Download Statistics'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Staff Download Status', 2, true, false
FROM public.modules m WHERE m.name = 'Download Statistics'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Student Activity', 3, true, false
FROM public.modules m WHERE m.name = 'Download Statistics'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Staff Activity', 4, true, false
FROM public.modules m WHERE m.name = 'Download Statistics'
ON CONFLICT DO NOTHING;

-- 11. Fee Management
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Fee Configuration, Receipt Template', 1, true, true
FROM public.modules m WHERE m.name = 'Fee Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Fee Basics (Fee Schedule, Fee Component, Fee Fine)', 2, true, true
FROM public.modules m WHERE m.name = 'Fee Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Fee Discount', 3, true, true
FROM public.modules m WHERE m.name = 'Fee Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Class-wise Fee, Student-wise Fee, Fee Receipts', 4, true, true
FROM public.modules m WHERE m.name = 'Fee Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Pending cheques', 5, true, true
FROM public.modules m WHERE m.name = 'Fee Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Fee Report, Student Fee Collection Report', 6, true, false
FROM public.modules m WHERE m.name = 'Fee Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Fee Invoice', 7, true, true
FROM public.modules m WHERE m.name = 'Fee Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Fee Mapper', 8, true, true
FROM public.modules m WHERE m.name = 'Fee Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Receive online fee payment notification', 9, true, true
FROM public.modules m WHERE m.name = 'Fee Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Quick Fee Search', 10, true, false
FROM public.modules m WHERE m.name = 'Fee Management'
ON CONFLICT DO NOTHING;

-- 12. Student-wise Fee
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Add Discount', 1, false, true
FROM public.modules m WHERE m.name = 'Student-wise Fee'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Mark Paid', 2, false, true
FROM public.modules m WHERE m.name = 'Student-wise Fee'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Show Other Components Fee (Except Transport Fee) in Mark Paid', 3, true, true
FROM public.modules m WHERE m.name = 'Student-wise Fee'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Show Transport Component Fee in Mark Paid', 4, true, true
FROM public.modules m WHERE m.name = 'Student-wise Fee'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Edit Receipt', 5, false, true
FROM public.modules m WHERE m.name = 'Student-wise Fee'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Add Misc Fee', 6, false, true
FROM public.modules m WHERE m.name = 'Student-wise Fee'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Discount Cancellation', 7, false, true
FROM public.modules m WHERE m.name = 'Student-wise Fee'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Receipt Cancellation', 8, false, true
FROM public.modules m WHERE m.name = 'Student-wise Fee'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Fee Refund', 9, false, true
FROM public.modules m WHERE m.name = 'Student-wise Fee'
ON CONFLICT DO NOTHING;

-- 13. Leave Management
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Leave Basics', 1, true, true
FROM public.modules m WHERE m.name = 'Leave Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Student Leave, Staff Leave', 2, true, true
FROM public.modules m WHERE m.name = 'Leave Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Send Notification''s On Leave Applied By Staff', 3, true, true
FROM public.modules m WHERE m.name = 'Leave Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Send Notification''s On Leave Applied By Student', 4, true, true
FROM public.modules m WHERE m.name = 'Leave Management'
ON CONFLICT DO NOTHING;

-- 14. Communication
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Notice/Circular', 1, true, true
FROM public.modules m WHERE m.name = 'Communication'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Survey', 2, true, true
FROM public.modules m WHERE m.name = 'Communication'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Incident Log', 3, true, true
FROM public.modules m WHERE m.name = 'Communication'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Child Activity', 4, true, true
FROM public.modules m WHERE m.name = 'Communication'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Whatsapp', 5, true, true
FROM public.modules m WHERE m.name = 'Communication'
ON CONFLICT DO NOTHING;

-- 15. SMS
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'SMS, SMS Template', 1, true, true
FROM public.modules m WHERE m.name = 'SMS'
ON CONFLICT DO NOTHING;

-- 16. Report Card
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Exams', 1, true, true
FROM public.modules m WHERE m.name = 'Report Card'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Report Card, Teacher Report Card, Template Selection', 2, true, true
FROM public.modules m WHERE m.name = 'Report Card'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Staff Marks Entry Report', 3, true, false
FROM public.modules m WHERE m.name = 'Report Card'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Grade Scale', 4, true, true
FROM public.modules m WHERE m.name = 'Report Card'
ON CONFLICT DO NOTHING;

-- 17. ACADXtra
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Academic Calendar', 1, true, true
FROM public.modules m WHERE m.name = 'ACADXtra'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Curriculum', 2, true, true
FROM public.modules m WHERE m.name = 'ACADXtra'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Lesson planning', 3, true, true
FROM public.modules m WHERE m.name = 'ACADXtra'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Reports', 4, true, false
FROM public.modules m WHERE m.name = 'ACADXtra'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Test Class Report', 5, true, false
FROM public.modules m WHERE m.name = 'ACADXtra'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Student Dashboard', 6, true, false
FROM public.modules m WHERE m.name = 'ACADXtra'
ON CONFLICT DO NOTHING;

-- 18. Admissions
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Admission Process', 1, true, true
FROM public.modules m WHERE m.name = 'Admissions'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Enquiry Leads', 2, true, true
FROM public.modules m WHERE m.name = 'Admissions'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Registration and Payment', 3, true, true
FROM public.modules m WHERE m.name = 'Admissions'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Pending Documents', 4, true, true
FROM public.modules m WHERE m.name = 'Admissions'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Interaction and Evaluation', 5, true, true
FROM public.modules m WHERE m.name = 'Admissions'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Admission', 6, true, true
FROM public.modules m WHERE m.name = 'Admissions'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'New Admission Report', 7, true, false
FROM public.modules m WHERE m.name = 'Admissions'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Daily Planner', 8, true, true
FROM public.modules m WHERE m.name = 'Admissions'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Admission Dashboard', 9, true, false
FROM public.modules m WHERE m.name = 'Admissions'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Delete Enquiry and Application Leads', 10, false, true
FROM public.modules m WHERE m.name = 'Admissions'
ON CONFLICT DO NOTHING;

-- 19. Transport Management
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Transport Basics', 1, true, true
FROM public.modules m WHERE m.name = 'Transport Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Vehicles', 2, true, true
FROM public.modules m WHERE m.name = 'Transport Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Routes', 3, true, true
FROM public.modules m WHERE m.name = 'Transport Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Student Route Mapping', 4, true, true
FROM public.modules m WHERE m.name = 'Transport Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Vehicle expenses', 5, true, true
FROM public.modules m WHERE m.name = 'Transport Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'GPS Tracking', 6, true, false
FROM public.modules m WHERE m.name = 'Transport Management'
ON CONFLICT DO NOTHING;

-- 20. Library Management
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Library Basics', 1, true, true
FROM public.modules m WHERE m.name = 'Library Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Catalogue', 2, true, true
FROM public.modules m WHERE m.name = 'Library Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Transactions', 3, true, true
FROM public.modules m WHERE m.name = 'Library Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Library Dashboard', 4, true, false
FROM public.modules m WHERE m.name = 'Library Management'
ON CONFLICT DO NOTHING;

-- 21. I-card
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'I-Card Template Creator', 1, true, true
FROM public.modules m WHERE m.name = 'I-card'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Create I-card', 2, true, true
FROM public.modules m WHERE m.name = 'I-card'
ON CONFLICT DO NOTHING;

-- 22. Event and Holiday Management
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Event and Holiday Management', 1, true, true
FROM public.modules m WHERE m.name = 'Event and Holiday Management'
ON CONFLICT DO NOTHING;

-- 23. Gallery
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Post an Event', 1, true, true
FROM public.modules m WHERE m.name = 'Gallery'
ON CONFLICT DO NOTHING;

-- 24. Performance Analytics
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Staff Performance', 1, true, false
FROM public.modules m WHERE m.name = 'Performance Analytics'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Student Performance', 2, true, false
FROM public.modules m WHERE m.name = 'Performance Analytics'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Fee Dashboard', 3, true, false
FROM public.modules m WHERE m.name = 'Performance Analytics'
ON CONFLICT DO NOTHING;

-- 25. Front Office
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Visitor Management', 1, true, true
FROM public.modules m WHERE m.name = 'Front Office'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Gate Pass Management', 2, true, true
FROM public.modules m WHERE m.name = 'Front Office'
ON CONFLICT DO NOTHING;

-- 26. Certificate Management
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Template Selection', 1, true, true
FROM public.modules m WHERE m.name = 'Certificate Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Manage Certificate', 2, true, true
FROM public.modules m WHERE m.name = 'Certificate Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Classwise student certificate', 3, true, true
FROM public.modules m WHERE m.name = 'Certificate Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Certificate Send to Student', 4, true, true
FROM public.modules m WHERE m.name = 'Certificate Management'
ON CONFLICT DO NOTHING;

-- 27. Digital Diary
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Create Diary', 1, true, true
FROM public.modules m WHERE m.name = 'Digital Diary'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Daily Dairy Report', 2, true, false
FROM public.modules m WHERE m.name = 'Digital Diary'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Daily Dairy Report(all classes or all batches)', 3, true, false
FROM public.modules m WHERE m.name = 'Digital Diary'
ON CONFLICT DO NOTHING;

-- 28. Income and Expenditure
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Add/Edit Category', 1, true, true
FROM public.modules m WHERE m.name = 'Income and Expenditure'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Add/Edit Payee', 2, true, true
FROM public.modules m WHERE m.name = 'Income and Expenditure'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Manage Income', 3, true, true
FROM public.modules m WHERE m.name = 'Income and Expenditure'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Manage Expenditure', 4, true, true
FROM public.modules m WHERE m.name = 'Income and Expenditure'
ON CONFLICT DO NOTHING;

-- 29. Payroll Management
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Salary Component', 1, true, true
FROM public.modules m WHERE m.name = 'Payroll Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Salary Structure', 2, true, true
FROM public.modules m WHERE m.name = 'Payroll Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Salary Structure Assignment', 3, true, true
FROM public.modules m WHERE m.name = 'Payroll Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Salary Slip', 4, true, false
FROM public.modules m WHERE m.name = 'Payroll Management'
ON CONFLICT DO NOTHING;

-- 30. Inventory Management
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Inventory Settings', 1, true, true
FROM public.modules m WHERE m.name = 'Inventory Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Approver Settings', 2, true, true
FROM public.modules m WHERE m.name = 'Inventory Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Add/Edit Purchase', 3, true, true
FROM public.modules m WHERE m.name = 'Inventory Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Issue/ Return Items', 4, true, true
FROM public.modules m WHERE m.name = 'Inventory Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Sell Items', 5, true, true
FROM public.modules m WHERE m.name = 'Inventory Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Manage Stock', 6, true, true
FROM public.modules m WHERE m.name = 'Inventory Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Delete Inventory Data', 7, false, true
FROM public.modules m WHERE m.name = 'Inventory Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Direct Purchase', 8, true, true
FROM public.modules m WHERE m.name = 'Inventory Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Inventory Request', 9, true, true
FROM public.modules m WHERE m.name = 'Inventory Management'
ON CONFLICT DO NOTHING;

-- 31. CCTV
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'CCTV Modules', 1, true, false
FROM public.modules m WHERE m.name = 'CCTV'
ON CONFLICT DO NOTHING;

-- 32. Student Discipline Module
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Student Discipline Module', 1, true, true
FROM public.modules m WHERE m.name = 'Student Discipline Module'
ON CONFLICT DO NOTHING;

-- 33. Student Personal Details
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Student Personal Details', 1, true, true
FROM public.modules m WHERE m.name = 'Student Personal Details'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Student Personal Details(Admission)', 2, true, true
FROM public.modules m WHERE m.name = 'Student Personal Details'
ON CONFLICT DO NOTHING;

-- 34. Accounts management
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Day Book', 1, true, true
FROM public.modules m WHERE m.name = 'Accounts management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Journal & ledger', 2, true, true
FROM public.modules m WHERE m.name = 'Accounts management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'P & L', 3, true, true
FROM public.modules m WHERE m.name = 'Accounts management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Balance Sheet', 4, true, true
FROM public.modules m WHERE m.name = 'Accounts management'
ON CONFLICT DO NOTHING;

-- 35. Task Management
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Task Management', 1, true, true
FROM public.modules m WHERE m.name = 'Task Management'
ON CONFLICT DO NOTHING;

-- 36. Hostel Management
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Hostel Settings', 1, true, true
FROM public.modules m WHERE m.name = 'Hostel Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Bed Allocation', 2, true, true
FROM public.modules m WHERE m.name = 'Hostel Management'
ON CONFLICT DO NOTHING;

-- 37. Canteen Management
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Manage Food Category', 1, true, true
FROM public.modules m WHERE m.name = 'Canteen Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Manage Food', 2, true, true
FROM public.modules m WHERE m.name = 'Canteen Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Generate Invoice', 3, true, true
FROM public.modules m WHERE m.name = 'Canteen Management'
ON CONFLICT DO NOTHING;

-- 38. Alumni Management
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Alumni Students', 1, true, true
FROM public.modules m WHERE m.name = 'Alumni Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Work Details', 2, true, true
FROM public.modules m WHERE m.name = 'Alumni Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Post Event', 3, true, true
FROM public.modules m WHERE m.name = 'Alumni Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Post Gallery', 4, true, true
FROM public.modules m WHERE m.name = 'Alumni Management'
ON CONFLICT DO NOTHING;

-- 39. Event Planner
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Event Form Setting', 1, true, true
FROM public.modules m WHERE m.name = 'Event Planner'
ON CONFLICT DO NOTHING;

-- 40. Copy Checking
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Copy Checking', 1, true, true
FROM public.modules m WHERE m.name = 'Copy Checking'
ON CONFLICT DO NOTHING;

-- 41. Inspections and Observations
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Employee Inspection', 1, true, true
FROM public.modules m WHERE m.name = 'Inspections and Observations'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'General Inspection', 2, true, true
FROM public.modules m WHERE m.name = 'Inspections and Observations'
ON CONFLICT DO NOTHING;

-- 42. Sanction Management
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Sanction Request & Approver Settings', 1, true, true
FROM public.modules m WHERE m.name = 'Sanction Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Sanction Approve/Reject', 2, true, true
FROM public.modules m WHERE m.name = 'Sanction Management'
ON CONFLICT DO NOTHING;

