# Staff Dashboard + Mobile API Blueprint (React Native)

This document is the implementation blueprint for the React Native staff app using the existing `/api/*` backend.
Web route names (like `/teacher/dashboard/...`) are used only as module labels.

## 1) Scope, actors, and lifecycle

### Actors

- **Admin**: assigns roles, class-teacher ownership, subject/timetable ownership, and module permissions.
- **Class Teacher**: class-level tasks (student attendance, class roster, non-scholastic marks, student leave approvals).
- **Subject Teacher**: subject-level tasks (marks entry by exam/subject/class from teaching assignments).

### Assignment lifecycle (admin -> teacher -> execution)

1. **Admin creates/maintains roles and permissions**  
   Tables: `roles`, `role_permissions`, `sub_modules`, `modules`, `permission_categories`.
2. **Admin links role(s) to staff**  
   Table: `staff_roles`.
3. **Admin assigns class teacher**  
   Table: `classes` (`class_teacher_id`, `class_teacher_staff_id`).
4. **Admin assigns subject teaching responsibility**  
   Tables: `timetable_slots` (`teacher_id`/`teacher_ids`) and optionally `staff_subjects`.
5. **Staff login + menu resolution in app**  
   APIs: `POST /api/auth/teacher/login`, `GET /api/auth/session`, `GET /api/staff/{id}/menu`.
6. **Teacher performs module tasks**  
   Attendance, marks, diary, leave, etc. write to their respective module tables.

### Effective access decision in mobile app

- **Class teacher access**: `GET /api/classes/teacher` has non-empty `data`.
- **Subject teacher marks access**: `GET /api/teachers/teaching-assignments` has non-empty `data.assignments`.
- **Permission extras**: `GET /api/staff/{id}/menu` merged role + direct permissions.

---

## 2) Core tables for role management

| Concern | Primary tables | Notes |
|--------|----------------|-------|
| Staff identity | `staff`, `staff_login` | Staff profile and credential linkage |
| Session/auth | `sessions`, `accepted_schools` | School hold checks + session cookies |
| Role mapping | `staff_roles`, `roles` | Staff can have multiple roles |
| Permission model | `role_permissions`, `staff_permissions`, `modules`, `sub_modules`, `permission_categories` | Menu gating and action-level access |
| Class teacher mapping | `classes` | `class_teacher_id`, `class_teacher_staff_id` |
| Subject teaching mapping | `timetable_slots`, `staff_subjects` | Timetable is operational source of truth |

---

## 3) Authentication and RBAC APIs (cross-cutting)

| API | Tables / storage | Purpose |
|-----|------------------|---------|
| `POST /api/auth/teacher/login` | `accepted_schools`, `staff_login`, `staff`, `sessions` | Validate teacher login and create session |
| `GET /api/auth/session` | `sessions` | Resolve logged-in user + role payload |
| `GET /api/staff/{id}/menu` | `staff`, `classes`, `staff_subjects`, `staff_roles`, `roles`, `role_permissions`, `sub_modules`, `modules`, `permission_categories`, `staff_permissions` | Build final menu and action permissions |
| `GET /api/admin/staff` | `staff` | Admin fetches staff list for assignment |
| `GET /api/staff/{id}/roles` | `staff_roles`, `roles` | Read current role mapping |
| `POST /api/staff/{id}/roles` | `staff_roles` | Replace/update staff role mappings |
| `GET /api/classes/teacher` | `classes`, `students` | Class-teacher scope |
| `GET /api/teachers/teaching-assignments` | `timetable_slots`, `classes`, `subjects` | Subject-teacher scope for marks and teaching |

---

## 4) React Native design system (color + UI/UX rules)

Use a single design token set across all modules.

### Color scheme

