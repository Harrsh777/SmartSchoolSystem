# School Admin Dashboard — In-Depth Module Guide for Mobile App

**Audience:** Mobile app (e.g. React Native / Expo) consuming the same backend at `https://www.educorerp.in`.  
**Role:** School Admin.  
**Base path:** `/dashboard/[school_code]` (e.g. `/dashboard/SCH001`).

For each module: **purpose**, **flow**, **tables**, **APIs**, and **mobile UI/UX** guidelines.

---

## Shared Conventions

- **Auth:** Send `Authorization: Bearer <session_token>` or `X-Session-Token: <token>` on every request. Get token after POST to `/api/auth/login` with `{ school_code, password }`.
- **School scope:** All APIs require `school_code` (query param or body). Get it from session after login.
- **Responses:** Success usually `{ data: ... }`; errors `{ error: string }` with 4xx/5xx status.
- **Mobile UI:** Clean, professional; generous padding; rounded corners; one primary action per screen; loading skeletons; empty states; pull-to-refresh where appropriate.

---

## How modules and submodules are structured

The admin sidebar has **main menu items** (e.g. Staff Management, Classes, Fees). Many of these open a **modal or hub** that lists **submodules** — specific screens like “Staff Directory”, “Add Staff”, “Fee Heads”, “Collect Payment”. Each submodule has:

- **Label** — display name in the UI.
- **Path** — under `/dashboard/[school_code]`, e.g. `/staff-management/directory`, `/fees/v2/fee-structures`.
- **Purpose** — what that screen does and who uses it.
- **APIs** — which endpoints that screen calls (GET/POST/PATCH/DELETE).
- **Tables** — which DB tables it reads/writes.

In the sections below, each **module** (e.g. §6 Staff Management) includes a **Submodules (in-depth)** part that describes every submodule: purpose, route, user flow, tables, APIs, and mobile UI notes. Use these when building the mobile app so each screen (e.g. “Fee Structures”, “Student Directory”) is implemented correctly.

**Quick reference — submodule paths (relative to `/dashboard/[school_code]`):**

| Module | Submodule | Path |
|--------|-----------|------|
| Institute Info | Basic Institute Info | `/institute-info` |
| Academic Year Management | Year Setup, Promotion Engine, Year Closure, Audit Logs | `/academic-year-management/year-setup`, `.../promotion-engine`, `.../year-closure`, `.../audit-logs` |
| Staff Management | Staff Directory, Add Staff, Bulk Staff Import, Bulk Photo Upload, Staff Attendance, Staff Attendance Marking Report | `/staff-management/directory`, `.../add`, `.../bulk-import`, `.../bulk-photo`, `.../attendance`, `.../student-attendance-report` |
| Classes | Classes Overview, Modify Classes, Subject Teachers, Add/Modify Subjects | `/classes/overview`, `.../modify`, `.../subject-teachers`, `.../subjects` |
| Student Management | Add Student, Student Directory, Mark Attendance, Student Attendance Report, Bulk Import Students, Student Siblings | `/students/add`, `.../directory`, `.../mark-attendance`, `.../attendance-report`, `.../bulk-import`, `.../siblings` |
| Timetable | Timetable Builder, Class Timetable, Teacher Timetable, Group Wise Timetable | `/timetable`, `.../class`, `.../teacher`, `.../group-wise` |
| Event/Calendar | Academic Calendar, Events | `/calendar/academic`, `.../events` |
| Examinations | Examination Dashboard, Create Examination, Grade Scale, Examination Reports | `/examinations/dashboard`, `.../create`, `.../grade-scale`, `.../reports` |
| Report Card | Generate Report Card, Report Card Dashboard, Customize Template | `/report-card/generate`, `.../dashboard`, `.../templates` |
| Marks | Marks Dashboard, Mark Entry | `/marks`, `/marks-entry` |
| Fees | Fee Dashboard, Fee Heads, Fee Structures, Collect Payment, Student Fee Statements, Discounts & Fines, Fee Reports | `/fees/v2/dashboard`, `.../fee-heads`, `.../fee-structures`, `.../collection`, `/fees/statements`, `.../discounts-fines`, `.../reports` |
| Library | Library Dashboard, Library Basics, Library Catalogue, Library Transactions | `/library/dashboard`, `.../basics`, `.../catalogue`, `.../transactions` |
| Transport | Transport Dashboard, Vehicles, Stops, Routes, Student Route Mapping | `/transport/dashboard`, `.../vehicles`, `.../stops`, `.../routes`, `.../route-students` |
| Leave Management | Leave Dashboard, Staff Leave Management, Student Leave Approval, Staff Leave Approval, Leave Basics | `/leave/dashboard`, `.../staff-leave-management`, `.../student-leave`, `.../staff-leave`, `.../basics` |
| Front Office management | Front Office Dashboard, Gate pass, Visitor Management | `/front-office`, `/gate-pass`, `/visitor-management` |
| Certificate Management | Certificate Dashboard, New Certificate | `/certificates/dashboard`, `.../new` |
| Attendance | Staff Attendance | `/attendance/staff` |

---

## 1. Home (Dashboard)

**Purpose:** Single landing view after login: school context, key stats, and quick access to modules.

**Flow:**
1. User lands on dashboard home after login.
2. App fetches stats and (optionally) school details.
3. Display: search bar, school name, ID (school_code), current date, Home link; then stat cards; then module grid (23 cards).

**Tables:**
- `accepted_schools` — school id, name, code.
- `students` — count by school_code.
- `staff` — count by school_code.
- `student_attendance` — today’s date, school_code → present/total.
- `staff_attendance` — today’s date, school_code → present/total.
- `payments` (or legacy `fees`) — monthly/current-year collection by school_code.
- `classes` — count of classes/sections (or derived from classes table).

**APIs:**
- `GET /api/dashboard/stats?school_code={school_code}`  
  Returns: `totalStudents`, `totalStaff`, `feeCollection` (collected, monthlyCollection, todayCollection), `todayAttendance` (students + staff present/percentage), `upcomingExams`, `recentNotices`.
- `GET /api/schools/accepted` — list accepted schools (for name/code); or use session school object.
- `GET /api/classes/overview?school_code=...` or dashboard stats — for classes/sections count.

**Mobile UI/UX:**
- **Top:** Sticky header with search (placeholder “Search menu…”), school name, “ID: SCH001”, formatted date, “Home” link.
- **Stats:** Horizontal scroll or 2×2 grid of cards: Total Students, Fees This Month (₹), Staff Attendance (%), Classes & Sections. Use large number + small label; optional icon per card; skeleton while loading.
- **Modules:** Grid of 23 cards (icon + label). 2 columns on phone, 3–4 on tablet. Each card navigates to the module route. Use consistent icon set (e.g. Lucide), pastel icon tints, tap feedback.
- **Pull-to-refresh** on the whole dashboard to re-fetch stats.

---

## 2. Institute Info

**Purpose:** View and edit school/institute master data (name, address, contact, principal, type, affiliation, etc.).

**Flow:**
1. User opens Institute Info from dashboard.
2. App loads institute details for school_code.
3. Admin can view and edit fields; save updates via API.

**Tables:**
- `accepted_schools` — main row per school: school_name, school_code, school_address, city, state, zip_code, country, school_email, school_phone, principal_name, principal_email, principal_phone, established_year, school_type, affiliation, etc.
- Optional: `institute_houses` (houses), `institute_working_days` (working days).

**APIs:**
- `GET /api/schools/accepted` — filter by school_code for current school.
- `GET /api/institute/houses?school_code=...` — houses.
- `GET /api/institute/working-days?school_code=...` — working days.
- `PATCH/PUT /api/schools/[id]/update` or equivalent — update school (body: fields to update).

**Mobile UI/UX:**
- Single scrollable form: sections “Basic Info”, “Address”, “Principal”, “Academic” (type, affiliation, year). Use labeled fields; avoid long single-line inputs on mobile; use appropriate keyboards (email, phone, number).
- Save button fixed at bottom or as FAB. Success toast and optional “View” after save.
- Light card per section; consistent spacing.

**Submodules (in-depth):**

- **Basic Institute Info** — Path: `/institute-info`  
  **Purpose:** Single screen to view and edit core school details (name, code, address, contact, logo).  
  **Flow:** Load school by `school_code` → show form; on save → `PATCH` school; optional logo upload.  
  **Tables:** `accepted_schools` (or `institute_info`).  
  **APIs:** `GET /api/schools/accepted?school_code=...`, `PATCH /api/schools/accepted/[id]` or institute endpoint; optional `POST /api/upload/logo`.  
  **Mobile:** One scrollable form; sticky “Save”; success toast and optional refresh.

---

## 2a. Academic Year Management

**Purpose:** Manage academic years (create, set current), run promotion (promote students to next class), year closure, and view audit logs.

**Flow:**
1. User opens Academic Year Management; sees current year and list of years.
2. Year setup: create academic year (name, start_date, end_date); set current/default year.
3. Promotion engine: select source year/class → target year/class → run promotion (move students).
4. Year closure: close an academic year (lock data if applicable).
5. Audit logs: view log of who did what and when (promotions, closures, key actions).

**Tables:**
- `academic_years` — id, school_code, name, start_date, end_date, is_current.
- `students` — academic_year, class, section (updated by promotion).
- Optional: `audit_logs` — user_id, action, entity, entity_id, old_values, new_values, created_at.

**APIs:**
- `GET /api/academic-years?school_code=...` — list years.
- `POST /api/academic-years` — create year; `PATCH` to set is_current.
- `POST /api/academic-years/promotion` or `/api/promotion/run` — run promotion (body: source_year, target_year, class/section mapping or rules).
- `POST /api/academic-years/[id]/closure` — close year (if supported).
- `GET /api/audit-logs?school_code=...` — audit log (filter by date, action, user).

**Mobile UI/UX:**
- **Year list:** Cards (name, dates, “Current” badge); “Add year” form.
- **Promotion:** Stepper: select source year → target year → select classes/sections → preview → “Run promotion”; confirm.
- **Audit logs:** Date/user filter; table (date, user, action, entity); tap for detail if supported.

**Submodules (in-depth):**

- **Year Setup** — Path: `/academic-year-management/year-setup`. **Purpose:** Create and manage academic years; set current year. **Flow:** GET years → add (POST) or edit; set is_current. **Tables:** `academic_years`. **APIs:** `GET /api/academic-years`, `POST /api/academic-years`, `PATCH /api/academic-years/[id]`. **Mobile:** List years; “Add year” (name, start, end); “Set as current” action.

