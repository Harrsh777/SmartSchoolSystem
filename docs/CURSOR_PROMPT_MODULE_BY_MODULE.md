# Cursor Prompt — Module-by-Module (School ERP → Mobile)

Use this document when building the School ERP **mobile app** (or any client) page-by-page or module-by-module. Each section lists **route**, **purpose**, **APIs** (method, path, query/body), **key UI elements**, and **special flows**. Use the **exact same APIs and contracts** as the web app; do not invent new endpoints.

Reference: **PROJECT_ANALYSIS_FULL.md** for auth, roles, middleware, and data flow. **MOBILE_APP_CURSOR_PROMPT.md** for stack, API client, and rules.

---

## 1. Public / Auth (no login required)

### 1.1 Landing — `/`
- **Purpose:** Marketing/landing; links to login, signup, demo.
- **APIs:** None (static or marketing content).
- **UI:** Hero, CTA to `/login`, `/signup`, `/demo`.
- **Flow:** User chooses role entry point (admin, staff, student) or signup/demo.

### 1.2 Login hub — `/login`
- **Purpose:** Entry page with links to each role login.
- **APIs:** None.
- **UI:** Links to `/admin/login`, `/staff/login`, `/student/login`, `/accountant/login`.
- **Flow:** User taps role → navigates to that login screen.

### 1.3 School admin login — `/admin/login`
- **Purpose:** School admin signs in with school code + password.
- **APIs:**
  - `POST /api/auth/login`  
    Body: `{ school_code: string, password: string }`  
    Success: sets session cookies; response may include `school`, `role`. Store school in session; redirect to `/dashboard/{school_code}`.
- **UI:** Form: school_code, password; submit; error message.
- **Flow:** Submit → on success store school + role, redirect to school dashboard home.

### 1.4 Teacher login — `/staff/login`
- **Purpose:** Teacher signs in with school code + staff ID + password.
- **APIs:**
  - `POST /api/auth/teacher/login`  
    Body: `{ school_code: string, staff_id: string, password: string }`  
    Success: sets session; response includes `teacher` object. Store teacher in session; redirect to `/teacher/dashboard`.
- **UI:** Form: school_code, staff_id, password; submit; error message.
- **Flow:** Submit → store teacher (id, school_code, name, etc.), redirect to teacher dashboard.

### 1.5 Student login — `/student/login`
- **Purpose:** Student signs in with school code + admission number + password.
- **APIs:**
  - `POST /api/auth/student/login`  
    Body: `{ school_code: string, admission_no: string, password: string }`  
    Success: sets session; response includes `student` object. Store student in session; redirect to `/student/dashboard`.
- **UI:** Form: school_code, admission_no, password; submit; error message.
- **Flow:** Submit → store student (id, school_code, class, section, etc.), redirect to student dashboard.

### 1.6 Accountant login — `/accountant/login`
- **Purpose:** Accountant signs in with school code + staff ID + password.
- **APIs:**
  - `POST /api/auth/accountant/login`  
    Body: `{ school_code: string, staff_id: string, password: string }`  
    Success: sets session; response includes accountant/school. Store in session; redirect to `/accountant/dashboard`.
- **UI:** Form: school_code, staff_id, password; submit; error message.
- **Flow:** Submit → store accountant + school, redirect to accountant dashboard.

### 1.7 Demo request — `/demo`
- **Purpose:** Request a demo; show booked slots and submit request.
- **APIs:**
  - `GET /api/demo` — returns booked time slots (e.g. list of dates/times). Use to disable already booked slots in UI.
  - `POST /api/demo` — Body: e.g. `{ name, email, phone, preferred_slot, ... }` (match web form). Saves to `demo_requests`.
- **UI:** Form (name, email, phone, preferred date/time); time slot picker that disables booked slots from GET; submit.
- **Flow:** Load booked slots → user picks available slot → submit; show success/error.

### 1.8 Signup — `/signup`
- **Purpose:** School signup (if applicable).
- **APIs:** As per web (e.g. signup API if exists); same body/contract.
- **UI:** Signup form; submit.
- **Flow:** Submit → success/error; optionally redirect to login.

---

## 2. Session & logout (all roles)

- **Session check:** `GET /api/auth/session` — with session cookie/header. Returns `role`, `user`, `school_code` etc. If 401, clear storage and redirect to role login.
- **Logout:** `POST /api/auth/logout` — with session cookie/header. Backend destroys session; client clears sessionStorage/SecureStore and redirects to role login.

---

## 3. Super Admin — `/admin`

