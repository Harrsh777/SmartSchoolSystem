# School ERP — Full Project Analysis

This document describes how the project is structured, how every section is connected, and the flow of auth, routes, and data. Use it to understand the system and to replicate it (e.g. in a mobile app).

---

## 1. Auth & Routing Overview

### 1.1 Roles

| Role | Login path | Auth cookie value | After login |
|------|------------|-------------------|-------------|
| **Super Admin** | `/admin` (password modal on page) | None (client-side only) | Stays on `/admin` |
| **School Admin** | `/admin/login` | `school:SCH001` | Redirect to `/dashboard/{school_code}` |
| **Teacher (Staff)** | `/staff/login` | `teacher` | Redirect to `/teacher/dashboard` |
| **Student** | `/student/login` | `student` | Redirect to `/student/dashboard` |
| **Accountant** | `/accountant/login` | `accountant` | Redirect to `/accountant/dashboard` |

### 1.2 Middleware (`middleware.ts`)

- **Public (no auth):** `/login`, `/staff/login`, `/student/login`, `/admin/login`, `/accountant/login`, `/signup`, `/demo`, `/auth`. All `/api/*` and `/_next/*` pass through.
- **`/dashboard/:school/*`:** Requires cookie with `role === 'school'`. Else redirect to `/login`.
- **`/teacher/*`:** Requires `role === 'teacher'`. Else redirect to `/staff/login`.
- **`/student/*`:** `/student` and `/student/login` are public; other `/student/*` require `role === 'student'`. Else redirect to `/student/login`.
- **`/admin/*`:** All allowed. `/admin` = super admin (password modal); `/admin/login` = school admin login.
- **`/accountant/*`:** `/accountant/login` public; rest require `role === 'accountant'`. Else redirect to `/accountant/login`.

### 1.3 Session & client state

- **Cookies:** `auth_session` (role + optional school_code), `session_id` (server-side session token). Both HttpOnly.
- **Server sessions:** Stored in `public.sessions` (Supabase). Login APIs create a row and set `session_id` cookie.
- **Client:** Pages also read `sessionStorage` for `teacher`, `student`, `school`, `accountant`, `role` (for quick access to user object). Source of truth for protected APIs is server session/cookie.
- **Session timeout:** 20 minutes. `useSessionTimeout` + `SessionTimeoutModal` in dashboard/teacher/student layouts. Activity (click, keydown, scroll, mousemove) resets timer. On expiry or 401 from same-origin API, logout and redirect to login.

---

## 2. Public Routes

| Path | Purpose | API / flow |
|------|---------|------------|
| `/` | Landing | Static/marketing. |
| `/login` | Entry to school login | Links to `/admin/login`, `/staff/login`, `/student/login`. |
| `/demo` | Request a demo | GET/POST `/api/demo` — fetches booked slots, submits to `demo_requests`. |
| `/signup` | School signup | Form; typically calls signup API. |
| `/auth` | Auth hub | Redirects/links. |
| `/admin/login` | **School admin** login | POST `/api/auth/login` (school_code, password). On success: set session, store school in sessionStorage, redirect to `/dashboard/{school_code}`. |
| `/staff/login` | **Teacher** login | POST `/api/auth/teacher/login` (school_code, staff_id, password). On success: set session, store teacher in sessionStorage, redirect to `/teacher/dashboard`. |
| `/student/login` | **Student** login | POST `/api/auth/student/login` (school_code, admission_no, password). On success: set session, store student in sessionStorage, redirect to `/student/dashboard`. |
| `/accountant/login` | **Accountant** login | POST `/api/auth/accountant/login` (school_code, staff_id, password). On success: set session, store accountant + school in sessionStorage, redirect to `/accountant/dashboard`. |

---

## 3. Super Admin — `/admin`

- **Single page:** `app/admin/page.tsx`. No route protection in middleware; page shows **password modal** (hardcoded password e.g. `educorerp@123`). After correct password, main super-admin UI is shown.
- **Tabs/sections:** Schools (pending / accepted / rejected), overview, employees, stats, financial, events, students, staff, classes, help queries, exams, system settings, demo requests, analytics, users. Actions: accept/reject/hold school, edit credentials, reply to help, etc.
- **APIs used (examples):**  
  `GET/PATCH /api/schools?status=pending|accepted|rejected`,  
  `GET /api/schools/accepted`,  
  `GET /api/admin/overview`,  
  `GET /api/admin/employees`,  
  `GET /api/admin/stats`,  
  `GET /api/admin/financial`,  
  `GET /api/admin/events`,  
  `GET /api/admin/students`,  
  `GET /api/admin/staff`,  
  `GET /api/admin/classes`,  
  `GET/POST /api/admin/help-queries`,  
  `GET /api/admin/exams`,  
  `GET /api/admin/system-settings`,  
  `GET /api/admin/demo-requests`,  
  `PATCH /api/admin/system-settings`,  
  `GET /api/admin/analytics`,  
  `GET/POST/PATCH /api/admin/users`,  
  `PATCH /api/schools/[id]/status`,  
  `PATCH /api/schools/[id]/hold`,  
  `PATCH /api/schools/[id]/credentials`,  
  and examination/marks APIs for the “Examinations” tab (e.g. classes, exams, students, marks bulk/submit).