- **Promotion Engine** — Path: `/academic-year-management/promotion-engine`. **Purpose:** Promote students from one class/section/year to the next. **Flow:** Select source academic year and (optionally) class/section → target year/class → preview count → POST promotion API. **Tables:** `students` (academic_year, class, section updated). **APIs:** `POST /api/academic-years/promotion` or `/api/promotion/run`. **Mobile:** Step 1: source year/class; Step 2: target year/class; Step 3: preview; Step 4: Confirm and run.

- **Year Closure** — Path: `/academic-year-management/year-closure`. **Purpose:** Close an academic year (lock or archive). **Flow:** Select year → “Close year” → confirm → POST closure. **Tables:** `academic_years` (status or closed_at). **APIs:** `POST /api/academic-years/[id]/closure` or equivalent. **Mobile:** List years; “Close” on a year; confirm dialog.

- **Audit Logs** — Path: `/academic-year-management/audit-logs`. **Purpose:** View audit trail of promotions, closures, and other key actions. **Flow:** GET audit logs with filters (date range, user, action). **Tables:** `audit_logs`. **APIs:** `GET /api/audit-logs?school_code=...&from=...&to=...`. **Mobile:** Date range picker; table (date, user, action, entity); optional detail row.

---

## 3. Gallery

**Purpose:** Browse and manage school gallery images (events, activities, categories).

**Flow:**
1. User opens Gallery.
2. App fetches images for school_code (optional filter by category).
3. Display grid; tap image for full-screen or detail. Admin can upload (if permission); upload uses POST with multipart or URL.

**Tables:**
- `gallery` — id, school_code, category, image_url (or file path), title/description, uploaded_by (staff id), is_active, created_at. Optional: relation to `staff` for uploader name.

**APIs:**
- `GET /api/gallery?school_code={school_code}&category={category}`  
  Returns: list of images with optional `uploaded_by_staff` (id, full_name, staff_id).
- `POST /api/gallery` — create (body: school_code, category, title, file or url; auth for upload).

**Mobile UI/UX:**
- **List:** Masonry or uniform grid (2–3 columns). Each cell: image thumbnail, optional title/category. Skeleton placeholders while loading.
- **Filter:** Chips or dropdown for “All” / category.
- **Detail:** Full-screen image with optional title and uploader; swipe to close.
- **Upload (admin):** FAB or header button → screen with category, title, image picker; then submit. Show progress and success state.
- Use consistent corner radius and spacing; avoid tiny tap targets.

**Submodules (in-depth):** Gallery is a single functional area (list albums, view photos, upload). If the app splits it into submodules (e.g. “Albums”, “Upload”), use the same **Tables** and **APIs** above; path would be `/gallery` and optionally `/gallery/upload` or `/gallery/[albumId]` for album detail.

---

## 4. Admin Role Management

**Purpose:** Manage roles and permissions for staff (RBAC): define roles, assign permissions, assign roles to staff.

**Flow:**
1. User opens Admin Role Management (e.g. Settings → Roles or dedicated entry).
2. Load roles with their permissions; load staff list and their assigned roles.
3. Admin can: create/edit roles, attach/detach permissions to roles, assign roles to staff. Optional: per-staff permission overrides.

**Tables:**
- `roles` — id, name, description.
- `permissions` — id, key, name, module (e.g. manage_staff, view_staff).
- `role_permissions` — role_id, permission_id.
- `staff_roles` — staff_id, role_id (or `staff_roles` / RBAC tables).
- `staff_permissions` — optional overrides (staff_id, permission_id, allow/deny).
- `modules`, `sub_modules` — for grouping permissions in UI.
- `permission_categories` — optional grouping.

**APIs:**
- `GET /api/rbac/roles` — list roles with permissions (role_permissions → permissions).
- `GET /api/rbac/permissions` — list all permissions (for assign UI).
- `GET /api/rbac/staff/[staffId]/permissions` or `GET /api/staff/[id]/roles` — staff’s roles/permissions.
- `POST/PUT /api/rbac/roles` — create/update role.
- `POST/PUT /api/rbac/roles/[id]/permissions` — set permissions for role.
- `POST /api/rbac/staff/[staffId]/roles` or staff-permissions APIs — assign roles to staff.

**Mobile UI/UX:**
- **Tabs or list:** “Roles” | “Staff assignment”.
- **Roles:** List of role cards (name, description, permission count). Tap → role detail: list of permissions (checkboxes or chips). Edit role name/description and save.
- **Staff assignment:** Searchable list of staff; tap staff → “Assigned roles” (chips) + “Add role” (picker). Save.
- Use clear hierarchy (section headers, cards); destructive actions (e.g. remove role) with confirmation.
- Loading and empty states for roles and staff.

**Submodules (in-depth):** Admin Role Management is typically one hub (roles list + role detail + staff assignment). If the app exposes separate screens: **Roles** (list/create/edit roles and permissions), **Staff–Role assignment** (assign roles to staff). Same **Tables** and **APIs** as above; paths often `/role-management` and `/role-management/[roleId]` or embedded in one screen.

---

## 5. Password Manager

**Purpose:** Reset or manage login passwords for staff and/or students (bulk or individual).

**Flow:**
1. User opens Password Manager.
2. Option A: List staff/students with “Reset password” per row. Option B: Bulk generate/export credentials.
3. Admin triggers reset/generate; backend generates new password (or sends link); optionally export CSV of credentials.

**Tables:**
- `staff_login` — staff_id, school_code, password hash, etc.
- `student_login` — student id, school_code, password hash, etc.
- `staff`, `students` — for display (name, id, admission_no, etc.).

**APIs:**
- `POST /api/staff/reset-password` — body: school_code, staff_id, new_password (or trigger reset).
- `POST /api/students/reset-password` — body: school_code, student_id or admission_no.
- `GET /api/dashboard/login-credentials?school_code=...` — export credentials (if supported).
- `POST /api/staff/generate-passwords` or `/api/admin/generate-passwords-all` — bulk generate (admin only).

**Mobile UI/UX:**
- **Segment:** “Staff” | “Students”.
- List: searchable by name/id; each row shows name, id/admission_no; “Reset password” button. Confirmation dialog before reset; success toast.
- **Bulk:** “Generate all” or “Export credentials” with confirmation; show progress; result message or share/download file.
- Sensitive screen: consider optional PIN or re-auth before bulk actions.

---

## 6. Staff Management

**Purpose:** CRUD staff, view directory, bulk import, bulk photo upload, staff attendance, attendance reports.

**Flow:**
1. User opens Staff Management; sees directory (list) or dashboard of actions.
2. List: search, filter by role/department; tap staff → profile/detail; edit or delete.
3. Add staff: form (name, staff_id, email, phone, role, etc.) → POST.
4. Bulk import: upload CSV/Excel → parse → validate → POST import API.
5. Bulk photo: upload photos mapped to staff_id.
6. Staff attendance: mark/view daily attendance; reports.

**Tables:**
- `staff` — id, staff_id, full_name, email, phone, role, school_code, designation, join_date, photo_url, etc.
- `staff_login` — login credentials for staff.
- `staff_attendance` — staff_id, school_code, attendance_date, status (present/absent/leave/half-day, etc.).
- `staff_roles`, `staff_permissions` — for RBAC (see Admin Role Management).

**APIs:**
- `GET /api/staff?school_code=...` — list staff.
- `GET /api/staff/[id]` — single staff.
- `POST /api/staff` — create (body: school_code + staff fields).
- `PATCH/PUT /api/staff/[id]` — update.
- `POST /api/staff/import` — bulk import (body: file or parsed rows).
- `POST /api/staff/photos/bulk` — bulk photo upload.
- `GET /api/attendance/staff?school_code=...&date=...` — staff attendance for date.
- `POST /api/attendance/update` or staff-specific attendance — mark attendance.
- `GET /api/reports/staff-attendance-marking?school_code=...` — report.

**Mobile UI/UX:**
- **Directory:** Search bar at top; list with avatar, name, staff_id, role. Pull-to-refresh; infinite scroll or pagination. Tap → detail screen (tabs: Info | Attendance | Permissions if applicable).
- **Add staff:** Multi-step or single long form; clear validation messages; success → “Add another” or “View directory”.
- **Bulk import:** “Import” → file picker → “Parse” → preview table → “Confirm import”; show errors per row if any.
- **Attendance:** Date picker; list of staff with Present/Absent/Leave chips or dropdown; “Save” to submit.
- Use cards for detail view; primary action (Save/Submit) fixed at bottom.

**Submodules (in-depth):**

- **Staff Directory** — Path: `/staff-management/directory` or `/staff/directory`. **Purpose:** Searchable, filterable list of all staff; tap to view/edit profile. **Flow:** `GET /api/staff?school_code=...` with optional search, role/department filters; tap row → detail (GET staff/[id]). Edit → PATCH. **Tables:** `staff`, `staff_login`, `staff_roles`. **APIs:** `GET /api/staff`, `GET /api/staff/[id]`, `PATCH /api/staff/[id]`. **Mobile:** Search bar, filter chips, list with avatar/name/role; pull-to-refresh; tap → detail with tabs (Info | Attendance).

- **Add Staff** — Path: `/staff-management/add` or `/staff/add`. **Purpose:** Create a new staff record (and optionally login). **Flow:** Form (name, staff_id, email, phone, role, designation, join_date) → `POST /api/staff`. **Tables:** `staff`, `staff_login`. **APIs:** `POST /api/staff`. **Mobile:** Stepper or single form; validation; success → “Add another” or “View directory”.

- **Bulk Staff Import** — Path: `/staff-management/bulk-import`. **Purpose:** Import many staff from CSV/Excel. **Flow:** Upload file → parse/validate → preview → `POST /api/staff/import`. **Tables:** `staff`, `staff_login`. **APIs:** `POST /api/staff/import`. **Mobile:** File picker → progress → preview with errors → “Import” → result summary.

- **Bulk Photo Upload** — Path: `/staff-management/bulk-photo`. **Purpose:** Upload photos for multiple staff (staff_id in filename or CSV mapping). **Flow:** Select images or CSV mapping → `POST /api/staff/photos/bulk`. **Tables:** `staff` (photo_url). **APIs:** `POST /api/staff/photos/bulk`. **Mobile:** Multi-image picker; optional mapping; progress; success count.