- **Route:** Single screen `/admin` (no sub-routes in URL for main UI).
- **Purpose:** Platform admin: manage schools (pending/accepted/rejected), overview, employees, stats, financial, events, students, staff, classes, help, exams, settings, demo requests, analytics, users.
- **Auth:** Page shows **password modal** first (e.g. hardcoded super-admin password). After correct password, show main UI. No session cookie for super admin in web; mobile may use local/SecureStore for “unlocked” state.
- **APIs (use same as web):**
  - Schools: `GET /api/schools?status=pending|accepted|rejected`, `GET /api/schools/accepted`, `PATCH /api/schools/[id]/status`, `PATCH /api/schools/[id]/hold`, `PATCH /api/schools/[id]/credentials`
  - Overview: `GET /api/admin/overview`
  - Employees: `GET /api/admin/employees`
  - Stats: `GET /api/admin/stats`
  - Financial: `GET /api/admin/financial`
  - Events: `GET /api/admin/events`
  - Students: `GET /api/admin/students`
  - Staff: `GET /api/admin/staff`
  - Classes: `GET /api/admin/classes`
  - Help: `GET /api/admin/help-queries`, `POST /api/admin/help-queries` (reply)
  - Exams: `GET /api/admin/exams` (+ examination/marks APIs when operating on a school)
  - Settings: `GET /api/admin/system-settings`, `PATCH /api/admin/system-settings`
  - Demo: `GET /api/admin/demo-requests`
  - Analytics: `GET /api/admin/analytics`
  - Users: `GET /api/admin/users`, `POST /api/admin/users`, `PATCH /api/admin/users`
- **UI:** Tabs or sections for each area; lists and detail views; actions (accept/reject school, reply to help, etc.).
- **Flow:** Unlock with password → select tab → load data via API → perform actions with same API as web.

---

## 4. School Dashboard — `/dashboard/[school]`

**Base path:** `/dashboard/{schoolCode}` (e.g. `/dashboard/SCH001`). User identity: `sessionStorage`/SecureStore `school`, `role` = school admin. All requests that need school context send `school_code={schoolCode}`.

### 4.1 Dashboard home — `/dashboard/[school]` (root)
- **Purpose:** Overview: stats, financial summary, timetable summary, examinations, classes, quick downloads.
- **APIs:**
  - `GET /api/calendar/academic?school_code=`
  - `GET /api/dashboard/stats?school_code=`
  - `GET /api/dashboard/stats-detailed?school_code=`
  - `GET /api/dashboard/financial-overview?school_code=`
  - `GET /api/timetable/list?school_code=`
  - `GET /api/dashboard/administrative?school_code=`
  - `GET /api/examinations?school_code=`
  - `GET /api/classes?school_code=`
  - `GET /api/download/{type}?school_code=` (if used)
- **UI:** Cards/sections for stats, financial, timetable, exams, classes; quick links to sub-modules.
- **Flow:** Load all in parallel or sequentially; display; links navigate to sub-routes.

### 4.2 Institute info — `/dashboard/[school]/institute-info`, `/institute-info/setup`
- **Purpose:** View/edit school institute info.
- **APIs:** `GET /api/schools/accepted`, `GET/PATCH /api/institute/...` (match web routes).
- **UI:** Form or read-only view; edit and save.
- **Flow:** Load school/institute data → display → on edit submit PATCH.

### 4.3 Role management — `/dashboard/[school]/settings/roles` (or `/role-management`)
- **Purpose:** Manage roles (CRUD).
- **APIs:** `GET /api/roles?school_code=`, `POST /api/roles`, `PATCH /api/roles/[id]`, `DELETE` if any.
- **UI:** List of roles; add/edit/delete.
- **Flow:** Load roles → list → create/update/delete via API.

### 4.4 Password manager — `/dashboard/[school]/password`
- **Purpose:** View login credentials; reset staff/student passwords.
- **APIs:**
  - `GET /api/dashboard/login-credentials?school_code=`
  - `POST /api/staff/reset-password` — body: e.g. `{ school_code, staff_id, new_password }` (use API contract from web; staff_id is the display id or UUID as per backend)
  - `POST /api/students/reset-password` or similar for students
- **UI:** List credentials; reset password form (staff_id or admission_no + new password).
- **Flow:** Load credentials → select user → submit reset.

