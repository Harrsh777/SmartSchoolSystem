# School ERP — Full Flow: Student, Staff, School Admin & Accountant Dashboards

**Copy-paste friendly for Replit or any client.** One backend (Next.js API + Supabase); same routes, same workflows.

---

## 1. Entry and Role Selection

- **Landing:** User goes to `/login` (or app root).
- **Role picker:** User chooses one of:
  - **School Admin** → redirect to `/admin/login`
  - **Staff / Teacher** → redirect to `/staff/login` (or `/login/staff` which redirects to `/staff/login`)
  - **Student** → redirect to `/student/login` (or `/login/student` which redirects to `/student/login`)
- **Accountant:** Often a separate entry (e.g. `/accountant/login` or linked from staff login). Same credentials as staff but role = accountant; backend validates role.

---

## 2. Login Flows and Redirects

| Role           | Login page          | API endpoint                     | Request body                                      | On success store (sessionStorage / SecureStore)     | Redirect to                |
|----------------|---------------------|----------------------------------|---------------------------------------------------|-----------------------------------------------------|----------------------------|
| **School Admin** | `/admin/login`      | `POST /api/auth/login`           | `{ school_code, password }`                       | `school`, `role: 'admin'`                            | `/dashboard/{school_code}` |
| **Staff/Teacher** | `/staff/login`      | `POST /api/auth/teacher/login`   | `{ school_code, staff_id, password }`             | `teacher`, `role: 'teacher'`                         | `/teacher/dashboard`       |
| **Student**      | `/student/login`     | `POST /api/auth/student/login`   | `{ school_code, admission_no, password }`        | `student`, `role: 'student'`                        | `/student/dashboard`       |
| **Accountant**   | `/accountant/login` | `POST /api/auth/accountant/login`| `{ school_code, staff_id, password }`             | `accountant`, `school`, `role: 'accountant'`         | `/accountant/dashboard`    |

- **Mobile / Replit:** Send header `X-Client: mobile` (or similar); backend may return `session_token` in JSON. Store token; on every request send `Authorization: Bearer <session_token>` or `X-Session-Token: <session_token>`.
- **Web:** Backend sets HttpOnly cookies; no token in body. Session is resolved from cookies.
- **Logout:** `POST /api/auth/logout` (with cookie or auth header). Clear stored session/token and redirect to `/login` (or role-specific login).

---

## 3. School Admin Dashboard

- **Route after login:** `/dashboard/{school_code}` (e.g. `/dashboard/SCH001`).
- **Layout:** Wraps in `DashboardLayout`: sidebar + main content. Sidebar has search and a list of modules (permission-filtered).
- **Data:** School name/code from route param `[school]` and from session (e.g. `sessionStorage.getItem('school')`). Stats from `/api/dashboard/stats?school_code=...`, classes/sections from existing dashboard fetches.

### 3.1 Admin modules (sidebar / module grid — 23 items)

Use the **same paths** under `/dashboard/[school]`. Base path = `/dashboard/${schoolCode}`.

| #  | Label                     | Path (append to base)   |
|----|---------------------------|-------------------------|
| 1  | Home                      | `` (empty)              |
| 2  | Institute Info            | `/institute-info`       |
| 3  | Gallery                   | `/gallery`               |
| 4  | Admin Role Management     | `/settings/roles`        |
| 5  | Password Manager          | `/password`              |
| 6  | Staff Management           | `/staff-management`     |
| 7  | Classes                   | `/classes`               |
| 8  | Students                  | `/students`              |
| 9  | Timetable                 | `/timetable`             |
| 10 | Calendar                  | `/calendar`              |
| 11 | Examinations              | `/examinations`          |
| 12 | Marks                     | `/marks`                 |
| 13 | Fees                      | `/fees`                  |
| 14 | Library                   | `/library`               |
| 15 | Transport                 | `/transport`             |
| 16 | Leave Management          | `/leave`                 |
| 17 | Communication             | `/communication`         |
| 18 | Reports                   | `/reports`               |
| 19 | Certificate Management    | `/certificates`          |
| 20 | Digital Diary             | `/homework`              |
| 21 | Expense/income            | `/expense-income`        |
| 22 | Front Office management   | `/front-office`          |
| 23 | Copy Checking             | `/copy-checking`         |

- **Permissions:** Some modules are gated by permissions (e.g. `manage_staff`, `view_staff`). Admin/principal typically see all; other users see only what they have access to (same logic as sidebar in `DashboardLayout`).
- **Modals:** Classes, Students, Timetable, Calendar, Library, Transport, Leave can open modals from the sidebar instead of navigating; links still use the paths above (or modal triggers).