- **Staff Attendance** — Path: `/staff-management/attendance`. **Purpose:** Mark daily staff attendance (present/absent/leave/half-day). **Flow:** Select date → GET staff attendance → list with toggles → POST update. **Tables:** `staff_attendance`. **APIs:** `GET /api/attendance/staff`, `POST /api/attendance/update`. **Mobile:** Date picker; list with status toggles; “Save”; confirm if many changes.

- **Staff Attendance Marking Report** — Path: `/staff-management/student-attendance-report`. **Purpose:** Report of who marked attendance and staff attendance summary over date range. **Flow:** Filters (date range) → `GET /api/reports/staff-attendance-marking`. **Tables:** `staff_attendance`. **APIs:** `GET /api/reports/staff-attendance-marking`. **Mobile:** Date range; table or cards; export if supported.

---

## 7. Classes

**Purpose:** Manage classes and sections (create, edit, delete), assign class teacher, manage subjects and subject-teachers.

**Flow:**
1. User opens Classes; sees overview (list of classes with student count, class teacher).
2. Add class: class name, section, academic_year, optional class_teacher_id.
3. Edit/delete class; assign class teacher from staff list.
4. Subject-teachers: per class/section, assign subjects and teachers (staff_subjects, class-subject mapping).

**Tables:**
- `classes` — id, school_id, school_code, class, section, academic_year, class_teacher_id, created_at, updated_at.
- `students` — count by class, section, academic_year.
- `staff` — for class teacher name.
- `subjects` — id, name, school_code, etc.
- `class_subjects` or `staff_subjects` — linking classes to subjects and teachers.

**APIs:**
- `GET /api/classes?school_code=...` — list classes with student_count, class_teacher.
- `GET /api/classes/[id]` — single class.
- `POST /api/classes` — create class.
- `PATCH/PUT /api/classes/[id]` — update (e.g. class_teacher_id).
- `GET /api/classes/overview?school_code=...` — overview with counts.
- `GET /api/classes/[id]/subjects` — subjects for class.
- `GET /api/classes/teachers?school_code=...` — class teachers or subject teachers.
- `POST /api/classes/bulk` — bulk create classes.
- `GET /api/classes/detect?school_code=...` — detect from students (if applicable).

**Mobile UI/UX:**
- **Overview:** Cards per class (e.g. “Class 5 A”) with student count and class teacher name; tap → detail.
- **Detail:** Edit class name/section/year; “Assign class teacher” → pick staff; “Subjects” → list subject-teachers (edit if API supports).
- **Add class:** Form (class, section, academic_year, optional class teacher); success → back to list.
- Use simple list or grid; avoid cramming too many actions in one row.

**Submodules (in-depth):**

- **Classes Overview** — Path: `/classes/overview`. **Purpose:** Summary of all classes with student count and class teacher. **Flow:** `GET /api/classes/overview?school_code=...` or `GET /api/classes` with counts. **Tables:** `classes`, `students` (count), `staff`. **APIs:** `GET /api/classes/overview`, `GET /api/classes`. **Mobile:** Cards or list (class name, section, count, teacher); tap → class detail.

- **Modify Classes** — Path: `/classes/modify`. **Purpose:** Create, edit, delete classes; assign class teacher. **Flow:** List classes → add (POST) or edit (PATCH) or delete; assign class_teacher_id. **Tables:** `classes`. **APIs:** `GET /api/classes`, `POST /api/classes`, `PATCH /api/classes/[id]`. **Mobile:** List with “Add class”; tap row → edit form; class teacher picker.

- **Subject Teachers** — Path: `/classes/subject-teachers`. **Purpose:** Assign subject and teacher per class/section. **Flow:** Select class → load subjects and teachers → assign (POST/PATCH class-subject-teacher mapping). **Tables:** `class_subjects`, `staff_subjects`, `subjects`, `staff`. **APIs:** `GET /api/classes/[id]/subjects`, `GET /api/classes/teachers`, POST/PATCH for assignments. **Mobile:** Class picker → table (subject, teacher); tap to change teacher dropdown.

- **Add/Modify Subjects** — Path: `/classes/subjects`. **Purpose:** CRUD subjects for the school (name, code, optional type). **Flow:** List subjects → add/edit/delete. **Tables:** `subjects`. **APIs:** `GET /api/subjects?school_code=...`, `POST /api/subjects`, `PATCH /api/subjects/[id]`. **Mobile:** List + “Add subject”; form (name, code); save.

---

## 8. Students

**Purpose:** CRUD students, directory, attendance, mark attendance, bulk import, siblings.

**Flow:**
1. User opens Students; sees directory (search, filter by class/section).
2. Tap student → profile (view/edit); optional tabs: Attendance, Fees, Marks.
3. Add student: form with required fields (name, admission_no, class, section, academic_year, etc.).
4. Bulk import: upload file → parse → validate → import.
5. Mark attendance: select date, class/section → list students → mark present/absent/leave; submit.
6. Siblings: link siblings (optional table or field).

**Tables:**
- `students` — id, student_name/full_name, admission_no, class, section, academic_year, school_code, roll_number, gender, dob, parent info, photo_url, etc.
- `student_login` — credentials.
- `student_attendance` — student_id, school_code, attendance_date, status (present/absent/half-day/leave, etc.).
- Optional: `student_siblings` or sibling fields on students.

**APIs:**
- `GET /api/students?school_code=...&class=...&section=...&academic_year=...` — list; optional permission check.
- `GET /api/students/[id]` — single student.
- `POST /api/students` — create.
- `PATCH/PUT /api/students/[id]` — update.
- `POST /api/students/import` or `POST /api/students/parse` then import — bulk import.
- `GET /api/attendance/student?school_code=...&date=...` or class-wise — attendance for date.
- `POST /api/attendance/mark` or `POST /api/attendance/admin-mark` — submit attendance.
- `GET /api/students/[id]` might include siblings or `GET /api/.../siblings` — siblings.

**Mobile UI/UX:**
- **Directory:** Search + filters (class, section); list with avatar, name, admission_no, class-section. Tap → detail. Pull-to-refresh; pagination or infinite scroll.
- **Student detail:** Tabs (Info | Attendance | Fees | Marks). Info: edit form; Attendance: calendar or list by date.
- **Mark attendance:** Date + class/section selector → list of students with toggle/chip (Present/Absent/Leave). “Save” at bottom; confirm if large count.
- **Add student:** Stepper or long form; validation; success → “Add another” or “View student”.

**Submodules (in-depth):**

- **Add Student** — Path: `/students/add`. **Purpose:** Create a new student record (and optionally login). **Flow:** Form (name, admission_no, class, section, academic_year, roll_number, gender, dob, parent info, etc.) → `POST /api/students`. **Tables:** `students`, `student_login`. **APIs:** `POST /api/students`. **Mobile:** Stepper or single form; validation; success → “Add another” or “View student”.

- **Student Directory** — Path: `/students/directory`. **Purpose:** Searchable, filterable list of students; view/edit profile. **Flow:** `GET /api/students?school_code=...&class=...&section=...`; tap → detail (GET /api/students/[id]); edit → PATCH. **Tables:** `students`, `student_login`. **APIs:** `GET /api/students`, `GET /api/students/[id]`, `PATCH /api/students/[id]`. **Mobile:** Search + filters (class, section); list with avatar, name, admission_no, class-section; tap → detail (tabs: Info | Attendance | Fees | Marks).

- **Mark Attendance** — Path: `/students/mark-attendance`. **Purpose:** Mark daily student attendance by class/section. **Flow:** Select date and class/section → GET students (or attendance for date) → list with Present/Absent/Leave → POST attendance. **Tables:** `student_attendance`. **APIs:** `GET /api/attendance/student?school_code=...&date=...`, `POST /api/attendance/mark` or `admin-mark`. **Mobile:** Date + class/section pickers → list with toggles/chips; “Save”; confirm if large count.

- **Student Attendance Report** — Path: `/students/attendance-report` (or similar). **Purpose:** View attendance summary by student/class/date range; export. **Flow:** Filters (date range, class, section) → GET report API. **Tables:** `student_attendance`, `students`. **APIs:** `GET /api/attendance/student` with range or dedicated report endpoint. **Mobile:** Date range, class filter; table or cards; export if supported.

- **Bulk Import Students** — Path: `/students/bulk-import`. **Purpose:** Import many students from CSV/Excel. **Flow:** Upload file → parse/validate → preview → `POST /api/students/import`. **Tables:** `students`, `student_login`. **APIs:** `POST /api/students/import` or parse then import. **Mobile:** File picker → preview with errors → “Import” → result summary.

- **Student Siblings** — Path: `/students/siblings`. **Purpose:** Link siblings (associate students as siblings). **Flow:** Select student → add sibling (search and link); list/remove siblings. **Tables:** `student_siblings` or sibling fields on `students`. **APIs:** `GET /api/students/[id]` (with siblings), `POST /api/.../siblings` or PATCH to add sibling. **Mobile:** Student search → detail → “Siblings” section; “Add sibling” → search student → link; list with remove.

---

## 9. Timetable

**Purpose:** Create and manage timetable: define period groups, slots per class (day, period, subject, teacher, room).

**Flow:**
1. User opens Timetable; sees list of classes with “Has timetable” and slot count.
2. Select class → view/edit slots (e.g. Mon Period 1: Math, Teacher X, Room Y).
3. Define period groups (e.g. period names, start/end times); then assign slots per class.
4. Optional: teacher-wise timetable view; group-wise; export/print.

**Tables:**
- `timetable_period_groups` — school_code, name, order, start_time, end_time (or similar).
- `timetable_slots` — school_code, class_id, day_of_week, period_order, subject_id, staff_id (teacher), room, etc.
- `classes`, `subjects`, `staff` — for labels.

**APIs:**
- `GET /api/timetable/list?school_code=...` — list classes with has_timetable, slot_count.
- `GET /api/timetable/slots?school_code=...&class_id=...` — slots for a class.
- `GET /api/timetable/period-groups?school_code=...` — period groups.
- `POST/PUT /api/timetable/slots` or period-groups APIs — create/update slots.
- `GET /api/timetable/subjects?school_code=...` — subjects for dropdown.
- `GET /api/timetable/download?school_code=...` — export (if supported).

**Mobile UI/UX:**
- **Class list:** Cards “Class 5 A”, “Class 6 B” with “View timetable”. Tap → timetable grid.
- **Grid:** Rows = periods, Columns = days; cell = subject + teacher (abbreviated). Tap cell to edit (subject, teacher, room). “Save” to submit.
- **Period groups:** Separate screen or bottom sheet to edit period names/times.
- On small screens: consider day selector (Mon–Sat) and list of periods for that day instead of full grid; or horizontal scroll for grid.