- `primary`: `#2563EB` (actions, active tab, key buttons)
- `primarySoft`: `#DBEAFE` (selected chips/cards background)
- `accent`: `#14B8A6` (secondary highlights, progress accents)
- `success`: `#16A34A` (approved/saved/completed states)
- `warning`: `#D97706` (pending/attention states)
- `danger`: `#DC2626` (reject/delete/error)
- `bg`: `#F8FAFC` (screen background)
- `surface`: `#FFFFFF` (cards, sheets)
- `textPrimary`: `#0F172A`
- `textSecondary`: `#475569`
- `border`: `#E2E8F0`

### Typography and spacing

- Title: 22/700
- Section heading: 18/600
- Body: 14-16/400-500
- Caption/meta: 12/400
- Base spacing scale: 4, 8, 12, 16, 20, 24

### Component behavior

- **Lists:** card-based rows with search, filter chips, pull-to-refresh.
- **Forms:** sticky submit button at bottom, inline validation, disable submit while saving.
- **Status tags:** standardized chips (`Approved`, `Pending`, `Rejected`, `Absent`, `Present`).
- **Empty states:** icon + concise guidance + clear CTA.
- **Loaders:** skeleton for first load, spinner for incremental fetch.

---

## 5) Module-by-module mapping (tables + what user sees + role)

### 0. Session & menu bootstrap

- **Who uses:** Admin, Class Teacher, Subject Teacher (all staff logins).
- **Main APIs:** `POST /api/auth/teacher/login`, `GET /api/auth/session`, `GET /api/staff/{id}/menu`.
- **Tables:** `accepted_schools`, `staff_login`, `staff`, `sessions`, `staff_roles`, `roles`, `role_permissions`, `staff_permissions`, `modules`, `sub_modules`, `permission_categories`, `classes`, `staff_subjects`.
- **RN screens:** Login, session-loader, dynamic menu drawer.
- **UI shown:** school selector (if required), mobile/password, login CTA, error prompts, role-based home shortcuts.

### 1. Home (`/teacher/dashboard`)

- **Who uses:** all teaching staff.
- **Main APIs:** students summary, teacher classes, timetable slots, grade distribution, todos, daily agenda, notices, calendar notifications.
- **Tables:** `students`, `classes`, `timetable_slots`, `teacher_todos`, `staff_attendance`, `examinations`, `exam_class_mappings`, `exam_subject_mappings`, `notices`, `event_notifications`, `student_leave_requests`, `leave_types`.
- **UI shown:** KPI cards (today classes/todos/pending approvals), quick actions, next period card, notice carousel, pending task widgets.

### 2. Mark Attendance (`/teacher/dashboard/attendance`)

- **Who uses:** class teacher.
- **Main APIs:** class list, attendance by class/date, roster fetch, mark/update attendance.
- **Tables:** `classes`, `students`, `student_attendance`, `staff`, `accepted_schools`.
- **UI shown:** class and date picker, student list with Present/Absent/Half-day toggles, save banner, submission status.

### 3. My Attendance (`/teacher/dashboard/attendance-staff`)

- **Who uses:** all teaching staff.
- **Main API:** staff attendance history.
- **Tables:** `staff_attendance`, `accepted_schools`.
- **UI shown:** month calendar strip, attendance summary donut, day-wise status timeline.

### 4. My Timetable (`/teacher/dashboard/my-timetable`)

- **Who uses:** all teaching staff.
- **Main APIs:** period groups, timetable slots.
- **Tables:** `timetable_period_groups`, `timetable_periods`, `timetable_slots`, `classes`, `subjects`, `staff`.
- **UI shown:** day tabs, period cards (time/class/subject/room), free-period highlighting.

### 5. Marks Entry - Scholastic (`/teacher/dashboard/marks`)

- **Who uses:** class teacher and assigned subject teacher.
- **Main APIs:** teacher examinations, exam detail, class mappings, students, marks read/status/write.
- **Tables:** `examinations`, `exam_class_mappings`, `exam_subject_mappings`, `classes`, `subjects`, `students`, `student_subject_marks`, `student_exam_summary`, `marks_entry_audit`, `timetable_slots`, `staff_subjects`.
- **UI shown:** exam selector -> class/subject selector -> mark-entry grid, lock status tags, save and finalize actions, audit snackbar.