- **Flow:** Open `/admin` → enter password in modal → use tabs to manage schools, employees, analytics, etc. No school_code in URL; school is selected per tab where needed.

---

## 4. School Dashboard — `/dashboard/[school]`

- **Layout:** `app/dashboard/[school]/layout.tsx` wraps children with `DashboardLayout`, session timeout, and translation. Reads `school` from `params`, loads school name from sessionStorage or `GET /api/schools/accepted`.
- **Base path:** `/dashboard/{schoolCode}` (e.g. `/dashboard/SCH001`). All child routes are under this. User identity: `sessionStorage.getItem('school')`, `role` = admin.
- **Home:** `app/dashboard/[school]/page.tsx` — dashboard home. APIs: `/api/calendar/academic`, `/api/dashboard/stats`, `/api/dashboard/stats-detailed`, `/api/dashboard/financial-overview`, `/api/timetable/list`, `/api/dashboard/administrative`, `/api/examinations`, `/api/classes`, `/api/download/{type}`.
- **Menu (sidebar):** Driven by `menuItems` and `searchableMenuItems` in `DashboardLayout.tsx`. Permissions (e.g. `manage_students`, `view_exams`) filter visible items. Some items open modals (Classes, Timetable, Students, Calendar, Library, Transport, Leave); others navigate to sub-routes.

### 4.1 School dashboard — module → route → API (summary)