**Submodules (in-depth):**

- **Timetable Builder** — Path: `/timetable` (main timetable entry). **Purpose:** Define period groups and build/edit slots per class. **Flow:** GET period groups and classes → select class → GET/PUT slots (grid: day × period → subject, teacher, room). **Tables:** `timetable_period_groups`, `timetable_slots`. **APIs:** `GET /api/timetable/period-groups`, `GET /api/timetable/list`, `GET /api/timetable/slots?class_id=...`, `POST/PUT /api/timetable/slots`. **Mobile:** Class list → timetable grid; edit cells; “Save”.

- **Class Timetable** — Path: `/timetable/class`. **Purpose:** View/edit timetable by class (same data as builder, class-centric view). **Flow:** Same as builder; filter or entry by class. **Tables:** `timetable_slots`, `classes`, `subjects`, `staff`. **APIs:** `GET /api/timetable/slots?school_code=...&class_id=...`, update slots. **Mobile:** Class picker → grid (days × periods); tap cell to edit.

- **Teacher Timetable** — Path: `/timetable/teacher`. **Purpose:** View timetable by teacher (which classes/subjects per day-period). **Flow:** GET slots grouped by staff_id or API that returns teacher-wise view. **Tables:** `timetable_slots`, `staff`, `classes`, `subjects`. **APIs:** `GET /api/timetable/teacher?school_code=...&staff_id=...` or derive from slots. **Mobile:** Teacher picker → grid or list of assignments (day, period, class, subject).

- **Group Wise Timetable** — Path: `/timetable/group-wise`. **Purpose:** View timetable by group (e.g. grade group or custom group). **Flow:** Groups may be defined in backend; GET slots for group’s classes. **Tables:** `timetable_slots`, possibly `timetable_groups` or class groups. **APIs:** `GET /api/timetable/group-wise?school_code=...&group_id=...` or similar. **Mobile:** Group picker → list of classes in group with timetable links or combined view.

---

## 10. Calendar

**Purpose:** Academic calendar and events (holidays, events); create/edit events; optionally notify staff/students.

**Flow:**
1. User opens Calendar; sees month view or list of events.
2. Tap date → events for that date; tap event → detail (title, description, type, applicable_for).
3. Create event: date, title, description, event_type (event/holiday), applicable_for (all/specific_class), applicable_classes.
4. Backend may create notifications (events table + notifications).

**Tables:**
- `academic_calendar` — school_id, academic_year, dates/terms (structure may vary).
- `events` — id, school_id, school_code, event_date, title, description, event_type, applicable_for, applicable_classes.
- Optional: `event_notifications` or similar for push/in-app notices.

**APIs:**
- `GET /api/calendar/academic?school_code=...&academic_year=...` — academic calendar entries (may include events).
- `GET /api/calendar/events?school_code=...&start_date=...&end_date=...` — events in range.
- `GET /api/calendar/events/[id]` — single event.
- `POST /api/calendar/events` — create (body: school_code, event_date, title, description, event_type, applicable_for, applicable_classes).
- `PATCH/PUT /api/calendar/events/[id]` — update.
- `DELETE /api/calendar/events/[id]` — delete.

**Mobile UI/UX:**
- **Month view:** Calendar strip or full month; dots or badges on dates with events. Tap date → bottom sheet or screen with events for that day.
- **Event list:** Optional “List” view: grouped by date; tap → detail.
- **Add event:** Form (date picker, title, description, type, applicable for); “Create”. Success → back to calendar.
- Use calendar component (e.g. react-native-calendars); keep event type (event vs holiday) visually distinct (e.g. color or icon).

**Submodules (in-depth):**

- **Academic Calendar** — Path: `/calendar/academic`. **Purpose:** View/edit academic calendar (terms, session dates, key dates). **Flow:** GET academic calendar for school/year → display; edit if supported (PATCH). **Tables:** `academic_calendar`. **APIs:** `GET /api/calendar/academic?school_code=...&academic_year=...`. **Mobile:** List or calendar view of terms/dates; read-only or simple edit form.

- **Events** — Path: `/calendar/events`. **Purpose:** List and create events (holidays, school events). **Flow:** GET events in range → list; tap → detail; create (POST), edit (PATCH), delete (DELETE). **Tables:** `events`. **APIs:** `GET /api/calendar/events?school_code=...&start_date=...&end_date=...`, `POST /api/calendar/events`, `PATCH/DELETE /api/calendar/events/[id]`. **Mobile:** Month view with dots; tap date → events for day; “Add event” form; event type (event/holiday) with distinct color/icon.

---

## 11. Examinations

**Purpose:** Create exams, define schedule (date, class, section, subject, time, room), publish; later link to marks entry.

**Flow:**
1. User opens Examinations; sees list of exams (upcoming, ongoing, completed).
2. Create exam: name, type, academic_year, start_date, end_date; then add class mappings; then add schedule (per class-section, subject, date, time, room).
3. Publish exam so it appears to teachers/students; marks entry uses exam_id.
4. View exam detail: schedule, status; link to marks entry.

**Tables:**
- `examinations` — id, exam_name, academic_year, status, school_code, start_date, end_date, created_by.
- `exam_class_mappings` — exam_id, class_id (or class/section/academic_year).
- `exam_subject_mappings` — exam_id, subject_id, max_marks, etc.
- `exam_schedules` — exam_id, school_code, exam_date, class, section, subject, start_time, end_time, room, duration_minutes, max_marks.
- `exam_subjects` — legacy or alternate structure.

**APIs:**
- `GET /api/examinations?school_code=...` or `GET /api/examinations/v2/list?school_code=...` — list exams.
- `GET /api/examinations/[examId]` — single exam with schedule/mappings.
- `POST /api/examinations/v2/create` — create exam + class mappings + subject mappings + schedules (body: full structure).
- `PATCH /api/examinations/[examId]` — update.
- `POST /api/examinations/[examId]/publish` — set status to published.
- `GET /api/examinations/[examId]/schedules` — list schedule rows.
- `POST /api/examinations/[examId]/schedules` — add/edit schedule.

**Mobile UI/UX:**
- **List:** Cards per exam (name, dates, status). Filter by status. Tap → exam detail.
- **Detail:** Tabs or sections: Info (name, dates, status) | Schedule (table: date, class, section, subject, time, room) | Marks (link to marks entry).
- **Create:** Stepper: (1) Basic info (name, type, year, dates) → (2) Classes → (3) Subjects & max marks → (4) Schedule (add rows). “Create” at end; show validation per step.
- **Publish:** Button on detail; confirm dialog. Use status badges (Draft / Published) with color.

**Submodules (in-depth):**

- **Examination Dashboard** — Path: `/examinations/dashboard`. **Purpose:** Overview of exams (upcoming, ongoing, completed); quick links to create and view. **Flow:** `GET /api/examinations?school_code=...` or v2/list; show cards by status. **Tables:** `examinations`. **APIs:** `GET /api/examinations` or `GET /api/examinations/v2/list`. **Mobile:** Cards (name, dates, status); “Create exam” button; tap card → exam detail.

- **Create Examination** — Path: `/examinations/create`. **Purpose:** Create new exam with basic info, class mappings, subject mappings, and schedule. **Flow:** Stepper: (1) name, type, year, dates (POST or save draft) → (2) classes → (3) subjects & max marks → (4) schedule rows → submit. **Tables:** `examinations`, `exam_class_mappings`, `exam_subject_mappings`, `exam_schedules`. **APIs:** `POST /api/examinations/v2/create` or step-wise APIs. **Mobile:** Stepper; validation per step; “Create” at end.

- **Grade Scale** — Path: `/examinations/grade-scale`. **Purpose:** Define grade boundaries (min_marks, max_marks, grade) for auto-grading. **Flow:** GET grade scale → list rows; add/edit/delete. **Tables:** `grade_scales`. **APIs:** `GET /api/grade-scales?school_code=...`, `POST/PATCH /api/grade-scales`. **Mobile:** List (min, max, grade); “Add” form; inline or modal edit.

- **Examination Reports** — Path: `/examinations/reports`. **Purpose:** Reports per exam (schedule, marks summary, pass/fail, rank). **Flow:** Select exam → GET report data. **Tables:** `examinations`, `exam_schedules`, `student_subject_marks`, `student_exam_summary`. **APIs:** `GET /api/examinations/[id]/schedules`, `GET /api/reports/marks?exam_id=...` or exam-specific report. **Mobile:** Exam picker → table or summary cards; export if supported.

---

## 11a. Report Card

**Purpose:** Generate report cards for students (exam-wise or term-wise); customize templates; view dashboard of generated report cards.

**Flow:**
1. User opens Report Card; dashboard shows recent generated report cards or templates.
2. Generate: select exam/class/section (or student) → choose template → generate (PDF/image); optional bulk.
3. Customize template: edit layout, placeholders (name, class, marks, grade), save.
4. Dashboard: list issued/generated report cards; view, download, share.

**Tables:**
- `report_card_templates` — school_code, name, layout (HTML/JSON), placeholders.
- Generated report cards (e.g. `report_cards` or `certificates_issued`-style) — student_id, exam_id, template_id, file_url, generated_at.
- `examinations`, `student_subject_marks`, `students`, `classes` — for data in report.

**APIs:**
- `GET /api/report-card/templates?school_code=...` — list templates.
- `POST /api/report-card/templates` — create; `PATCH /api/report-card/templates/[id]` — update.
- `POST /api/report-card/generate` — generate (body: exam_id, class/section or student_ids, template_id).
- `GET /api/report-card/dashboard?school_code=...` — list generated report cards.
- `GET /api/report-card/generated/[id]` — single (download URL).

**Mobile UI/UX:**
- **Dashboard:** Cards (recent report cards); “Generate” button; “Templates” link.
- **Generate:** Exam/class picker → template picker → “Generate” → progress → list of generated (view/download).
- **Templates:** List templates; tap to edit (name, placeholders); save.

**Submodules (in-depth):**

- **Generate Report Card** — Path: `/report-card/generate`. **Purpose:** Generate report cards for selected exam/class/students using a template. **Flow:** Select exam (and class/section or students) → select template → POST generate → show generated list with view/download. **Tables:** Generated report card storage; `report_card_templates`, `student_subject_marks`, `examinations`. **APIs:** `POST /api/report-card/generate`, `GET /api/report-card/dashboard` or generated list. **Mobile:** Stepper or single screen: exam → class/students → template → Generate; then list with View/Download.