### 4.5 Staff management — `/dashboard/[school]/staff-management`, directory, add, bulk-import, attendance
- **Purpose:** List staff, add, bulk import, manage photos, mark/view attendance.
- **APIs:**
  - `GET /api/staff?school_code=`
  - `POST /api/staff` (add), `POST /api/staff/import` (bulk), `POST /api/staff/photos` (bulk photo)
  - `GET /api/attendance/overview?school_code=`, `GET /api/attendance/class?school_code=`, `POST /api/attendance/update`
  - Staff attendance: `GET /api/attendance/staff?school_code=&staff_id=&start_date=&end_date=`
- **UI:** Staff list, add form, import flow, attendance calendar/grid.
- **Flow:** List → add/import → attendance screens use same APIs as web.

### 4.6 Classes — `/dashboard/[school]/classes`, overview, modify, subject-teachers, subjects
- **Purpose:** Manage classes, sections, subject-teacher assignment.
- **APIs:** `GET /api/classes?school_code=`, `GET /api/classes/[id]/subjects`, PATCH/POST as per web (classes, subject-teachers).
- **UI:** Class list, class detail, subject-teacher matrix.
- **Flow:** Load classes → drill down → edit and save.

### 4.7 Students — `/dashboard/[school]/students`, add, directory, attendance, mark-attendance, bulk-import, siblings, [id], [id]/view, [id]/edit
- **Purpose:** Student CRUD, directory, attendance, mark attendance, bulk import, siblings, view/edit single student.
- **APIs:**
  - `GET /api/students?school_code=`
  - `POST /api/students`, `POST /api/students/import`
  - `GET /api/attendance/...` (student attendance), `POST /api/attendance/update`
  - Student by id: `GET /api/students/[id]?school_code=`, `PATCH /api/students/[id]`
- **UI:** Student list, filters, add/edit form, attendance screen, sibling links.
- **Flow:** List → add/edit/import; attendance uses same update API as web.

### 4.8 Timetable — `/dashboard/[school]/timetable`, class, teacher, group-wise
- **Purpose:** View/edit timetable by class, by teacher, group-wise.
- **APIs:** `GET /api/timetable/slots?school_code=&class_id=|teacher_id=`, `GET /api/timetable/period-groups?school_code=`, `GET /api/staff?school_code=`, POST/PATCH for slots as per web.
- **UI:** TimetableView (grid: days × periods); class/teacher selector; edit slots.
- **Flow:** Select class or teacher → load slots → display grid; save changes via API.

### 4.9 Calendar — `/dashboard/[school]/calendar`, academic, events
- **Purpose:** Academic calendar and events.
- **APIs:** `GET /api/calendar/academic?school_code=`, `GET /api/calendar/events?school_code=`
- **UI:** Calendar view; event list.
- **Flow:** Load and display.

### 4.10 Examinations — `/dashboard/[school]/examinations`, dashboard, create, grade-scale, report-card, reports, marks-entry, marks-approval, [examId]
- **Purpose:** Create exams, grade scales, report card, reports, marks entry, marks approval.
- **APIs:**
  - `GET /api/examinations/v2/list?school_code=`, `POST /api/examinations/v2/create` (body: exam payload)
  - `GET /api/grade-scales?school_code=`
  - `GET /api/examinations/marks?school_code=&exam_id=`, `POST /api/examinations/marks/submit`, `POST /api/examinations/marks/approve`
  - `GET /api/examinations/[examId]?school_code=`
- **UI:** Exam list, create form, grade scale editor, marks grid, approval actions.
- **Flow:** List exams → create/edit → marks entry → approval; use same request/response shapes as web.

### 4.11 Marks — `/dashboard/[school]/marks`, marks-entry, marks/marks-entry
- **Purpose:** View marks, report card, bulk download, export; marks entry flow.
- **APIs:** `GET /api/marks/view?school_code=`, `GET /api/marks/report-card?school_code=`, `GET /api/marks/bulk-download`, `GET /api/marks/export`, `GET /api/classes`, `GET /api/examinations/v2/list`, `GET /api/subjects`; marks entry uses examinations/marks APIs.
- **UI:** Class/exam selector, marks table, report card, download/export buttons.
- **Flow:** Select class/exam → load marks → export/download.

### 4.12 Fees — `/dashboard/[school]/fees`, v2/dashboard, v2/fee-heads, v2/fee-structures, v2/collection, statements, discounts-fines, reports
- **Purpose:** Fee heads, structures, collection, statements, discounts/fines, reports.
- **APIs:** `GET /api/fees/v2/fee-heads?school_code=`, `GET /api/fees/v2/fee-structures?school_code=`, `GET /api/fees/v2/payments`, `POST /api/fees/v2/payments`, `GET /api/fees/receipts`, `GET /api/fees/reports`, `GET /api/fees/students`
- **UI:** Dashboard cards, fee heads list, structures, collection form, statements, reports.
- **Flow:** Same as web; same query/body params.