### 6. Non-Scholastic Marks (`/teacher/dashboard/non-scholastic-marks`)

- **Who uses:** class teacher.
- **Main APIs:** class teacher classes, term structures, terms-for-class, non-scholastic marks read/write.
- **Tables:** `classes`, `students`, `exam_term_structures`, `exam_terms`, `class_subjects`, `subjects`, `non_scholastic_marks`.
- **UI shown:** class + term + activity filter, rubric-based grade chips, per-student rating cards.

### 7. Examinations (`/teacher/dashboard/examinations`)

- **Who uses:** all teaching staff.
- **Main API:** teacher-scoped examinations list.
- **Tables:** `examinations`, `exam_class_mappings`, `exam_subject_mappings`, `classes`, `subjects`, `timetable_slots`, `staff_subjects`.
- **UI shown:** exam cards with status/date window/class coverage and CTA to marks module.

### 8. My Class (`/teacher/dashboard/my-class`)

- **Who uses:** class teacher.
- **Main APIs:** class-teacher classes and active students.
- **Tables:** `classes`, `students`.
- **UI shown:** class profile card, strength and section, student roster with quick actions.

### 9. Classes (`/teacher/dashboard/classes`)

- **Who uses:** all teaching staff.
- **Main APIs:** school classes list and class-wise student roster.
- **Tables:** `classes`, `students`, `staff`, `accepted_schools`.
- **UI shown:** class cards, section chips, count badges, tap into roster details.

### 10. Student Management (`/teacher/dashboard/students`)

- **Who uses:** all teaching staff (as permitted).
- **Main APIs:** student directory + student fees/transport detail.
- **Tables:** `students`, `academic_years`, `student_fees`, `transport_routes`, `transport_stops`, `accepted_schools`.
- **UI shown:** searchable directory, profile header, parent/contact/transport/fee info blocks.

### 11. Academic Calendar (`/teacher/dashboard/calendar`)

- **Who uses:** all teaching staff.
- **Main API:** academic calendar aggregation.
- **Tables:** `events`, `academic_calendar`, `exam_schedules`, `examinations`.
- **UI shown:** monthly calendar with colored event dots, agenda list, event detail sheet.

### 12. Digital Diary (`/teacher/dashboard/homework`)

- **Who uses:** all teaching staff.
- **Main APIs:** diary listing, stats, details, CRUD, upload.
- **Tables/Buckets:** `diaries`, `diary_targets`, `diary_attachments`, `diary_reads`, storage `diary-attachments`, `classes`, `students`.
- **UI shown:** compose editor with attachments, class/section targeting, publish schedule, read receipts.

### 13. Copy Checking (`/teacher/dashboard/copy-checking`)

- **Who uses:** all teaching staff.
- **Main APIs:** teacher classes and timetable slots.
- **Tables:** `classes`, `students`, `timetable_slots`.
- **UI shown:** class-subject checklist, pending/checked counters, completion tracker timeline.

### 14. Apply for Leave (`/teacher/dashboard/apply-leave`)

- **Who uses:** all teaching staff.
- **Main APIs:** leave types, leave create.
- **Tables:** `leave_types`, `staff_leave_requests`, `staff`.
- **UI shown:** leave type dropdown, date range picker, reason text box, attachment option, submit state.

### 15. My Leaves (`/teacher/dashboard/my-leaves`)

- **Who uses:** all teaching staff.
- **Main APIs:** leave types, own leave requests, withdraw request.
- **Tables:** `staff_leave_requests`, `leave_types`.
- **UI shown:** request timeline with status chips, filter by status/date, withdraw CTA for pending only.

### 16. Student Leave Approvals (`/teacher/dashboard/student-leave-approvals`)

- **Who uses:** class teacher.
- **Main APIs:** class-teacher student leave queue, approval action.
- **Tables:** `student_leave_requests`, `students`, `classes`, `leave_types`.
- **UI shown:** pending leave cards with reason/dates/docs and Approve/Reject bottom actions.