- **Report Card Dashboard** — Path: `/report-card/dashboard`. **Purpose:** List and access generated report cards; filters by exam/class/date. **Flow:** GET list of generated report cards → tap → view/download. **Tables:** Generated report cards. **APIs:** `GET /api/report-card/dashboard`. **Mobile:** List/cards (student name, exam, date); filter; tap → View/Download.

- **Customize Template** — Path: `/report-card/templates`. **Purpose:** CRUD report card templates (layout, placeholders). **Flow:** GET templates → add/edit (name, layout, placeholders) → save. **Tables:** `report_card_templates`. **APIs:** `GET /api/report-card/templates`, `POST/PATCH /api/report-card/templates`. **Mobile:** List templates; “Add” form; tap to edit (fields for name and key placeholders; full layout often on web).

---

## 12. Marks

**Purpose:** Enter or approve marks per exam/subject/class; view marks; bulk entry; grade scale.

**Flow:**
1. User opens Marks; sees exam list or class-wise entry points.
2. Select exam + class (and section) + subject → list of students with mark input. Enter marks (and optional grade/remarks); submit.
3. Optional: bulk upload; approval workflow (teacher submits, admin approves). View reports (class average, pass/fail).
4. Grade scale: define grade boundaries (e.g. A: 90–100); used for auto-grade.

**Tables:**
- `student_subject_marks` — exam_id, student_id, subject_id, marks_obtained, max_marks, grade, remarks, entered_by, school_code.
- `student_exam_summary` — exam_id, student_id, total/percentage/rank (optional).
- `examinations`, `students`, `subjects`, `classes` — for context.
- `grade_scales` — school_code, min_marks, max_marks, grade, description.

**APIs:**
- `GET /api/marks/view?school_code=...&exam_id=...` — view marks (by class/section).
- `GET /api/marks/class?school_code=...&exam_id=...&class_id=...` — students and marks for class.
- `POST /api/examinations/marks/submit` or `POST /api/marks` — submit marks (body: exam_id, class_id, subject_id, entries: [{ student_id, marks }]).
- `GET /api/examinations/marks?school_code=...&exam_id=...` — get marks for exam.
- `GET /api/grade-scales?school_code=...` — grade scale.
- `POST /api/marks/bulk` — bulk entry (if supported).
- `GET /api/reports/marks?school_code=...` — marks report.

**Mobile UI/UX:**
- **Entry:** Exam picker → Class picker → Subject picker → list of students with numeric input (and optional grade/remarks). Sticky “Submit” at bottom; confirm before submit. Show “Saved” state.
- **View:** Same filters; read-only list or table; optional export.
- **Grade scale:** List of rows (min, max, grade); add/edit in form or inline. Keep inputs accessible (large enough, correct keyboard).

**Submodules (in-depth):**

- **Marks Dashboard** — Path: `/marks`. **Purpose:** Entry point: list exams or class-wise entry; view marks summary. **Flow:** GET exams or marks overview; navigate to mark entry or view. **Tables:** `examinations`, `student_subject_marks`. **APIs:** `GET /api/examinations`, `GET /api/marks/view?exam_id=...`. **Mobile:** Exam cards or filters (exam, class, subject); “Enter marks” / “View marks” actions.

- **Mark Entry** — Path: `/marks-entry`. **Purpose:** Enter marks per exam, class, subject for each student. **Flow:** Select exam → class → subject → GET students (and existing marks) → input marks → POST submit. **Tables:** `student_subject_marks`. **APIs:** `GET /api/marks/class?school_code=...&exam_id=...&class_id=...`, `POST /api/examinations/marks/submit` or `POST /api/marks`. **Mobile:** Pickers (exam, class, subject); list of students with numeric input; sticky “Submit”; confirm; show “Saved”.

---

## 13. Fees

**Purpose:** Fee heads, structures, collect payments, fee statements, discounts/fines, reports (dashboard, collection, pending).

**Flow:**
1. User opens Fees; dashboard shows total collected, pending, this month collection, etc.
2. Fee heads: create/edit heads (name, optional, amount if fixed).
3. Fee structures: attach heads to class/academic_year; optional due dates.
4. Collection: select student (or class), select structure/head, amount, payment mode, date → create payment (receipt).
5. Statements: per-student view of dues and paid; discounts/fines if supported.
6. Reports: daily/monthly collection, pending, overdue.

**Tables:**
- `fee_heads` — school_code, name, description, is_optional.
- `fee_structures` — school_code, name, academic_year, class or global; links to fee_heads and amounts.
- `payments` — school_code, student_id, amount, payment_date, fee_structure_id or fee_head_id, payment_mode, receipt_number, is_reversed.
- Legacy: `fees`, `student_fees` — may still be used for old flow.
- `receipts` — receipt metadata; optional.

**APIs:**
- `GET /api/v2/fees/fee-heads?school_code=...` — list fee heads.
- `POST /api/v2/fees/fee-heads` — create fee head.
- `GET /api/v2/fees/fee-structures?school_code=...` — list structures.
- `POST /api/v2/fees/fee-structures` — create; `GET /api/v2/fees/fee-structures/[id]` — detail.
- `GET /api/v2/fees/reports/dashboard?school_code=...` — dashboard stats.
- `POST /api/v2/fees/payments` — record payment (body: school_code, student_id, amount, payment_date, ...).
- `GET /api/v2/fees/students/[studentId]/fees` — student fee summary/dues.
- `GET /api/fees/statements?school_code=...` or per-student — statements.
- `GET /api/fees/reports/daily`, `reports/monthly`, `reports/pending` — reports.

**Mobile UI/UX:**
- **Dashboard:** Cards: Total collected, This month, Pending; quick “Collect payment” button.
- **Collect:** Student search → select student → “Outstanding” summary → “Add payment” (amount, mode, date) → receipt preview → Confirm. Success: show receipt number and option to share/print.
- **Structures/Heads:** List of heads; tap to edit. Structures: list by name/class; tap to edit components (heads + amounts).
- **Statements:** Search student → show dues and payment history in list/cards.
- Use rupee (₹) formatting; clear labels for payment mode and date.

**Submodules (in-depth):**

- **Fee Dashboard** — Path: `/fees/v2/dashboard`. **Purpose:** Summary cards: total collected, this month, pending; quick “Collect payment”. **Flow:** `GET /api/v2/fees/reports/dashboard?school_code=...`. **Tables:** Aggregates from `payments`, `fee_structures`, dues. **APIs:** `GET /api/v2/fees/reports/dashboard`. **Mobile:** Cards (collected, month, pending); “Collect payment” button.

- **Fee Heads** — Path: `/fees/v2/fee-heads`. **Purpose:** CRUD fee heads (name, description, is_optional, optional default amount). **Flow:** GET list → add/edit/delete. **Tables:** `fee_heads`. **APIs:** `GET /api/v2/fees/fee-heads`, `POST /api/v2/fees/fee-heads`, `PATCH/DELETE` if supported. **Mobile:** List; “Add” form; tap to edit.

- **Fee Structures** — Path: `/fees/v2/fee-structures`. **Purpose:** Create/edit structures: attach fee heads with amounts, link to class/academic_year. **Flow:** GET structures → create (POST) or edit (PATCH); manage head–amount mapping. **Tables:** `fee_structures`, structure–head mapping. **APIs:** `GET /api/v2/fees/fee-structures`, `POST /api/v2/fees/fee-structures`, `GET/PATCH /api/v2/fees/fee-structures/[id]`. **Mobile:** List by name/class; tap → edit components (heads + amounts).

- **Collect Payment** — Path: `/fees/v2/collection`. **Purpose:** Record payment: select student, structure/head, amount, mode, date → receipt. **Flow:** Student search → GET dues → “Add payment” (amount, mode, date) → POST payments → show receipt. **Tables:** `payments`, `receipts`. **APIs:** `GET /api/v2/fees/students/[studentId]/fees`, `POST /api/v2/fees/payments`. **Mobile:** Student search → outstanding summary → payment form → receipt; share/print.

- **Student Fee Statements** — Path: `/fees/statements`. **Purpose:** Per-student view of dues and payment history. **Flow:** Search student → GET statement (dues, paid, dates). **Tables:** `payments`, `fee_structures`, `students`. **APIs:** `GET /api/v2/fees/students/[studentId]/fees`, `GET /api/fees/statements`. **Mobile:** Student picker → list/cards of dues and history.

- **Discounts & Fines** — Path: `/fees/discounts-fines`. **Purpose:** Configure or apply discounts/fines per student or head; waive or add fine. **Flow:** If config: list rules; if per-student: select student → add discount/fine. **Tables:** Discount/fine table or fields on payments/structures. **APIs:** `GET/POST /api/fees/discounts` or similar; per-student apply/waive. **Mobile:** List of rules or student search → “Add discount/fine” form.

- **Fee Reports** — Path: `/fees/reports`. **Purpose:** Daily/monthly collection, pending, overdue reports. **Flow:** Filters (date range, class) → GET report. **Tables:** `payments`, `students`, `fee_structures`. **APIs:** `GET /api/fees/reports/daily`, `reports/monthly`, `reports/pending`. **Mobile:** Date range + filters; table or summary; export if supported.

---

## 14. Library

**Purpose:** Manage books (catalogue), copies (accession numbers), issue/return transactions; sections and material types.

**Flow:**
1. User opens Library; dashboard or catalogue view.
2. Books: add book (title, author, ISBN, section, material_type); add copies (accession numbers). List with available/total copies.
3. Issue: select book/copy, select student (or borrower); record issue date; return by date.
4. Return: select transaction or scan; record return; update copy status.
5. Sections and material types: CRUD for dropdowns.

**Tables:**
- `library_books` — school_code, title, author, isbn, section_id, material_type_id, etc.
- `library_book_copies` — book_id, accession_number, status (available/issued/lost).
- `library_sections` — name, school (e.g. section_id per school).
- `library_material_types` — name (Book, Magazine, etc.).
- `library_transactions` — book_copy_id or book_id, borrower_id (student_id), issue_date, due_date, return_date, school_code.