### 4.13 Library — `/dashboard/[school]/library`, dashboard, basics, catalogue, transactions
- **Purpose:** Library settings, catalogue, issue/return.
- **APIs:** Library APIs under `GET/POST /api/library/...` (settings, sections, material-types, books, transactions).
- **UI:** Dashboard, basics (sections, types), book list, transaction form.
- **Flow:** Match web routes and API paths.

### 4.14 Transport — `/dashboard/[school]/transport`, dashboard, vehicles, stops, routes, route-students
- **Purpose:** Vehicles, stops, routes, assign students to routes.
- **APIs:** `GET/POST /api/transport/vehicles`, `GET/POST /api/transport/stops`, `GET/POST /api/transport/routes`, `GET/POST /api/transport/route-students` (with school_code).
- **UI:** Lists and forms for each entity; route-students assignment.
- **Flow:** Same as web.

### 4.15 Leave — `/dashboard/[school]/leave`, dashboard, student-leave, staff-leave, basics
- **Purpose:** Leave dashboard summary, student leave requests, staff leave requests, leave types/basics.
- **APIs:** `GET /api/leave/dashboard-summary?school_code=`, `GET /api/leave/requests?school_code=`, `GET /api/leave/student-requests?school_code=`, `GET /api/leave/types?school_code=`, PATCH for approve/reject.
- **UI:** Summary cards, tabs for staff/student leave; list and approve/reject actions.
- **Flow:** Load summary and lists → approve/reject via API.

### 4.16 Communication — `/dashboard/[school]/communication`
- **Purpose:** Notices/bulletins.
- **APIs:** `GET /api/communication/notices?school_code=&limit=`
- **UI:** List of notices; optional filters (category, priority).
- **Flow:** Load notices → display.

### 4.17 Reports — `/dashboard/[school]/reports`
- **Purpose:** Various reports.
- **APIs:** `GET /api/reports/...` (match web report endpoints).
- **UI:** Report type selector, params, result table/export.
- **Flow:** Select report → pass params → display.

### 4.18 Gallery — `/dashboard/[school]/gallery`
- **Purpose:** Gallery management.
- **APIs:** `GET /api/gallery?school_code=`, POST if upload exists.
- **UI:** Grid of images/albums.
- **Flow:** Load and display.

### 4.19 Certificates — `/dashboard/[school]/certificates`, dashboard, new, classwise, manage, templates
- **Purpose:** Certificate templates, generate by class/student, manage.
- **APIs:** Certificate APIs under `/api/certificates/...`
- **UI:** Template list, create, classwise generation, manage.
- **Flow:** Same as web.

### 4.20 Digital diary / Homework — `/dashboard/[school]/homework`
- **Purpose:** Homework/diary management.
- **APIs:** `GET /api/diary?school_code=`, `POST /api/diary/upload`, `GET /api/classes`, `GET /api/classes/academic-years`
- **UI:** List, upload, class/year filters.
- **Flow:** Load diary entries → upload new.

### 4.21 Expense/Income — `/dashboard/[school]/expense-income`, expenses, income, payee
- **Purpose:** Expense and income entries, payee.
- **APIs:** `GET/POST /api/finance/...`, `GET/POST /api/expense-income/...` (match web).
- **UI:** Forms and lists.
- **Flow:** Same as web.

### 4.22 Front office — `/dashboard/[school]/front-office`, gate-pass, visitor-management
- **Purpose:** Gate pass, visitors.
- **APIs:** `GET /api/front-office/dashboard`, `GET/POST /api/gate-pass`, `GET/POST /api/visitors`
- **UI:** Dashboard, gate pass form, visitor list/form.
- **Flow:** Same as web.

### 4.23 Copy checking — `/dashboard/[school]/copy-checking`
- **Purpose:** Copy checking assignments (class → subjects → staff).
- **APIs:** `GET /api/copy-checking?school_code=`, `GET /api/classes`, `GET /api/classes/[id]/subjects`, `GET /api/staff?school_code=`, PATCH/POST for assignments.
- **UI:** Same logic as web CopyCheckingPage; school from route.
- **Flow:** Load classes, subjects, staff → assign → save.

### 4.24 Attendance — `/dashboard/[school]/attendance`, staff
- **Purpose:** Overview and staff attendance.
- **APIs:** `GET /api/attendance/overview?school_code=`, `GET /api/attendance/staff?school_code=`
- **UI:** Overview cards, staff attendance list/calendar.
- **Flow:** Load and display.