| Module | Route (under `/dashboard/[school]`) | Example APIs |
|--------|-------------------------------------|--------------|
| Home | `` | stats, financial-overview, timetable/list, examinations, classes, download |
| Institute Info | `/institute-info`, `/institute-info/setup` | schools, institute |
| Role Management | `/settings/roles` | roles CRUD |
| Password Manager | `/password` | dashboard/login-credentials, staff/reset-password, students/reset-password |
| Staff Management | `/staff-management`, `/staff-management/directory`, `/add`, `/bulk-import`, `/bulk-photo`, `/attendance`, `/student-attendance-report` | staff, staff/import, staff/photos, attendance |
| Classes | `/classes`, `/classes/overview`, `/classes/modify`, `/classes/subject-teachers`, `/classes/subjects` | classes, classes/[id]/subjects |
| Student Management | `/students`, `/students/add`, `/students/directory`, `/students/attendance`, `/students/mark-attendance`, `/students/bulk-import`, `/students/siblings`, `/students/[id]`, `/students/[id]/view`, `/students/[id]/edit` | students, students/import, attendance |
| Timetable | `/timetable`, `/timetable/class`, `/timetable/teacher`, `/timetable/group-wise` | timetable/slots, timetable/period-groups, staff |
| Calendar | `/calendar`, `/calendar/academic`, `/calendar/events` | calendar/academic, calendar/events |
| Examinations | `/examinations`, `/examinations/dashboard`, `/examinations/create`, `/examinations/grade-scale`, `/examinations/report-card`, `/examinations/reports`, `/examinations/marks-entry`, `/examinations/marks-approval`, `/examinations/[examId]` | examinations/v2/list, examinations/v2/create, grade-scales, examinations/marks, examinations/marks/approve, examinations/[examId] |
| Marks | `/marks`, `/marks-entry`, `/marks/marks-entry` | marks/view, marks/report-card, marks/bulk-download, marks/export, classes, examinations/v2/list, subjects |
| Fees | `/fees`, `/fees/v2/dashboard`, `/fees/v2/fee-heads`, `/fees/v2/fee-structures`, `/fees/v2/collection`, `/fees/statements`, `/fees/discounts-fines`, `/fees/reports` | v2/fees/* (fee-heads, fee-structures, payments, receipts, reports), fees/students, fees/receipts |
| Library | `/library`, `/library/dashboard`, `/library/basics`, `/library/catalogue`, `/library/transactions` | library/* (settings, sections, material-types, books, transactions) |
| Transport | `/transport`, `/transport/dashboard`, `/transport/vehicles`, `/transport/stops`, `/transport/routes`, `/transport/route-students` | transport/* (vehicles, stops, routes, route-students) |
| Leave | `/leave`, `/leave/dashboard`, `/leave/student-leave`, `/leave/staff-leave`, `/leave/basics` | leave/dashboard-summary, leave/requests, leave/student-requests, leave/types |
| Communication | `/communication` | communication/notices |
| Report | `/reports` | reports/* |
| Gallery | `/gallery` | gallery |
| Certificate Management | `/certificates`, `/certificates/dashboard`, `/certificates/new`, `/certificates/classwise`, `/certificates/manage`, `/certificates/templates` | certificates/* |
| Digital Diary | `/homework` | diary, diary/upload, classes, classes/academic-years |
| Expense/Income | `/expense-income`, `/expense-income/expenses`, `/expense-income/income`, `/expense-income/payee` | finance/*, expense-income/* |
| Front Office | `/front-office`, `/gate-pass`, `/visitor-management` | front-office/dashboard, gate-pass, visitors |
| Copy Checking | `/copy-checking` | copy-checking, classes, classes/[id]/subjects, staff |
| Attendance | `/attendance`, `/attendance/staff` | attendance/overview, attendance/class, attendance/update |
| Staff Access Control | `/staff-access-control`, `/staff-access-control/[staffId]` | rbac/staff-permissions, roles, permissions |

---

## 5. Teacher Dashboard — `/teacher/*`

- **Layout:** `app/teacher/layout.tsx`. Reads teacher from sessionStorage; shows sidebar with `teacherBaseItems` (and optional `dashboardMenuItems` by permission). Session timeout and API interceptor for 401/logout.
- **Base path:** `/teacher/dashboard`. User: `sessionStorage.getItem('teacher')`, `school_code` from teacher object.

### 5.1 Teacher routes and APIs (summary)

| Page | Route | Example APIs |
|------|--------|---------------|
| Home | `/teacher/dashboard` | (stats, quick links; some widgets call communication, leave, etc.) |
| Mark Attendance | `/teacher/dashboard/attendance` | attendance/class, attendance/update, classes |
| My Attendance | `/teacher/dashboard/attendance-staff` | attendance/staff-monthly |
| Marks Entry | `/teacher/dashboard/marks` | examinations/v2/teacher, classes/teacher, students, examinations/marks, examinations/marks/status |
| Examinations (v2) | `/teacher/dashboard/examinations` | examinations/v2/teacher (all exams date-wise) |
| Marks entry (v2) | `/teacher/dashboard/examinations/v2/marks-entry` | examinations/v2/teacher, classes/teacher, classes, students, examinations/marks, examinations/marks/submit |
| My Class | `/teacher/dashboard/my-class` | classes/teacher, students; TimetableView for class timetable |
| Classes | `/teacher/dashboard/classes` | classes/teacher |
| Apply Leave | `/teacher/dashboard/apply-leave` | leave/types, leave/requests (POST) |
| My Leaves | `/teacher/dashboard/my-leaves` | leave/types, leave/requests?staff_id=, leave/requests/[id]/withdraw; remaining leaves computed |
| Student Leave Approvals | `/teacher/dashboard/student-leave-approvals` | leave/student-requests/class-teacher, leave/student-requests/[id]/class-teacher-approval |
| Institute Info | `/teacher/dashboard/institute-info` | schools/accepted |
| Student Management | `/teacher/dashboard/students` | students; optional student fees, transport |
| Library | `/teacher/dashboard/library` | (read-only view; may use library APIs) |
| Certificates | `/teacher/dashboard/certificates` | certificates/simple, classes/teacher, students, certificates/simple/upload |
| Gallery | `/teacher/dashboard/gallery` | gallery |
| Calendar | `/teacher/dashboard/calendar` | calendar/academic or events |
| Digital Diary | `/teacher/dashboard/homework` | diary, diary/stats, classes, classes/academic-years, diary/upload |
| Copy Checking | `/teacher/dashboard/copy-checking` | Uses shared CopyCheckingPage with schoolCode from teacher |
| Grade Scale | `/teacher/dashboard/examinations/grade-scale` | grade-scales |
| Settings | `/teacher/dashboard/settings` | (local/settings) |
| Change Password | `/teacher/dashboard/change-password` | staff/change-password |
| Staff Directory | `/teacher/dashboard/staff-management/directory` | staff or staff list |
| Communication | `/teacher/dashboard/communication` | communication/notices |
| My Tasks | (on dashboard home) | teacher/todos (GET/POST/PATCH/DELETE) |

---

## 6. Student Dashboard — `/student/*`

- **Layout:** `app/student/layout.tsx`. Reads student from sessionStorage; sidebar with modules (Academics, Fees & Transport, Requests, Communication, Media & Activities, Account). Session timeout and API interceptor.

### 6.1 Student routes and APIs (summary)

| Page | Route | Example APIs |
|------|--------|---------------|
| Home | `/student/dashboard` | student/stats, student/upcoming-items, student/weekly-completion, student/class-teacher, student/attendance, communication/notices, examinations (count) |
| My Class | `/student/dashboard/class` | student/class-teacher, student/classmates; TimetableView |
| Attendance | `/student/dashboard/attendance` | attendance/student or student/attendance |
| Examinations | `/student/dashboard/examinations` | examinations/v2/student; subject-wise dates; download date sheet |
| Marks | `/student/dashboard/marks` | student/marks or marks; examinations/v2/student for exam names |
| Copy Checking | `/student/dashboard/copy-checking` | (if any) |
| Academic Calendar | `/student/dashboard/calendar/academic` | calendar/academic |
| Digital Diary | `/student/dashboard/diary` | diary (filtered by class) |
| Library | `/student/dashboard/library` | library (student view) |
| Fees | `/student/dashboard/fees`, `/student/dashboard/fees/v2` | student/fees, student/fees/receipts; fees/receipts/[id]/download |
| Transport | `/student/dashboard/transport` | student/transport |
| Apply Leave | `/student/dashboard/apply-leave` | leave/types, leave/student-requests (POST) |
| My Leaves | `/student/dashboard/my-leaves` | leave/student-requests (for this student) |
| Certificates | `/student/dashboard/certificates` | certificates (student list) |
| Communication | `/student/dashboard/communication` | communication/notices |
| Parent Info | `/student/dashboard/parent` | (parent details) |
| Gallery | `/student/dashboard/gallery` | gallery |
| Settings | `/student/dashboard/settings` | (local) |
| Change Password | `/student/dashboard/change-password` | students/change-password |

---

## 7. Accountant Dashboard — `/accountant/*`

- **Single main page:** `app/accountant/dashboard/page.tsx`. User from sessionStorage (`accountant`, `school`). APIs: `/api/accountant/stats`, `/api/fees/students`, fee collection (e.g. v2 fees payments). UI: stats, student list, filters, add fee modal, etc.

---

## 8. Shared components and patterns

- **DashboardLayout:** Sidebar (collapsible), search over menu items, modals for Classes, Timetable, Students, Calendar, Library, Transport, Leave. Renders `children` for `/dashboard/[school]/*`.
- **TimetableView:** Used in school timetable pages, teacher my-class, student my-class. Data: timetable slots by class or teacher (from `/api/timetable/slots` or similar).
- **CopyCheckingPage:** Shared between `/dashboard/[school]/copy-checking` and `/teacher/dashboard/copy-checking`; teacher version passes `schoolCodeOverride` from teacher context.
- **Session timeout:** `useSessionTimeout` + `SessionTimeoutModal` in dashboard, teacher, student layouts. Activity updates `lastActivity` in localStorage (prefix per role). On expiry, clear storage and redirect to role login.
- **401 handling:** `api-interceptor.ts` overrides `fetch`; on 401 from same-origin `/api/*`, calls `logoutHandler` (redirect + clear).

---

## 9. Data flow summary

1. **Login:** POST to role-specific auth API → backend creates row in `public.sessions` and sets `session_id` + `auth_session` cookies → response includes user object → client stores user (and role) in sessionStorage and redirects to role dashboard.
2. **Protected pages:** Middleware allows access if auth cookie matches path (school/teacher/student/accountant). Pages read user from sessionStorage for display and pass `school_code` / `staff_id` / `student_id` to APIs as needed.
3. **APIs:** Most APIs use `school_code` (and sometimes staff_id/student_id) from query or body; session is validated via cookie (and optionally via `getSessionFromRequest` for server-side session). No API reads sessionStorage (server cannot).
4. **Logout:** POST `/api/auth/logout` (with cookie) → backend deletes session row and clears cookies → client clears sessionStorage and redirects to login.

---

## 10. Supabase tables (conceptual)

- **Auth / users:** accepted_schools, staff, staff_login, students, student_login, sessions.
- **Academic:** classes, subjects, staff_subjects, timetable_slots, timetable_period_groups, examinations, exam_class_mappings, exam_subject_mappings, exam_schedules, marks, grade_scales.
- **Fees:** fee_heads, fee_structures, student_fees, payments, receipts (v2 fee system).
- **Leave:** leave_types, leave_requests, student_leave_requests.
- **Other:** notices (communication), diary/homework, library (books, sections, transactions), transport (vehicles, stops, routes), certificates, gallery, copy_checking, attendance (student_attendance, staff_attendance), visitors, gate_pass, rbac (roles, permissions, staff_roles, etc.), demo_requests.

Use this document together with **CURSOR_PROMPT_MODULE_BY_MODULE.md** to replicate the web app (e.g. mobile) page-by-page or module-by-module using the same APIs and flows.