**APIs:**
- `GET /api/library/books?school_code=...&search=...&section_id=...&material_type_id=...` — list books with copies count (available/total).
- `POST /api/library/books` — create book; `PATCH /api/library/books/[id]` — update.
- `GET /api/library/books/[id]` — detail with copies.
- `POST /api/library/books/copies` — add copies.
- `GET /api/library/transactions?school_code=...` — list transactions (filter by status).
- `POST /api/library/transactions` — issue (body: copy_id, borrower_id, due_date).
- `POST /api/library/transactions/[id]/return` — return.
- `GET /api/library/sections?school_code=...`, `GET /api/library/material-types` — sections and types.
- `GET /api/library/stats?school_code=...` — simple stats.

**Mobile UI/UX:**
- **Catalogue:** Search bar; list of books (title, author, “X/Y available”). Tap → detail (copies list, “Issue” per copy).
- **Issue:** Borrower search (student) → select copy → due date → “Issue”. Success toast.
- **Return:** List “Issued” transactions or search by student/copy → “Return”. Confirm.
- **Add book:** Form (title, author, ISBN, section, type) + “Add copies” (count or list of accession numbers). Use cards for book detail; clear status badges (Available / Issued).

**Submodules (in-depth):**

- **Library Dashboard** — Path: `/library/dashboard`. **Purpose:** Summary: total books, issued count, overdue; quick links to catalogue and transactions. **Flow:** `GET /api/library/stats?school_code=...`. **Tables:** Aggregates from `library_books`, `library_book_copies`, `library_transactions`. **APIs:** `GET /api/library/stats`. **Mobile:** Cards (books, issued, overdue); links to Catalogue, Transactions.

- **Library Basics** — Path: `/library/basics`. **Purpose:** CRUD for sections and material types (dropdowns used in catalogue). **Flow:** GET sections and material types → add/edit/delete. **Tables:** `library_sections`, `library_material_types`. **APIs:** `GET /api/library/sections`, `GET /api/library/material-types`, POST/PATCH for each. **Mobile:** Tabs or list “Sections” | “Material types”; list + “Add” form each.

- **Library Catalogue** — Path: `/library/catalogue`. **Purpose:** List/search books; add book and copies; view detail (copies, issue). **Flow:** GET books (search, filters) → tap → detail with copies; POST book, POST copies; issue from detail. **Tables:** `library_books`, `library_book_copies`. **APIs:** `GET /api/library/books`, `POST /api/library/books`, `GET /api/library/books/[id]`, `POST /api/library/books/copies`. **Mobile:** Search; list (title, author, X/Y available); tap → detail; “Issue” per copy.

- **Library Transactions** — Path: `/library/transactions`. **Purpose:** List issue/return transactions; perform return. **Flow:** GET transactions (filter: issued/returned) → “Return” on issued row. **Tables:** `library_transactions`. **APIs:** `GET /api/library/transactions`, `POST /api/library/transactions/[id]/return`. **Mobile:** Filter (Issued / Returned); list (borrower, book, due date); “Return” button; confirm.

---

## 15. Transport

**Purpose:** Manage vehicles, stops, routes, and route–student mapping; optional fee config.

**Flow:**
1. User opens Transport; sees routes list (each route has vehicle, stops, optional student count).
2. Vehicles: add/edit vehicle (number, type, capacity).
3. Stops: add/edit stop (name, address, order).
4. Routes: create route (name, vehicle_id), add stop sequence (route_stops with order).
5. Route–students: assign students to route (and optionally stop); used for bus pass and tracking.

**Tables:**
- `transport_vehicles` — school_code, vehicle_number, type, capacity, is_active.
- `transport_stops` — school_code, stop_name, address, order or location.
- `transport_routes` — school_code, name, vehicle_id, is_active.
- `transport_route_stops` — route_id, stop_id, stop_order.
- `transport_students` or student-level assignment (route_id, student_id, stop_id) — for mapping.
- Optional: `transport_fee_config` — fee per route/class.

**APIs:**
- `GET /api/transport/routes?school_code=...` — routes with vehicle and route_stops (stops).
- `GET /api/transport/vehicles?school_code=...` — vehicles.
- `POST /api/transport/vehicles` — create; `PATCH /api/transport/vehicles/[id]` — update.
- `GET /api/transport/stops?school_code=...` — stops.
- `POST /api/transport/stops` — create; `PATCH /api/transport/stops/[id]` — update.
- `POST /api/transport/routes` — create route; `PATCH /api/transport/routes/[id]` — update; add/remove route_stops.
- `GET /api/transport/students?school_code=...` — student–route mapping; POST to assign.

**Mobile UI/UX:**
- **Routes:** List of route cards (name, vehicle number, stop count). Tap → detail (stops in order, “Assign students”).
- **Vehicles / Stops:** Simple list + “Add”; form for name/number/capacity/address.
- **Assign students:** Search student → pick route and stop from dropdown → “Assign”. List current assignments with “Remove” option.
- Use clear hierarchy (Route → Stops; Route → Students); avoid long forms on one screen.

**Submodules (in-depth):**

- **Transport Dashboard** — Path: `/transport/dashboard`. **Purpose:** Overview: routes count, vehicles, students mapped; quick links. **Flow:** GET routes/vehicles summary or stats. **Tables:** `transport_routes`, `transport_vehicles`, `transport_students`. **APIs:** `GET /api/transport/routes` (summary), or dedicated stats endpoint. **Mobile:** Cards (routes, vehicles, students); links to Vehicles, Stops, Routes, Student mapping.

- **Vehicles** — Path: `/transport/vehicles`. **Purpose:** CRUD vehicles (number, type, capacity). **Flow:** GET vehicles → add (POST), edit (PATCH). **Tables:** `transport_vehicles`. **APIs:** `GET /api/transport/vehicles`, `POST /api/transport/vehicles`, `PATCH /api/transport/vehicles/[id]`. **Mobile:** List; “Add” form (number, type, capacity); tap to edit.

- **Stops** — Path: `/transport/stops`. **Purpose:** CRUD stops (name, address, order). **Flow:** GET stops → add/edit. **Tables:** `transport_stops`. **APIs:** `GET /api/transport/stops`, `POST /api/transport/stops`, `PATCH /api/transport/stops/[id]`. **Mobile:** List; “Add” form; tap to edit.

- **Routes** — Path: `/transport/routes`. **Purpose:** Create/edit routes: name, vehicle, sequence of stops. **Flow:** GET routes → add (name, vehicle) → add route_stops (stop_id, order); PATCH to update. **Tables:** `transport_routes`, `transport_route_stops`. **APIs:** `GET /api/transport/routes`, `POST /api/transport/routes`, `PATCH /api/transport/routes/[id]`. **Mobile:** List route cards; tap → detail (stops in order); edit stops order; “Assign students” link.

- **Student Route Mapping** — Path: `/transport/route-students`. **Purpose:** Assign students to route (and optionally stop). **Flow:** Search student → select route and stop → POST assign; list assignments with remove. **Tables:** `transport_students` or student–route mapping. **APIs:** `GET /api/transport/students`, POST to assign, DELETE to remove. **Mobile:** Student search → route + stop dropdowns → “Assign”; list current with “Remove”.

---

## 16. Leave Management

**Purpose:** Define leave types; staff leave requests (apply, approve/reject); student leave requests (apply, class teacher/admin approve); dashboard summary.

**Flow:**
1. User opens Leave Management; dashboard shows pending staff/student requests, leave types.
2. Leave types: CRUD (name, code, max days, applicable_to: staff/student).
3. Staff leave: list requests; filter by status; approve/reject with optional comment.
4. Student leave: list requests (optionally by class); class teacher or admin approves/rejects.
5. Leave basics: set working days, holiday list if stored here.

**Tables:**
- `leave_types` — school_code, name, code, max_days, applicable_to (staff/student).
- `staff_leave_requests` — staff_id, leave_type_id, start_date, end_date, reason, status, approved_by, etc.
- `student_leave_requests` — student_id, leave_type_id, start_date, end_date, reason, status, approved_by, etc.
- Optional: `institute_working_days` — for working days.

**APIs:**
- `GET /api/leave/dashboard-summary?school_code=...` — counts and recent staff/student requests.
- `GET /api/leave/types?school_code=...` — leave types.
- `POST /api/leave/types` — create; `PATCH /api/leave/types/[id]` — update.
- `GET /api/leave/requests?school_code=...` — staff requests (filter status).
- `GET /api/leave/requests/[id]` — single request.
- `PATCH /api/leave/requests/[id]` — approve/reject (body: status, comment).
- `GET /api/leave/student-requests?school_code=...` — student requests.
- `GET /api/leave/student-requests/[id]` — single; `POST /api/leave/student-requests/[id]/class-teacher-approval` — approve/reject.
- `GET /api/leave/basics` — working days (if applicable).

**Mobile UI/UX:**
- **Dashboard:** Cards: Pending staff, Pending student; “Leave types” link. List “Recent requests” (tap to open).
- **Requests list:** Tabs “Staff” | “Students”; filter by status. Card per request (name, dates, type, reason, status). Tap → detail with “Approve” / “Reject” and comment field.
- **Leave types:** List with add; form (name, code, max days, applicable to). Use status chips (Pending / Approved / Rejected) with color.

**Submodules (in-depth):**

- **Leave Dashboard** — Path: `/leave/dashboard`. **Purpose:** Summary: pending staff/student requests; leave types; recent requests. **Flow:** `GET /api/leave/dashboard-summary?school_code=...`. **Tables:** `leave_types`, `staff_leave_requests`, `student_leave_requests`. **APIs:** `GET /api/leave/dashboard-summary`. **Mobile:** Cards (pending staff, pending student); “Leave types”; list recent requests (tap to open).

- **Staff Leave Management** — Path: `/leave/staff-leave-management`. **Purpose:** List staff leave requests; approve/reject. **Flow:** GET staff requests (filter status) → tap → detail → PATCH (status, comment). **Tables:** `staff_leave_requests`. **APIs:** `GET /api/leave/requests`, `GET /api/leave/requests/[id]`, `PATCH /api/leave/requests/[id]`. **Mobile:** Tabs or filter (Pending/Approved/Rejected); cards (name, dates, type, reason); tap → Approve/Reject + comment.

- **Student Leave Approval** — Path: `/leave/student-leave`. **Purpose:** List student leave requests; approve/reject (class teacher or admin). **Flow:** GET student requests → tap → detail → approve/reject. **Tables:** `student_leave_requests`. **APIs:** `GET /api/leave/student-requests`, `POST /api/leave/student-requests/[id]/class-teacher-approval` or PATCH. **Mobile:** Same pattern as staff; filter by class if supported.