### 4.25 Staff access control — `/dashboard/[school]/staff-access-control`, [staffId]
- **Purpose:** RBAC: staff permissions, roles.
- **APIs:** `GET /api/rbac/staff-permissions?school_code=`, `GET /api/roles`, `GET /api/permissions`, PATCH for staff permissions.
- **UI:** Staff list, per-staff permission matrix.
- **Flow:** Load staff and permissions → edit → save.

---

## 5. Teacher Dashboard — `/teacher/*`

**Base path:** `/teacher/dashboard`. User: `sessionStorage`/SecureStore `teacher`; `school_code` from teacher object. Send `school_code` and `teacher_id` (staff id) where required.

### 5.1 Teacher dashboard home — `/teacher/dashboard`
- **Purpose:** Overview: assigned class, daily agenda, attendance summary, exams, notices, notifications, My Tasks (todos).
- **APIs:**
  - `GET /api/students?school_code=`
  - `GET /api/classes/teacher?school_code=&staff_id=`
  - `GET /api/teacher/grade-distribution?school_code=&teacher_id=`
  - `GET /api/teacher/todos?school_code=&teacher_id=&status=pending,in_progress`
  - `POST /api/teacher/todos` — body: `{ school_code, teacher_id, title, ... }`
  - `PATCH /api/teacher/todos/[id]` — body: e.g. `{ status: 'completed' }` or task fields
  - `DELETE /api/teacher/todos/[id]`
  - `GET /api/timetable/daily-agenda?school_code=&teacher_id=`
  - `GET /api/attendance/staff?school_code=&staff_id=&start_date=&end_date=`
  - `GET /api/examinations/v2/teacher?school_code=&teacher_id=`
  - `GET /api/communication/notices?school_code=&status=Active&category=all&priority=all&limit=5`
  - `GET /api/calendar/notifications?school_code=&user_type=teacher&user_id=&unread_only=true`
  - `GET /api/staff-subjects/[teacherId]?school_code=`
  - `GET /api/leave/student-requests?school_code=&status=pending`
- **UI:** Welcome, assigned class card, daily agenda, attendance summary, upcoming exams, notices, notifications, My Tasks list with add/complete/delete.
- **Flow:** Load all widgets; todos: add → POST, complete → PATCH, delete → DELETE.

### 5.2 Mark attendance — `/teacher/dashboard/attendance`
- **Purpose:** Mark student attendance by class.
- **APIs:** `GET /api/attendance/class?school_code=&class_id=`, `GET /api/classes?school_code=`, `POST /api/attendance/update`
- **UI:** Class selector, date, student list with present/absent; submit.
- **Flow:** Select class and date → load students and existing attendance → update and submit.

### 5.3 My attendance — `/teacher/dashboard/attendance-staff`
- **Purpose:** View own attendance.
- **APIs:** `GET /api/attendance/staff?school_code=&staff_id=&start_date=&end_date=` (or staff-monthly if different).
- **UI:** Calendar or list of attendance.
- **Flow:** Load for month/range → display.

### 5.4 Marks entry — `/teacher/dashboard/marks`
- **Purpose:** Enter marks (exam, class, subject).
- **APIs:** `GET /api/examinations/v2/teacher?school_code=&teacher_id=`, `GET /api/classes/teacher?school_code=&staff_id=`, `GET /api/students?school_code=`, `GET /api/examinations/marks?school_code=&exam_id=`, `GET /api/examinations/marks/status`, POST for submit.
- **UI:** Exam/class/subject selector, marks grid; submit.
- **Flow:** Select exam/class → load students and existing marks → edit → submit.

### 5.5 Examinations (v2) — `/teacher/dashboard/examinations`
- **Purpose:** View all exams (date-wise) for the school.
- **APIs:** `GET /api/examinations/v2/teacher?school_code=&teacher_id=` — returns all non-draft exams; group by date on client.
- **UI:** List grouped by date; each exam card with name, date, subjects/classes.
- **Flow:** Load → group by date → display.

### 5.6 Marks entry (v2) — `/teacher/dashboard/examinations/v2/marks-entry`
- **Purpose:** Full marks entry flow (exam, class, subject, students).
- **APIs:** Same as 5.4; `GET /api/examinations/v2/teacher`, classes, students, marks, `POST /api/examinations/marks/submit`.
- **UI:** Step or single screen: exam → class → subject → marks grid.
- **Flow:** Same as web.