### 3.2 Admin dashboard page content (main area)

- **Top:** Search bar (e.g. “Search menu…”), school name, `ID: SCH001`, current date, Home link.
- **Stats:** Total Students, Fees Collected This Month (₹), Staff Attendance (%), Classes & Sections (Classes: X, Sections: Y). Data from `/api/dashboard/stats` and classes/sections APIs.
- **Module grid:** Same 23 modules as cards (icon + label) linking to the paths above. See `docs/DASHBOARD_UI_CURSOR_PROMPT.md` for layout and UI details.

---

## 4. Staff / Teacher Dashboard

- **Route after login:** `/teacher/dashboard`.
- **Layout:** `TeacherLayout`: sidebar + main content. Teacher is identified from session (e.g. `sessionStorage.getItem('teacher')`); `school_code` comes from `teacher.school_code`.

### 4.1 Teacher menu (always visible in sidebar)

| Label                  | Path                              |
|------------------------|-----------------------------------|
| Home                   | `/teacher/dashboard`              |
| Mark Attendance        | `/teacher/dashboard/attendance`    |
| My Attendance          | `/teacher/dashboard/attendance-staff` |
| Marks Entry            | `/teacher/dashboard/marks`        |
| Examinations           | `/teacher/dashboard/examinations` |
| My Class               | `/teacher/dashboard/my-class`     |
| Classes                | `/teacher/dashboard/classes`      |
| Apply for Leave        | `/teacher/dashboard/apply-leave`  |
| My Leaves              | `/teacher/dashboard/my-leaves`    |
| Student Leave Approvals| `/teacher/dashboard/student-leave-approvals` |
| Institute Info         | `/teacher/dashboard/institute-info` |
| Student Management     | `/teacher/dashboard/students`     |
| Library                | `/teacher/dashboard/library`      |
| Certificate Management | `/teacher/dashboard/certificates` |
| Gallery                | `/teacher/dashboard/gallery`     |
| Academic Calendar      | `/teacher/dashboard/calendar`    |
| Digital Diary          | `/teacher/dashboard/homework`     |
| Copy Checking          | `/teacher/dashboard/copy-checking`|
| Settings               | `/teacher/dashboard/settings`     |
| Change Password        | `/teacher/dashboard/change-password` |
| Staff Information      | `/teacher/dashboard/staff-management/directory` |
| Communication         | `/teacher/dashboard/communication` |

- **Permission-based items:** Additional items (e.g. Password Manager, Staff Management, Timetable, Fees, Transport, Report, Expense/income, Gate pass) are shown if the teacher has the matching permission. These map to the same feature set as admin but under `/teacher/dashboard/...` (see teacher layout’s `dashboardMenuItems` and permission filter).
- **Class teacher:** Some items (e.g. Marks Entry, My Class, Student Leave Approvals) may require the teacher to be a class teacher.

### 4.2 Teacher dashboard page (home)

- **Data:** Teacher profile, assigned classes, students, attendance stats, upcoming exams, notices, leave requests, timetable, etc.
- **APIs (examples):**  
  - Students: `GET /api/students?school_code=...`  
  - Examinations: `GET /api/examinations/v2/teacher?school_code=...`  
  - Notices/communication: same as web.  
  - Timetable: timetable API with school_code and teacher id.

### 4.3 Teacher sub-routes (shared backend)

Many teacher screens **load the same page as admin** but with `school_code` from the teacher’s session (e.g. dynamic import of `app/dashboard/[school]/fees/...` with `schoolCode = teacher.school_code`). So the **backend and data are the same**; only the base path is `/teacher/dashboard/...` and the UI may be simplified or permission-filtered.

---

## 5. Student Dashboard

- **Route after login:** `/student/dashboard`.
- **Layout:** `StudentLayout`: sidebar + main content. Student from session (e.g. `sessionStorage.getItem('student')`); `school_code` from `student.school_code`.

### 5.1 Student menu (grouped by module)

- **Home:** `/student/dashboard`
- **Academics:** My Class, Attendance, Examinations, Marks, Copy Checking, Academic Calendar, Digital Diary, Library.
- **Fees & Transport:** Fees, Transport Info.
- **Requests:** Apply for Leave, My Leaves, Certificate Management.
- **Communication:** Communication, Parent Info.
- **Media & Activities:** Gallery.
- **Account:** Settings, Change Password.

**Exact paths:**