### 17. Institute Info (`/teacher/dashboard/institute-info`)

- **Who uses:** all teaching staff.
- **Main API:** accepted schools list.
- **Table:** `accepted_schools`.
- **UI shown:** school profile (name, board, contacts, address, logo), static info cards.

### 18. Library (`/teacher/dashboard/library`)

- **Who uses:** all teaching staff.
- **Main API:** library books catalog.
- **Tables:** `library_books`, `library_sections`, `library_material_types`, `library_book_copies`.
- **UI shown:** search + filter chips (section/type/availability), book cards, copy status tags.

### 19. Certificate Management (`/teacher/dashboard/certificates`)

- **Who uses:** all teaching staff (as permitted).
- **Main APIs:** teacher classes/students, simple certificate list/upload.
- **Tables/Buckets:** `simple_certificates`, `students`, `accepted_schools`, storage `certificates`.
- **UI shown:** student picker, certificate type/upload form, issued history list with download/open.

### 20. Gallery (`/teacher/dashboard/gallery`)

- **Who uses:** all teaching staff.
- **Main API:** gallery listing.
- **Tables/Bucket:** `gallery`, `staff`, `accepted_schools`, storage `school-media`.
- **UI shown:** category tabs, media grid, image viewer modal, upload metadata chips (if allowed).

### 21. Staff Information (`/teacher/dashboard/staff-management/directory`)

- **Who uses:** all teaching staff.
- **Main API:** staff directory.
- **Tables:** `staff` (+ optional subject joins).
- **UI shown:** searchable teacher/staff cards, contact actions (call/message), department filters.

### 22. Communication (`/teacher/dashboard/communication`)

- **Who uses:** all teaching staff.
- **Main API:** notices feed.
- **Tables:** `notices`, `accepted_schools`.
- **UI shown:** notice cards, priority badge, attachment preview, read/unread state.

### 23. Settings (`/teacher/dashboard/settings`)

- **Who uses:** all teaching staff.
- **Main APIs:** profile read/update, photo read/upload.
- **Tables/Bucket:** `staff`, storage `staff-photos`.
- **UI shown:** editable profile form, avatar upload, preferences toggles, save confirmation.

### 24. Change Password (`/teacher/dashboard/change-password`)

- **Who uses:** all teaching staff.
- **Main API:** change password.
- **Tables:** `staff`, `staff_login`.
- **UI shown:** old/new/confirm fields, password strength meter, success confirmation + re-login prompt.

---

## 6) Admin role assignment module (recommended RN admin flow)

If admin features are exposed in mobile app, create these pages:

1. **Staff Directory (Admin)**  
   - List all staff (`GET /api/admin/staff`).
   - Search by name/employee id/department.

2. **Assign Role Page**  
   - Load existing roles (`GET /api/staff/{id}/roles`).
   - Multi-select role chips.
   - Save (`POST /api/staff/{id}/roles` -> updates `staff_roles`).

3. **Assign Class Teacher Page**  
   - Select class and teacher.
   - Save mapping to `classes.class_teacher_id` / `class_teacher_staff_id`.

4. **Assign Subject Teacher Page**  
   - Matrix: class x subject x period.
   - Save in `timetable_slots.teacher_id` (or `teacher_ids`).
   - Optional sync to `staff_subjects`.

5. **Permission Override Page (optional advanced)**  
   - Add direct staff permissions (`staff_permissions`) for exceptions over role defaults.

---

## 7) Missing items added in this revision

- Clear **end-to-end role management flow** (admin assignment to teacher action).
- Explicit **Class Teacher vs Subject Teacher** behavior and access checks.
- **UI/UX + color system** for every module, tailored to React Native implementation.
- Added **admin-side mobile module recommendations** for assignment and governance.

---

Generated from `app/teacher/dashboard/*`, `app/teacher/layout.tsx`, and `app/api/*` route handlers, then expanded for React Native implementation and product design consistency.