- **Staff Leave Approval** — Path: `/leave/staff-leave`. **Purpose:** Same as Staff Leave Management (alternate path for approval flow). Use same APIs and flow as Staff Leave Management.

- **Leave Basics** — Path: `/leave/basics`. **Purpose:** Configure leave types and optional working days/holidays. **Flow:** GET leave types → CRUD; GET/PATCH working days if supported. **Tables:** `leave_types`, optional `institute_working_days`. **APIs:** `GET /api/leave/types`, `POST/PATCH /api/leave/types`, `GET /api/leave/basics`. **Mobile:** List leave types; “Add” form (name, code, max days, applicable to); edit/delete.

---

## 17. Communication

**Purpose:** Create and publish notices/circulars (title, content, category, priority, publish_at); list and filter; optional audience (all/class).

**Flow:**
1. User opens Communication; sees list of notices (latest first); filter by category/status.
2. Create notice: title, content (rich text or plain), category, priority, publish_at date; optional target (all/specific classes). Publish → status Active.
3. Edit/delete draft or published notice. Students/teachers see active notices (by publish_at and audience).

**Tables:**
- `notices` — id, school_id, school_code, title, content, category, priority, status (Draft/Active/Archived), publish_at, created_at, updated_at.

**APIs:**
- `GET /api/communication/notices?school_code=...&category=...&status=...` — list notices.
- `GET /api/communication/notices/[id]` — single notice.
- `POST /api/communication/notices` — create (body: school_code, title, content, category, priority, publish_at, status).
- `PATCH/PUT /api/communication/notices/[id]` — update.
- `DELETE /api/communication/notices/[id]` — delete (or soft delete if supported).

**Mobile UI/UX:**
- **List:** Cards (title, category, date, priority badge). Pull-to-refresh; filter by category. Tap → full content (read view).
- **Create/Edit:** Form: title, content (multiline or rich), category dropdown, priority, publish date. “Save draft” / “Publish”. Use priority color (e.g. High = red, Normal = gray).
- **Detail:** Full title and body; optional “Edit” for admin. Use readable font size and line height for content.

**Submodules (in-depth):** Communication is a single functional area: list notices, create/edit notice, view detail. Path: `/communication`. If the app splits into submodules, use: **Notices list** (default), **Create notice** (`/communication/new`), **Notice detail** (`/communication/[id]`). Same **Tables** and **APIs** as above.

---

## 18. Reports

**Purpose:** Predefined reports: student, staff, marks, examination, financial, leave, timetable, library, transport (export or view).

**Flow:**
1. User opens Reports; sees list of report types (Student report, Staff report, Marks report, etc.).
2. Tap report → set filters (school_code, date range, class, exam, etc.) → “Generate” or “Export”. Backend returns data or file (CSV/PDF).
3. Display result (table or chart) or offer download/share.

**Tables:** Depends on report — students, staff, marks, examinations, fees/payments, leave, timetable_slots, library_transactions, transport_routes/students, etc.

**APIs:**
- `GET /api/reports/student?school_code=...` — student report (e.g. CSV).
- `GET /api/reports/staff?school_code=...` — staff report.
- `GET /api/reports/marks?school_code=...&exam_id=...` — marks report.
- `GET /api/reports/examination?school_code=...` — exam report.
- `GET /api/reports/financial?school_code=...&...` — financial report.
- `GET /api/reports/leave?school_code=...` — leave report.
- `GET /api/reports/timetable?school_code=...` — timetable report.
- `GET /api/reports/library?school_code=...` — library report.
- `GET /api/reports/transport?school_code=...` — transport report.
- `GET /api/reports/staff-attendance-marking?school_code=...` — staff attendance report.

**Mobile UI/UX:**
- **Report list:** One row/card per report type (icon + name). Tap → filter screen.
- **Filters:** Date range, class, exam, etc. “View” or “Export”. If export → “Download” or “Share” after response.
- **View:** If backend returns JSON, show table or key metrics; paginate if large. Use simple table layout; consider horizontal scroll for many columns.

**Submodules (in-depth):** Reports is a list of report types; each type can be a submodule (same path `/reports` with query or subpath). **Student report** — filters (class, section) → GET /api/reports/student. **Staff report** — GET /api/reports/staff. **Marks report** — exam_id, class → GET /api/reports/marks. **Examination report** — GET /api/reports/examination. **Financial report** — GET /api/reports/financial. **Leave report** — GET /api/reports/leave. **Timetable / Library / Transport / Staff attendance marking** — corresponding GET /api/reports/... endpoints. **Mobile:** One card/row per report type; tap → filter screen → View/Export.

---

## 19. Certificate Management

**Purpose:** Issue certificates to students (e.g. bonafide, transfer, conduct); templates; bulk generate; track issued.

**Flow:**
1. User opens Certificate Management; sees list of issued certificates or templates.
2. Templates: create/edit certificate template (layout, placeholders for name, class, date, etc.).
3. Issue: select student, select template, fill dynamic fields → generate PDF/image; mark as issued; optional print/share.
4. Bulk: select multiple students + template → generate all.
5. Verify: optional public verify by code (certificate_verify table or similar).

**Tables:**
- `certificate_templates` or `report_card_templates` — school_code, name, layout (HTML/JSON), placeholders.
- `simple_certificates` — school_code, student_id, certificate_title, certificate_image_url, submitted_at, submitted_by.
- `certificates_issued` or similar — id, student_id, template_id, issued_at, code (for verify).
- `students` — for student name, class, section.

**APIs:**
- `GET /api/certificates/simple?school_code=...` — list certificates (with student details).
- `GET /api/certificates/templates?school_code=...` — list templates.
- `POST /api/certificates/templates` — create template; `PATCH /api/certificates/templates/[id]` — update.
- `POST /api/certificates/generate` — generate one (body: student_id, template_id, fields).
- `POST /api/certificates/bulk/generate` — bulk generate.
- `GET /api/certificates/verify/[code]` — public verify (optional).
- `GET /api/certificates/issued?school_code=...` — list issued.
- `POST /api/certificates/simple/upload` — upload certificate image (if flow is upload-based).

**Mobile UI/UX:**
- **List:** Cards (student name, certificate title, date). Tap → view certificate (image/PDF) and “Share” / “Download”.
- **Issue new:** Student search → template picker → form for placeholders → “Generate”. Show preview if API returns URL; then “Issue” or “Download”.
- **Templates:** List templates; tap to edit (web or simple form for name and key fields). Use consistent card style; loading for generate.

**Submodules (in-depth):**

- **Certificate Dashboard** — Path: `/certificates/dashboard`. **Purpose:** Overview of issued certificates; list recent; links to issue and templates. **Flow:** `GET /api/certificates/issued?school_code=...` or `GET /api/certificates/simple`. **Tables:** `simple_certificates`, `certificates_issued`. **APIs:** `GET /api/certificates/simple`, `GET /api/certificates/issued`. **Mobile:** Cards (recent issued); “New certificate” button; “Templates” link.

- **New Certificate** — Path: `/certificates/new`. **Purpose:** Issue a certificate: select student, template, fill placeholders → generate and save. **Flow:** Student search → template picker → form (placeholders) → POST generate → preview → Issue/Download. **Tables:** `certificates_issued`, `simple_certificates`. **APIs:** `GET /api/certificates/templates`, `POST /api/certificates/generate`; optional `POST /api/certificates/simple/upload`. **Mobile:** Stepper: Student → Template → Fields → Generate; preview; Share/Download.

---

## 20. Digital Diary (Homework)

**Purpose:** Create diary entries (homework/assignments) for classes/sections; attach files; track read status by students.

**Flow:**
1. User opens Digital Diary; sees list of diary entries (newest first); filter by type/class/academic year.
2. Create entry: title, content, type (homework/notice), target (class-section or all), due date; optional attachments (upload).
3. Students see entries for their class; mark as read (diary_reads). Admin sees read counts.
4. Edit/delete entry; deactivate instead of hard delete if supported.

**Tables:**
- `diaries` — id, school_code, academic_year_id, type, title, content, due_date, is_active, deleted_at, created_at.
- `diary_targets` — diary_id, class_name, section_name (target class-section).
- `diary_attachments` — diary_id, file_name, file_url, file_type.
- `diary_reads` — diary_id, student_id (or user_id) — who read.

**APIs:**
- `GET /api/diary?school_code=...&academic_year_id=...&type=...&page=...&limit=...` — list diaries with targets and attachments; optional read count.
- `GET /api/diary/[id]` — single diary.
- `POST /api/diary` — create (body: school_code, type, title, content, due_date, targets[], attachments).
- `POST /api/diary/upload` — upload attachment.
- `PATCH /api/diary/[id]` — update.
- `DELETE /api/diary/[id]` — delete or soft delete.
- `GET /api/diary/stats?school_code=...` — simple stats (if supported).

**Mobile UI/UX:**
- **List:** Cards (title, type, due date, target classes, read count). Tap → detail (full content + attachments). “Edit” in header for admin.
- **Create:** Form: title, content (multiline), type, target (multi-select class-section), due date, “Add attachment” (file picker). “Publish”. Use chips for targets; show read count as “X/Y read”.
- **Detail:** Full content; list of attachments (tap to open); optional “Mark as read” for student app.

---

## 21. Expense/Income

**Purpose:** Record income and expense entries; categorize; filter by financial year and date range; reports and overview.

**Flow:**
1. User opens Expense/Income; sees dashboard (total income, total expense, balance; monthly breakdown if API supports).
2. Income: add entry (date, amount, category, description, payee); list/filter income entries.
3. Expense: add entry (date, amount, category, description, payee); list/filter expense entries.
4. Financial year: select year; entries filtered by financial_year_id if applicable.
5. Reports: income vs expense; category-wise; export.

**Tables:**
- `income_entries` — school_code, financial_year_id, entry_date, amount, category, description, payee_id or payee_name, is_active.
- `expense_entries` — school_code, financial_year_id, entry_date, amount, category, description, payee_id or payee_name, is_active.
- Optional: `financial_years` — id, name, start_date, end_date; `payees` — for dropdown.

**APIs:**
- `GET /api/finance/overview?school_code=...` — summary (total income, expense, balance; optional monthly).
- `GET /api/finance/income?school_code=...&financial_year_id=...&start_date=...&end_date=...&page=...` — list income.
- `POST /api/finance/income` — create income entry.
- `PATCH /api/finance/income/[id]` — update; `DELETE` if supported.
- `GET /api/finance/expense?school_code=...&...` — list expense.
- `POST /api/finance/expense` — create expense entry.
- `PATCH /api/finance/expense/[id]` — update.
- `GET /api/finance/financial-years?school_code=...` — list financial years.
- `GET /api/dashboard/financial-overview?school_code=...&period=...` — dashboard widget data.