### 5.7 My class — `/teacher/dashboard/my-class`
- **Purpose:** View assigned class and class timetable.
- **APIs:** `GET /api/classes/teacher?school_code=&staff_id=`, `GET /api/students?school_code=` (filter by class), timetable: `GET /api/timetable/slots?school_code=&class_id=` (or teacher_id for teacher timetable).
- **UI:** Class info, TimetableView (grid), optional student list.
- **Flow:** Load class and timetable → display grid.

### 5.8 Classes — `/teacher/dashboard/classes`
- **Purpose:** List classes assigned to teacher.
- **APIs:** `GET /api/classes/teacher?school_code=&staff_id=`
- **UI:** List of classes.
- **Flow:** Load and display.

### 5.9 Apply leave — `/teacher/dashboard/apply-leave`
- **Purpose:** Submit leave request.
- **APIs:** `GET /api/leave/types?school_code=`, `POST /api/leave/requests` — body: e.g. `{ school_code, staff_id, leave_type_id, start_date, end_date, reason }`
- **UI:** Leave type picker, date range, reason; submit.
- **Flow:** Load types → form → submit.

### 5.10 My leaves — `/teacher/dashboard/my-leaves`
- **Purpose:** View own leave requests and remaining leave balance.
- **APIs:** `GET /api/leave/types?school_code=`, `GET /api/leave/requests?school_code=&staff_id=`, `PATCH /api/leave/requests/[id]/withdraw` (if supported). Compute remaining from types and approved requests.
- **UI:** List of requests (status); remaining days per type.
- **Flow:** Load types and requests → compute remaining → display; withdraw if allowed.

### 5.11 Student leave approvals — `/teacher/dashboard/student-leave-approvals`
- **Purpose:** Class teacher approve/reject student leave.
- **APIs:** `GET /api/leave/student-requests/class-teacher?school_code=&staff_id=`, `PATCH /api/leave/student-requests/[id]/class-teacher-approval` — body: e.g. `{ status: 'approved'|'rejected' }`
- **UI:** List of pending student leave requests; approve/reject buttons.
- **Flow:** Load pending → approve/reject per request.

### 5.12 Institute info — `/teacher/dashboard/institute-info`
- **Purpose:** Read-only school info.
- **APIs:** `GET /api/schools/accepted` or institute endpoint.
- **UI:** Display school name, address, etc.
- **Flow:** Load and display.

### 5.13 Students — `/teacher/dashboard/students`
- **Purpose:** View all students (with optional fees/transport).
- **APIs:** `GET /api/students?school_code=`
- **UI:** Searchable list; optional filters; row detail.
- **Flow:** Load list → search/filter → tap for detail if needed.

### 5.14 Library — `/teacher/dashboard/library`
- **Purpose:** Read-only library view.
- **APIs:** `GET /api/library/...` (as per web).
- **UI:** Book list or catalogue view.
- **Flow:** Load and display.

### 5.15 Certificates — `/teacher/dashboard/certificates`
- **Purpose:** View/upload certificates (if permitted).
- **APIs:** `GET /api/certificates/simple?school_code=`, `GET /api/classes/teacher`, `GET /api/students`, `POST /api/certificates/simple/upload`
- **UI:** List, upload form.
- **Flow:** Same as web.

### 5.16 Gallery — `/teacher/dashboard/gallery`
- **Purpose:** View gallery.
- **APIs:** `GET /api/gallery?school_code=`
- **UI:** Grid of images.
- **Flow:** Load and display.

### 5.17 Calendar — `/teacher/dashboard/calendar`
- **Purpose:** Academic calendar and events.
- **APIs:** `GET /api/calendar/academic?school_code=`, `GET /api/calendar/events?school_code=`
- **UI:** Calendar view.
- **Flow:** Load and display.

### 5.18 Digital diary / Homework — `/teacher/dashboard/homework`
- **Purpose:** View/upload homework/diary.
- **APIs:** `GET /api/diary?school_code=`, `GET /api/diary/stats`, `GET /api/classes`, `GET /api/classes/academic-years`, `POST /api/diary/upload`
- **UI:** List, filters, upload.
- **Flow:** Same as web.

### 5.19 Copy checking — `/teacher/dashboard/copy-checking`
- **Purpose:** Same as school dashboard copy-checking; school_code from teacher context.
- **APIs:** Same as 4.23; pass `school_code` from teacher.
- **UI:** Same CopyCheckingPage logic with schoolCodeOverride from teacher.
- **Flow:** Same as web.

### 5.20 Grade scale — `/teacher/dashboard/examinations/grade-scale`
- **Purpose:** View grade scales.
- **APIs:** `GET /api/grade-scales?school_code=`
- **UI:** List of grade scales.
- **Flow:** Load and display.