| Label            | Path                                  |
|------------------|---------------------------------------|
| Home             | `/student/dashboard`                  |
| My Class         | `/student/dashboard/class`            |
| Attendance       | `/student/dashboard/attendance`       |
| Examinations     | `/student/dashboard/examinations`     |
| Marks            | `/student/dashboard/marks`            |
| Copy Checking    | `/student/dashboard/copy-checking`   |
| Academic Calendar| `/student/dashboard/calendar/academic` |
| Digital Diary    | `/student/dashboard/diary`           |
| Library          | `/student/dashboard/library`         |
| Fees             | `/student/dashboard/fees`            |
| Transport Info   | `/student/dashboard/transport`       |
| Apply for Leave  | `/student/dashboard/apply-leave`     |
| My Leaves        | `/student/dashboard/my-leaves`      |
| Certificate Management | `/student/dashboard/certificates` |
| Communication    | `/student/dashboard/communication`   |
| Parent Info      | `/student/dashboard/parent`          |
| Gallery          | `/student/dashboard/gallery`         |
| Settings         | `/student/dashboard/settings`        |
| Change Password  | `/student/dashboard/change-password` |

### 5.2 Student dashboard page (home)

- **Data:** Greeting, attendance, GPA/rank, upcoming exams/events, class teacher, recent notices, etc.
- **APIs (examples):** Student-specific stats (e.g. from `/api/student/...` or dashboard endpoints that accept student id/school_code). Same backend as web.

---

## 6. Accountant Dashboard

- **Route after login:** `/accountant/dashboard`.
- **Layout:** Accountant-specific layout; focused on fees and financial reports.
- **Data:** Fees summary, collection, reports. Uses same fee APIs as admin (e.g. `/api/fees/...`, `/api/dashboard/financial-overview`) with `school_code` from session.

---

## 7. API Auth Endpoints Summary

| Purpose     | Method | Endpoint                          | Body / notes                                      |
|------------|--------|-----------------------------------|---------------------------------------------------|
| Admin login| POST   | `/api/auth/login`                 | `{ school_code, password }`                       |
| Teacher login | POST | `/api/auth/teacher/login`         | `{ school_code, staff_id, password }`             |
| Student login | POST | `/api/auth/student/login`         | `{ school_code, admission_no, password }`         |
| Accountant login | POST | `/api/auth/accountant/login`   | `{ school_code, staff_id, password }`             |
| Session    | GET    | `/api/auth/session`               | Cookie or `Authorization: Bearer <token>`         |
| Logout     | POST   | `/api/auth/logout`                | Cookie or auth header                             |

- **Session response:** Typically `{ role, school_code, user }` or equivalent. Use it to decide which dashboard to show and which modules to list.

---

## 8. Session Storage Keys (Web) / SecureStore (Mobile)

- **Admin:** `school` (object), `role` = `'admin'`.
- **Teacher:** `teacher` (object), `role` = `'teacher'`.
- **Student:** `student` (object), `role` = `'student'`.
- **Accountant:** `accountant` (object), `school` (object), `role` = `'accountant'`.

On logout, clear these and (on mobile) clear the session token from SecureStore.

---

## 9. Flow Summary (Copy-Paste Checklist)

1. **Entry:** `/login` → choose role → `/admin/login`, `/staff/login`, `/student/login`, or `/accountant/login`.
2. **Admin:** POST `/api/auth/login` with `school_code`, `password` → store `school`, `role: 'admin'` → redirect `/dashboard/{school_code}`. Show 23 modules (sidebar or grid); stats and search on dashboard page.
3. **Teacher:** POST `/api/auth/teacher/login` with `school_code`, `staff_id`, `password` → store `teacher`, `role: 'teacher'` → redirect `/teacher/dashboard`. Show teacher menu + permission-based dashboard modules; many sub-routes reuse admin pages with teacher’s `school_code`.
4. **Student:** POST `/api/auth/student/login` with `school_code`, `admission_no`, `password` → store `student`, `role: 'student'` → redirect `/student/dashboard`. Show grouped menu (Academics, Fees & Transport, Requests, Communication, Media, Account).
5. **Accountant:** POST `/api/auth/accountant/login` with `school_code`, `staff_id`, `password` → store `accountant`, `school`, `role: 'accountant'` → redirect `/accountant/dashboard`. Focus: fees and financial reports.
6. **All:** Use same API base URL; same request/response shapes; optional `X-Client: mobile` and `session_token` for non-cookie clients. Logout: POST `/api/auth/logout`, clear storage, go to login.

Use this document as the single reference for the full flow and dashboard structure when building or replicating the app (e.g. in Replit).