**Mobile UI/UX:**
- **Dashboard:** Cards: Total income, Total expense, Balance (income − expense). Optional simple chart (monthly bars). “Add income” / “Add expense” buttons.
- **Income list:** Date range picker; list of entries (date, amount, category). FAB “Add”. Tap entry → edit (if supported).
- **Expense list:** Same pattern. Use color (e.g. green income, red expense) for quick scan.
- **Add form:** Date, amount (numeric keyboard), category dropdown, description, payee. “Save”. Use rupee formatting.

---

## 22. Front Office Management

**Purpose:** Gate pass (in/out) for students/staff; visitor log (check-in, check-out, purpose, person to meet); optional dashboard stats.

**Flow:**
1. **Gate pass:** Create pass (person_type: student/staff, person_id, person_name, class/section if student, pass_type, reason, date, time_out, expected_return_time, approved_by). List passes; filter by date; optional “Returned” mark.
2. **Visitors:** Register visitor (name, phone, email, purpose, person_to_meet) → check-in; on leave → check-out (mark time). List visitors; filter by status (in/out) and search.
3. Dashboard: today’s passes, today’s visitors (in/out counts).

**Tables:**
- `gate_passes` — school_code, person_type, person_id, person_name, class, section, academic_year, pass_type, reason, date, time_out, expected_return_time, time_in (optional), approved_by_name, created_by.
- `visitors` — school_code, visitor_name, phone_number, email, purpose_of_visit, person_to_meet, check_in_time, check_out_time, status, created_at.

**APIs:**
- `GET /api/gate-pass?school_code=...&search=...` — list gate passes.
- `POST /api/gate-pass` — create gate pass (body: school_code, person_type, person_id, person_name, class, section, academic_year, pass_type, reason, date, time_out, expected_return_time, approved_by_name, created_by).
- `GET /api/gate-pass/[id]` — single; `PATCH` to mark returned (if supported).
- `GET /api/gate-pass/stats?school_code=...` — today’s count (if supported).
- `GET /api/visitors?school_code=...&search=...&status=...&page=...` — list visitors.
- `POST /api/visitors` — register visitor (check-in) (body: school_code, visitor_name, phone_number, purpose_of_visit, person_to_meet, ...).
- `PATCH /api/visitors/[id]/mark-out` — check-out (set check_out_time, status).
- `GET /api/visitors/stats?school_code=...` — stats.
- `GET /api/front-office/dashboard?school_code=...` — combined dashboard.

**Mobile UI/UX:**
- **Tabs:** “Gate pass” | “Visitors”.
- **Gate pass:** “New pass” → form (person type, name, class if student, reason, date, time out, expected return, approved by). List: date filter; cards (name, reason, time out, status). Tap → detail; optional “Mark returned”.
- **Visitors:** “Check in” → form (name, phone, purpose, person to meet) → submit (check_in_time set). List: “In” / “Out” filter; cards (name, purpose, time in, time out). Tap “Check out” on card or detail.
- Use clear “In” / “Out” badges; time formatting consistent (e.g. HH:mm).

**Submodules (in-depth):**

- **Front Office Dashboard** — Path: `/front-office`. **Purpose:** Summary: today’s gate passes, today’s visitors (in/out counts); quick links. **Flow:** `GET /api/front-office/dashboard?school_code=...` or aggregate from gate-pass and visitors stats. **Tables:** `gate_passes`, `visitors`. **APIs:** `GET /api/front-office/dashboard`, `GET /api/gate-pass/stats`, `GET /api/visitors/stats`. **Mobile:** Cards (passes today, visitors in/out); links to Gate pass, Visitor management.

- **Gate pass** — Path: `/gate-pass`. **Purpose:** Create and list gate passes (student/staff out with reason, time out, expected return). **Flow:** “New pass” → form (person_type, person_id/name, class/section if student, reason, date, time_out, expected_return_time, approved_by) → POST; list with date filter; optional “Mark returned”. **Tables:** `gate_passes`. **APIs:** `GET /api/gate-pass?school_code=...`, `POST /api/gate-pass`, `GET /api/gate-pass/[id]`, `PATCH` to mark returned. **Mobile:** List with filter; “New pass” form; tap row → detail; “Mark returned” if supported.

- **Visitor Management** — Path: `/visitor-management`. **Purpose:** Check-in and check-out visitors; list and search. **Flow:** “Check in” → form (name, phone, purpose, person_to_meet) → POST (check_in_time set); list filter “In”/“Out”; “Check out” → PATCH set check_out_time. **Tables:** `visitors`. **APIs:** `GET /api/visitors`, `POST /api/visitors`, `PATCH /api/visitors/[id]/mark-out`. **Mobile:** “Check in” form; list with In/Out filter; “Check out” on card or detail.

---

## 23. Copy Checking

**Purpose:** Record copy-checking status (class work / homework) per student, per subject, per date; view by class/section/subject/date.

**Flow:**
1. User opens Copy Checking; selects class, section, subject, work date, work type (class_work / homework).
2. Backend returns list of students and existing check status (checked/unchecked or marks/remarks).
3. Teacher/Admin marks each student’s copy as checked (and optional grade/remarks); submit.
4. View reports: who is pending, by class/date.

**Tables:**
- `copy_checking` — school_code, class_id, subject_id, work_date, work_type (class_work/homework), student_id, status (checked/unchecked), marks_or_remarks, entered_by, etc.
- `students`, `classes`, `subjects` — for context.

**APIs:**
- `GET /api/copy-checking?school_code=...&class_id=...&section=...&subject_id=...&work_date=...&work_type=...&academic_year=...` — list students with current check status.
- `POST /api/copy-checking` — upsert records (body: school_code, class_id, subject_id, work_date, work_type, entries: [{ student_id, status, remarks }]).

**Mobile UI/UX:**
- **Filters:** Class, Section, Subject, Date, Work type (Class work / Homework). “Load” → list of students with checkbox or “Checked” / “Pending” chip.
- **List:** One row per student (name, roll no, status). Tap to toggle or tap “Mark checked” for multiple. Optional remarks field per student (expand or modal). “Save” at bottom.
- Use compact list; ensure checkboxes/taps are large enough; confirm before submit if many rows.

**Submodules (in-depth):** Copy Checking is a single screen: filters (class, section, subject, date, work type) → list students with check status → submit. Path: `/copy-checking`. No separate submodule paths in the sidebar.

---

## 24. Attendance

**Purpose:** Mark and view staff attendance (present/absent/leave/half-day); optional reports.

**Flow:**
1. User opens Attendance (or Staff Attendance); selects date.
2. List of staff with current status; toggle or select status per staff; save.
3. View report by date range if supported.

**Tables:** `staff_attendance` — staff_id, school_code, attendance_date, status.

**APIs:**
- `GET /api/attendance/staff?school_code=...&date=...` — list staff and status for date.
- `POST /api/attendance/update` or staff-attendance endpoint — submit attendance.

**Mobile UI/UX:** Date picker; list of staff with status chips or toggles; “Save”; confirm if many changes.

**Submodules (in-depth):**

- **Staff Attendance** — Path: `/attendance/staff`. **Purpose:** Mark daily staff attendance. **Flow:** Same as module flow above. **Tables:** `staff_attendance`. **APIs:** `GET /api/attendance/staff`, `POST /api/attendance/update`. **Mobile:** Same as §6 Staff Management → Staff Attendance; can be the same screen or shared component.

---

## Summary Table: Modules → Main Tables & Key APIs

| Module | Main tables | Key GET API |
|--------|-------------|-------------|
| Home | accepted_schools, students, staff, student_attendance, staff_attendance, payments/fees, classes | /api/dashboard/stats |
| Institute Info | accepted_schools, institute_houses, institute_working_days | /api/schools/accepted, /api/institute/houses |
| Gallery | gallery | /api/gallery |
| Admin Role Management | roles, permissions, role_permissions, staff_roles, staff_permissions, modules, sub_modules | /api/rbac/roles, /api/rbac/permissions |
| Password Manager | staff_login, student_login, staff, students | /api/staff/reset-password, /api/students/reset-password |
| Staff Management | staff, staff_login, staff_attendance | /api/staff, /api/attendance/staff |
| Classes | classes, students, staff, subjects | /api/classes, /api/classes/overview |
| Students | students, student_login, student_attendance | /api/students, /api/attendance/student, /api/attendance/mark |
| Timetable | timetable_period_groups, timetable_slots, classes, subjects, staff | /api/timetable/list, /api/timetable/slots |
| Calendar | academic_calendar, events | /api/calendar/academic, /api/calendar/events |
| Examinations | examinations, exam_class_mappings, exam_subject_mappings, exam_schedules | /api/examinations/v2/list, /api/examinations/[id] |
| Marks | student_subject_marks, student_exam_summary, grade_scales | /api/marks/view, /api/marks/class, /api/examinations/marks/submit |
| Fees | fee_heads, fee_structures, payments, receipts | /api/v2/fees/fee-heads, /api/v2/fees/fee-structures, /api/v2/fees/reports/dashboard |
| Library | library_books, library_book_copies, library_sections, library_material_types, library_transactions | /api/library/books, /api/library/transactions |
| Transport | transport_vehicles, transport_stops, transport_routes, transport_route_stops | /api/transport/routes, /api/transport/vehicles, /api/transport/stops |
| Leave Management | leave_types, staff_leave_requests, student_leave_requests | /api/leave/dashboard-summary, /api/leave/types, /api/leave/requests |
| Communication | notices | /api/communication/notices |
| Reports | (varies) | /api/reports/student, /api/reports/staff, … |
| Certificate Management | simple_certificates, certificate_templates, certificates_issued | /api/certificates/simple, /api/certificates/templates |
| Digital Diary | diaries, diary_targets, diary_attachments, diary_reads | /api/diary |
| Expense/Income | income_entries, expense_entries, financial_years | /api/finance/income, /api/finance/expense, /api/finance/overview |
| Front Office | gate_passes, visitors | /api/gate-pass, /api/visitors, /api/front-office/dashboard |
| Copy Checking | copy_checking, students, classes, subjects | /api/copy-checking |

---

Use this document as the single reference for **what each module does**, **which tables and APIs to use**, and **how to design the mobile admin experience** for the School Admin dashboard.