### 5.21 Settings — `/teacher/dashboard/settings`
- **Purpose:** Local/app settings.
- **APIs:** None or minimal.
- **UI:** Settings toggles/options.
- **Flow:** Local state.

### 5.22 Change password — `/teacher/dashboard/change-password`
- **Purpose:** Change own password.
- **APIs:** `POST /api/staff/change-password` — body: e.g. `{ school_code, staff_id, current_password, new_password }`
- **UI:** Current password, new password, confirm; submit.
- **Flow:** Submit → success/error.

### 5.23 Staff directory — `/teacher/dashboard/staff-management/directory`
- **Purpose:** View staff list.
- **APIs:** `GET /api/staff?school_code=`
- **UI:** List of staff.
- **Flow:** Load and display.

### 5.24 Communication — `/teacher/dashboard/communication`
- **Purpose:** Notices.
- **APIs:** `GET /api/communication/notices?school_code=&status=Active&category=all&priority=all&limit=`
- **UI:** List of notices.
- **Flow:** Load and display.

---

## 6. Student Dashboard — `/student/*`

**Base path:** `/student/dashboard`. User: `sessionStorage`/SecureStore `student`; `school_code` and `student_id` from student object.

### 6.1 Student dashboard home — `/student/dashboard`
- **Purpose:** Stats, upcoming items, weekly completion, class teacher, attendance (e.g. last 7 days), recent communication, upcoming exams count.
- **APIs:**
  - `GET /api/student/stats?school_code=&student_id=`
  - `GET /api/student/upcoming-items?school_code=&student_id=&limit=3`
  - `GET /api/student/weekly-completion?school_code=&student_id=`
  - `GET /api/student/class-teacher?school_code=&class=&section=&academic_year=`
  - `GET /api/student/attendance?school_code=&student_id=&start_date=&end_date=`
  - `GET /api/communication/notices?school_code=&limit=5`
  - `GET /api/examinations?school_code=&status=upcoming` (for count)
- **UI:** Cards for stats (attendance %, academic index), class teacher, My Attendance (e.g. last 7 days), Recent Communication, upcoming exams.
- **Flow:** Load all → display.

### 6.2 My class — `/student/dashboard/class`
- **Purpose:** Class info, classmates, class timetable.
- **APIs:** `GET /api/student/class-teacher?school_code=&class=&section=&academic_year=`, `GET /api/student/classmates?school_code=&class=&section=` (if exists), `GET /api/timetable/slots?school_code=&class_id=` for timetable.
- **UI:** Class teacher, classmates list, TimetableView.
- **Flow:** Load class teacher and timetable → display.

### 6.3 Attendance — `/student/dashboard/attendance`
- **Purpose:** View own attendance.
- **APIs:** `GET /api/student/attendance?school_code=&student_id=&start_date=&end_date=` or `GET /api/attendance/student?school_code=&student_id=`
- **UI:** Calendar or list by date range.
- **Flow:** Load for selected range → display.

### 6.4 Examinations — `/student/dashboard/examinations`
- **Purpose:** View exams with subject-wise dates; download date sheet.
- **APIs:** `GET /api/examinations/v2/student?school_code=&student_id=` — returns schedules with subject, date; download: same API or dedicated download endpoint.
- **UI:** List of exams; per exam: subject-wise dates, “Download date sheet” button.
- **Flow:** Load schedules → display; download triggers file download.

### 6.5 Marks — `/student/dashboard/marks`
- **Purpose:** View own marks by exam.
- **APIs:** `GET /api/student/marks?school_code=&student_id=` (or `/api/marks?school_code=&student_id=`), `GET /api/examinations/v2/student` for exam names. Use same response shape as web (exam IDs normalized; fallback labels).
- **UI:** Exam selector or list; marks table (subject, marks/grade).
- **Flow:** Load exams and marks → display.

### 6.6 Copy checking — `/student/dashboard/copy-checking`
- **Purpose:** If student has copy-checking view; otherwise optional.
- **APIs:** As per web if any.
- **UI:** Same contract as web.
- **Flow:** Same as web.

### 6.7 Academic calendar — `/student/dashboard/calendar/academic`
- **Purpose:** View academic calendar.
- **APIs:** `GET /api/calendar/academic?school_code=`
- **UI:** Calendar view.
- **Flow:** Load and display.

### 6.8 Digital diary — `/student/dashboard/diary`
- **Purpose:** View homework/diary for class.
- **APIs:** `GET /api/diary?school_code=&class_id=` (or filter by class on client).
- **UI:** List of diary entries.
- **Flow:** Load and display.

### 6.9 Library — `/student/dashboard/library`
- **Purpose:** View library (issued books, catalogue if allowed).
- **APIs:** `GET /api/library/...` (student-scoped if any).
- **UI:** My books, catalogue.
- **Flow:** Load and display.

### 6.10 Fees — `/student/dashboard/fees`, `/student/dashboard/fees/v2`
- **Purpose:** View fee summary, pay, receipts.
- **APIs:** `GET /api/student/fees?school_code=&student_id=`, `GET /api/student/fees/receipts` or `GET /api/fees/receipts?student_id=`, `GET /api/fees/receipts/[id]/download`
- **UI:** Fee summary, list of receipts, download receipt.
- **Flow:** Load fees and receipts → display; download receipt.

### 6.11 Transport — `/student/dashboard/transport`
- **Purpose:** View assigned route/transport.
- **APIs:** `GET /api/student/transport?school_code=&student_id=` or transport API with student filter.
- **UI:** Route, stop, vehicle info.
- **Flow:** Load and display.

### 6.12 Apply leave — `/student/dashboard/apply-leave`
- **Purpose:** Submit student leave request.
- **APIs:** `GET /api/leave/types?school_code=`, `POST /api/leave/student-requests` — body: e.g. `{ school_code, student_id, leave_type_id, start_date, end_date, reason }`
- **UI:** Leave type, date range, reason; submit.
- **Flow:** Load types → form → submit.

### 6.13 My leaves — `/student/dashboard/my-leaves`
- **Purpose:** View own leave requests.
- **APIs:** `GET /api/leave/student-requests?school_code=&student_id=`
- **UI:** List of requests with status.
- **Flow:** Load and display.

### 6.14 Certificates — `/student/dashboard/certificates`
- **Purpose:** View issued certificates.
- **APIs:** `GET /api/certificates?school_code=&student_id=` or list for student.
- **UI:** List of certificates; download if supported.
- **Flow:** Load and display.

### 6.15 Communication — `/student/dashboard/communication`
- **Purpose:** Notices.
- **APIs:** `GET /api/communication/notices?school_code=&limit=`
- **UI:** List of notices.
- **Flow:** Load and display.

### 6.16 Parent info — `/student/dashboard/parent`
- **Purpose:** View parent/guardian details.
- **APIs:** From student object or `GET /api/student/parent?school_code=&student_id=`
- **UI:** Parent name, contact.
- **Flow:** Load and display.

### 6.17 Gallery — `/student/dashboard/gallery`
- **Purpose:** View gallery.
- **APIs:** `GET /api/gallery?school_code=`
- **UI:** Grid of images.
- **Flow:** Load and display.

### 6.18 Settings — `/student/dashboard/settings`
- **Purpose:** Local/app settings.
- **APIs:** None.
- **UI:** Settings toggles.
- **Flow:** Local state.

### 6.19 Change password — `/student/dashboard/change-password`
- **Purpose:** Change own password.
- **APIs:** `POST /api/students/change-password` — body: e.g. `{ school_code, student_id, current_password, new_password }` (match web).
- **UI:** Current password, new password, confirm; submit.
- **Flow:** Submit → success/error.

---

## 7. Accountant Dashboard — `/accountant/*`

- **Route:** `/accountant/dashboard` (single main screen in web).
- **Purpose:** Fee collection, student list, stats, add fee/payment.
- **APIs:** `GET /api/accountant/stats?school_code=`, `GET /api/fees/students?school_code=`, fee collection: `GET /api/fees/v2/...`, `POST /api/fees/v2/payments` (same as school fees module).
- **UI:** Stats cards, student list with filters, add fee/payment modal, receipts.
- **Flow:** Load stats and students → collect fee (same API as school dashboard fees) → display receipts.

---

## 8. Shared behaviors (all roles)

- **Session timeout:** 20 minutes fixed; only when ≤2 minutes remain does user activity extend by 2 minutes. Implement same logic in mobile (timer in app; on expiry call logout API and clear token).
- **401 handling:** On any API 401, clear session token and redirect to role login. Use single API client that attaches token and handles 401 once.
- **TimetableView:** Replicate as a grid (days × periods); data from `GET /api/timetable/slots?school_code=&class_id=|teacher_id=`.
- **CopyCheckingPage:** Shared logic; school_code from route (dashboard) or from teacher (teacher dashboard). Same API set.

Use this module-by-module prompt together with **PROJECT_ANALYSIS_FULL.md** and **MOBILE_APP_CURSOR_PROMPT.md** to implement each screen with the correct route, API, and flow.
