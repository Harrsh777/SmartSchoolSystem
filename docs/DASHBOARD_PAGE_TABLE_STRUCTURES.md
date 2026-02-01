# Dashboard Page & Sidebar — Table Structures and Data Reference

**Page:** `app/dashboard/[school]/page.tsx`  
**Layout/Sidebar:** `components/DashboardLayout.tsx`

This document lists **every table** used by the dashboard page (stats, detailed stats, financial, administrative, calendar, exams, classes) and by the **sidebar/modules/search**. It also documents where **sidebar and searchable menu items** come from (code, not DB).

---

## 1. Where Sidebar and Modules Come From (No DB)

The **sidebar menu** and **searchable menu items** are **not stored in the database**. They are defined in code in `DashboardLayout.tsx`.

### 1.1 Sidebar main menu (`menuItems`)

Defined in `DashboardLayout.tsx` as a constant array. Each item has:

- `icon` — Lucide component
- `label` — display name
- `path` — route under `/dashboard/[school]` (e.g. `''`, `/institute-info`, `/settings/roles`, `/password`, …)
- `permission` — permission key (e.g. `manage_passwords`, `manage_staff`) or `null` (always visible)
- `viewPermission` — view permission key or `null`
- `isModal` — optional; if true, opening the item opens a modal instead of navigating (Classes, Students, Timetable, Calendar, Library, Transport, Leave)

**List (order in sidebar):**

| # | Label                     | Path                | Permission           | isModal |
|---|---------------------------|---------------------|----------------------|--------|
| 1 | Home                      | ``                  | null                 | —      |
| 2 | Institute Info            | /institute-info     | null                 | —      |
| 3 | Admin Role Management     | /settings/roles     | null                 | —      |
| 4 | Password Manager          | /password           | manage_passwords     | —      |
| 5 | Staff Management          | /staff-management   | manage_staff         | —      |
| 6 | Classes                   | /classes            | manage_classes       | true   |
| 7 | Student Management        | /students           | manage_students      | true   |
| 8 | Timetable                 | /timetable          | manage_timetable     | true   |
| 9 | Event/Calendar            | /calendar           | manage_events        | true   |
|10 | Examinations              | /examinations       | manage_exams         | —      |
|11 | Report Card               | /report-card        | manage_exams         | —      |
|12 | Marks                     | /marks              | manage_exams         | —      |
|13 | Fees                      | /fees               | manage_fees          | —      |
|14 | Library                   | /library            | manage_library       | true   |
|15 | Transport                 | /transport          | manage_transport     | true   |
|16 | Leave Management         | /leave              | manage_leaves        | true   |
|17 | Communication             | /communication      | manage_communication| —      |
|18 | Report                    | /reports            | view_reports         | —      |
|19 | Gallery                   | /gallery            | null                 | —      |
|20 | Certificate Management    | /certificates       | manage_certificates  | —      |
|21 | Digital Diary             | /homework           | manage_homework      | —      |
|22 | Expense/income            | /expense-income     | manage_finances      | —      |
|23 | Front Office management   | /front-office       | manage_gate_pass     | —      |
|24 | Copy Checking             | /copy-checking      | manage_copy_checking | —      |

Visibility for non-admin users is determined by **permissions** from the backend (see § 3).

### 1.2 Searchable menu items (`searchableMenuItems`)

Also in `DashboardLayout.tsx`: a flat array of entries used for **search** and for **sub-items under each main menu**. Each entry has:

- `label` — display name
- `path` — route (e.g. `/staff-management/directory`, `/classes/overview`)
- `category` — grouping label (e.g. "Staff Management", "Classes")
- `icon` — Lucide component
- `parent` — optional; if set, this is a **submodule** under the main menu with label = parent (e.g. parent: "Staff Management" → sub-item of Staff Management)

**Modules and submodules (conceptual):**

- **Institute Info** — sub: Basic Institute Info  
- **Staff Management** — sub: Staff Directory, Add Staff, Bulk Staff Import, Bulk Photo Upload, Staff Attendance, Staff Attendance Marking Report  
- **Classes** — sub: Classes Overview, Modify Classes, Subject Teachers, Add/Modify Subjects  
- **Student Management** — sub: Add Student, Student Directory, Student Attendance, Mark Attendance, Bulk Import Students, Student Siblings  
- **Timetable** — sub: Class Timetable, Teacher Timetable, Group Wise Timetable  
- **Event/Calendar** — sub: Academic Calendar, Events  
- **Examinations** — sub: Examination Dashboard, Create Examination, Grade Scale, Examination Reports  
- **Report Card** — sub: Generate Report Card, Report Card Dashboard, Customize Template  
- **Marks** — sub: Marks Dashboard, Mark Entry  
- **Fees** — sub: Fee Dashboard, Fee Heads, Fee Structures, Collect Payment, Student Fee Statements, Discounts & Fines, Fee Reports  
- **Library** — sub: Library Dashboard, Library Basics, Library Catalogue, Library Transactions  
- **Transport** — sub: Transport Dashboard, Vehicles, Stops, Routes, Student Route Mapping  
- **Leave Management** — sub: Leave Dashboard, Student Leave, Staff Leave, Leave Basics  
- **Front Office management** — sub: Front Office Dashboard, Gate pass, Visitor Management  
- **Certificate Management** — sub: Certificate Dashboard, New Certificate  
- **Attendance** — sub: Staff Attendance  

Search filters by `label`, `category`, and `parent`; results are filtered by **permissions** via `getSearchableItems()` (same logic as sidebar).

**Nothing from the sidebar or searchable list is saved to DB**; only which items are *visible* depends on DB (roles/permissions).

---

## 2. Dashboard Page — APIs and State

The dashboard page (`page.tsx`) calls these APIs and stores results in React state. Below, each API is mapped to the **tables** it reads (and, where relevant, column usage).

### 2.1 School data

- **Source:** `sessionStorage.getItem('school')` or `GET /api/schools/accepted` (then find by `school_code`).
- **State:** `school` (AcceptedSchool).

### 2.2 Main stats

- **API:** `GET /api/dashboard/stats?school_code={schoolCode}`
- **State:** `stats` (DashboardStats)

### 2.3 Detailed stats

- **API:** `GET /api/dashboard/stats-detailed?school_code={schoolCode}`
- **State:** `detailedStats` (DetailedStats)

### 2.4 Financial overview

- **API:** `GET /api/dashboard/financial-overview?school_code={schoolCode}&period={feePeriod}`
- **State:** `financialData` (FinancialData)

### 2.5 Timetable list

- **API:** `GET /api/timetable/list?school_code={schoolCode}`
- **State:** `timetables`

### 2.6 Upcoming examinations

- **API:** `GET /api/examinations?school_code={schoolCode}`
- **State:** `upcomingExams`, `previousExams`

### 2.7 Administrative data (attendance, notices, visitors, leaves)

- **API:** `GET /api/dashboard/administrative?school_code={schoolCode}`
- **State:** `administrativeData` (AdministrativeData)

### 2.8 Academic calendar / events

- **API:** `GET /api/calendar/academic?school_code={schoolCode}&academic_year={selectedYear}`
- **State:** `calendarEntries`

### 2.9 Classes and sections count

- **API:** `GET /api/classes?school_code={schoolCode}`
- **State:** derived `classesCount`, `sectionsCount`

### 2.10 Download (students, staff, parents, attendance)

- **APIs:** `GET /api/download/students?school_code=...`, `/api/download/staff?school_code=...`, etc.
- **State:** only triggers download; no table “saved” by dashboard page (download APIs read from their own tables).

---

## 3. Tables Used by Dashboard Page (and Sidebar Permissions)

Below, **table** means Supabase (Postgres) table. Columns are inferred from API `.select()`, `.insert()`, and `lib/supabase.ts` types. `*` = all columns used somewhere.

### 3.1 `accepted_schools`

Used by: dashboard stats, stats-detailed, financial-overview, administrative (indirect), school data, classes, timetable, calendar.

| Column           | Type / usage |
|------------------|-------------|
| id               | uuid (PK)   |
| school_name      | text        |
| school_code      | text (unique) |
| school_address   | text        |
| city             | text        |
| state            | text        |
| zip_code         | text        |
| country          | text        |
| school_email     | text        |
| school_phone     | text        |
| principal_name   | text        |
| principal_email  | text        |
| principal_phone  | text        |
| established_year | integer     |
| school_type      | text        |
| affiliation      | text        |
| approved_at      | timestamptz |
| created_at       | timestamptz |
| is_hold          | boolean     |

---

### 3.2 `students`

Used by: dashboard stats (count), stats-detailed (gender, created_at, new admissions), administrative (count, status), financial-overview (count, class, academic_year), download/students, classes (student_count).

| Column         | Type / usage |
|----------------|-------------|
| id             | uuid (PK)   |
| school_code    | text        |
| student_name   | text        |
| first_name     | text        |
| last_name      | text        |
| admission_no   | text        |
| class          | text        |
| section        | text        |
| academic_year  | text        |
| gender         | text        |
| status         | text (e.g. 'active') |
| date_of_birth  | date        |
| parent_name    | text        |
| parent_phone   | text        |
| roll_number    | integer     |
| created_at     | timestamptz |
| *              | (download uses *) |

---

### 3.3 `staff`

Used by: dashboard stats (count), stats-detailed (role, gender), administrative (count), classes (class_teacher), timetable list (class teacher), download/staff.

| Column      | Type / usage |
|-------------|-------------|
| id          | uuid (PK)   |
| school_code | text        |
| staff_id    | text        |
| full_name   | text        |
| email       | text        |
| phone       | text        |
| role        | text        |
| gender      | text        |
| created_at  | timestamptz |
| *           | (download may use *) |

---

### 3.4 `student_attendance`

Used by: dashboard stats (today’s count, present), stats-detailed (today, status), administrative (today, status breakdown).

| Column         | Type / usage |
|----------------|-------------|
| id             | uuid (PK)   |
| school_code    | text        |
| student_id     | uuid (FK students) |
| attendance_date| date        |
| status         | text ('present','absent','halfday','half_day','leave','duty_leave','duty leave') |
| (created_at etc.) | optional |

---

### 3.5 `staff_attendance`

Used by: dashboard stats (today’s count, present), administrative (today, status breakdown).

| Column         | Type / usage |
|----------------|-------------|
| id             | uuid (PK)   |
| school_code    | text        |
| staff_id       | uuid (FK staff) |
| attendance_date| date        |
| status         | text ('present','absent','half_day','halfday','leave','late','holiday') |

---

### 3.6 `payments`

Used by: dashboard stats (fee collection: amount, payment_date; monthly/today), financial-overview (amount, payment_date, student_id; fee stats).

| Column       | Type / usage |
|--------------|-------------|
| id           | uuid (PK)   |
| school_code  | text        |
| student_id   | uuid        |
| amount       | numeric     |
| payment_date | date/timestamptz |
| is_reversed  | boolean     |
| (receipt_number, payment_mode, etc.) | optional |

---

### 3.7 `fees` (legacy)

Used when `payments` is empty or not used: dashboard stats, financial-overview.

| Column        | Type / usage |
|---------------|-------------|
| id            | uuid (PK)   |
| school_code   | text        |
| student_id    | uuid        |
| amount        | numeric     |
| total_amount  | numeric     |
| payment_date  | date        |

---

### 3.8 `income_entries`

Used by: financial-overview (amount, entry_date; total income, monthly breakdown).

| Column             | Type / usage |
|--------------------|-------------|
| id                 | uuid (PK)   |
| school_code        | text        |
| amount             | numeric     |
| entry_date         | date        |
| is_active          | boolean     |
| (financial_year_id, category, description, payee) | optional |

---

### 3.9 `expense_entries`

Used by: financial-overview (amount, entry_date; total expense, monthly breakdown).

| Column             | Type / usage |
|--------------------|-------------|
| id                 | uuid (PK)   |
| school_code        | text        |
| amount             | numeric     |
| entry_date         | date        |
| is_active          | boolean     |
| (financial_year_id, category, description, payee) | optional |

---

### 3.10 `student_fees`

Used by: financial-overview (fee management stats: base_amount, paid_amount, adjustment_amount, status; pending students).

| Column            | Type / usage |
|-------------------|-------------|
| id                | uuid (PK)   |
| school_code       | text        |
| student_id        | uuid        |
| base_amount       | numeric     |
| paid_amount       | numeric     |
| adjustment_amount | numeric     |
| status             | text       |
| (fee_schedule_id, etc.) | optional |

---

### 3.11 `fee_schedules`

Used by: financial-overview (amount, class, academic_year for due calculation).

| Column        | Type / usage |
|---------------|-------------|
| id            | uuid (PK)   |
| school_code   | text        |
| amount        | numeric     |
| class         | text        |
| academic_year | text        |

---

### 3.12 `examinations`

Used by: dashboard stats (upcoming count), page (upcoming/previous exams list).

| Column        | Type / usage |
|---------------|-------------|
| id            | uuid (PK)   |
| school_code   | text        |
| exam_name     | text        |
| academic_year | text        |
| status        | text ('upcoming','ongoing','completed') |
| start_date    | date        |
| end_date      | date        |
| class_id      | uuid (nullable) |
| created_by    | uuid (nullable) |
| created_at    | timestamptz |
| updated_at    | timestamptz |

---

### 3.13 `notices`

Used by: dashboard stats (recent count), administrative (recent notices: id, title, content, category, priority, created_at, publish_at).

| Column     | Type / usage |
|------------|-------------|
| id         | uuid (PK)   |
| school_id  | uuid        |
| school_code| text        |
| title      | text        |
| content    | text        |
| category   | text        |
| priority   | text        |
| status     | text ('Active','Draft','Archived') |
| publish_at | timestamptz |
| created_at | timestamptz |
| updated_at | timestamptz |

---

### 3.14 `visitors`

Used by: administrative (recent visitors: id, visitor_name, purpose_of_visit, created_at, status).

| Column           | Type / usage |
|------------------|-------------|
| id               | uuid (PK)   |
| school_code      | text        |
| visitor_name     | text        |
| purpose_of_visit| text        |
| person_to_meet   | text        |
| phone_number     | text        |
| email            | text        |
| status           | text ('pending','checked_in','checked_out') |
| check_in_time    | timestamptz |
| check_out_time   | timestamptz |
| created_at       | timestamptz |

---

### 3.15 Leave tables (administrative widget)

**Note:** `dashboard/administrative` uses **`staff_leaves`** and **`student_leaves`**. The **Leave module** APIs use **`staff_leave_requests`** and **`student_leave_requests`**. Both pairs exist in the codebase; dashboard page only uses the first.

**`staff_leaves`** (administrative):

| Column           | Type / usage |
|------------------|-------------|
| id               | uuid (PK)   |
| school_code      | text        |
| staff_id         | uuid        |
| leave_type       | text        |
| leave_start_date | date        |
| leave_end_date   | date        |
| status           | text ('pending', etc.) |
| created_at       | timestamptz |

**`student_leaves`** (administrative):

| Column           | Type / usage |
|------------------|-------------|
| id               | uuid (PK)   |
| school_code      | text        |
| student_id       | uuid        |
| leave_title      | text        |
| leave_start_date | date        |
| leave_end_date   | date        |
| status           | text ('pending', etc.) |
| created_at       | timestamptz |

**`staff_leave_requests`** / **`student_leave_requests`** — used by Leave Management module and leave reports, not by dashboard page directly. Structure similar (staff_id/student_id, leave type, dates, status, approved_by, etc.).

---

### 3.16 `classes`

Used by: dashboard page (classes list → classesCount, sectionsCount), timetable list, classes API.

| Column              | Type / usage |
|---------------------|-------------|
| id                  | uuid (PK)   |
| school_id           | uuid (FK accepted_schools) |
| school_code         | text        |
| class               | text        |
| section             | text        |
| academic_year       | text        |
| class_teacher_id    | uuid (nullable, FK staff) |
| class_teacher_staff_id | text (optional) |
| created_at          | timestamptz |
| updated_at          | timestamptz |

---

### 3.17 `timetable_slots`

Used by: timetable list (count per class_id).

| Column       | Type / usage |
|--------------|-------------|
| id           | uuid (PK)   |
| school_code  | text        |
| class_id     | uuid (FK classes) |
| day_of_week  | integer     |
| period_order | integer     |
| subject_id   | uuid        |
| staff_id     | uuid        |
| (room, etc.) | optional    |

---

### 3.18 `events`

Used by: calendar/academic (dashboard calendar widget).

| Column             | Type / usage |
|--------------------|-------------|
| id                 | uuid (PK)   |
| school_id          | uuid        |
| school_code        | text        |
| event_date         | date        |
| title              | text        |
| description        | text        |
| event_type         | text ('event','holiday') |
| is_active          | boolean     |
| applicable_for     | text        |
| applicable_classes | jsonb/array (optional) |

---

### 3.19 `academic_calendar`

Used by: calendar/academic (combined with events for dashboard calendar).

| Column        | Type / usage |
|---------------|-------------|
| id            | uuid (PK)   |
| school_code   | text        |
| academic_year | text        |
| event_date    | date        |
| title         | text        |
| event_type    | text        |
| is_active     | boolean     |
| (description) | optional    |

---

## 4. Tables Used for Sidebar Visibility (Permissions)

For **non-admin** users, sidebar and search results are filtered by permissions. Permissions come from:

- **Staff** → `staff_roles` → **roles** → **role_permissions** → **permissions**
- **Staff** → **staff_permissions** (overrides)

Relevant tables (used by `/api/staff/[id]/menu` and permission checks):

### 4.1 `roles`

| Column       | Type     |
|-------------|----------|
| id          | uuid (PK)|
| name        | text     |
| description | text     |

### 4.2 `permissions`

| Column | Type     |
|--------|----------|
| id     | uuid (PK)|
| key    | text (e.g. manage_staff, view_staff) |
| name   | text     |
| module | text     |

### 4.3 `role_permissions`

| Column        | Type     |
|---------------|----------|
| role_id       | uuid (FK roles) |
| permission_id | uuid (FK permissions) |

### 4.4 `staff_roles`

| Column   | Type     |
|----------|----------|
| staff_id | uuid (FK staff) |
| role_id  | uuid (FK roles) |

### 4.5 `staff_permissions`

| Column        | Type     |
|---------------|----------|
| staff_id      | uuid (FK staff) |
| permission_id | uuid (FK permissions) |
| (allow/deny)  | optional |

### 4.6 `modules` / `sub_modules`

Used by role-management and menu building (e.g. `/api/modules`, `/api/staff/[id]/menu`) to group permissions/sub-modules. Structure is application-specific (id, name, route_key, parent_id, etc.).

### 4.7 `staff_login`

Used by auth and password manager; not by dashboard page UI directly. Contains staff_id, school_code, password hash, etc.

### 4.8 `student_login`

Used by auth and password manager; not by dashboard page UI directly. Contains student id, school_code, password hash, admission_no, etc.

---

## 5. Quick Reference — Dashboard Page Data Flow

| State / Data           | API / Source                    | Main tables |
|------------------------|----------------------------------|------------|
| school                 | sessionStorage or /api/schools/accepted | accepted_schools |
| stats                  | /api/dashboard/stats             | accepted_schools, students, staff, student_attendance, staff_attendance, examinations, notices, payments/fees |
| detailedStats          | /api/dashboard/stats-detailed    | accepted_schools, students, staff, student_attendance |
| financialData          | /api/dashboard/financial-overview| income_entries, expense_entries, payments, fees, students, student_fees, fee_schedules |
| timetables             | /api/timetable/list              | classes, timetable_slots, staff |
| upcomingExams, previousExams | /api/examinations          | examinations |
| administrativeData     | /api/dashboard/administrative    | student_attendance, students, staff_attendance, staff, notices, visitors, staff_leaves, student_leaves |
| calendarEntries        | /api/calendar/academic          | events, academic_calendar |
| classesCount, sectionsCount | /api/classes                | classes |
| Sidebar visibility     | (client: userInfo.role, permissions from session/API) | staff, staff_roles, staff_permissions, roles, role_permissions, permissions |
| Searchable menu        | (hardcoded searchableMenuItems filtered by permissions) | (no tables; permissions as above) |

---

## 6. What Is “Saved” From the Dashboard Page

- **Nothing is written to the DB by the dashboard page itself.** The page only **reads** via the APIs above.
- **Sidebar order / menu structure** is not saved; it’s fixed in `DashboardLayout.tsx` (`menuItems` and `searchableMenuItems`). Optional: if you add “sidebar order” in the future, that would be a new table (e.g. user_preferences or menu_order).
- **Session:** After login, `school` (and optionally role) are stored in **sessionStorage** (and/or session cookie). Session is validated server-side from cookies or token; session data may be stored in a **sessions** table (not listed here; see auth).
- **Download** actions only **read** from students, staff, etc., and return a file; they do not change dashboard state in DB.

---

# Part II — Mobile App: UI/UX and Module Structure (What to Display)

This section describes **how to structure each module** in the mobile app and **what to display** on each screen. Use the same APIs and tables from Part I; only layout and UX are specified here.

---

## 7. Shared UI/UX Principles (Mobile)

- **Layout:** One primary action per screen; secondary actions in header or overflow menu. Use bottom tabs or drawer only where it matches the web (e.g. Home, Reports).
- **Spacing:** Generous padding (e.g. 16–24px); consistent gaps between cards and list items. Avoid cramped rows.
- **Typography:** Clear hierarchy: one size for screen title, one for section headers, one for body, one for captions. Prefer sans-serif. Support dynamic text sizing (accessibility).
- **Colors:** Light background (white/off-white); primary action in brand color; success/green, warning/amber, error/red only where needed. Use pastel tints for module icons.
- **Touch:** Minimum tap target 44×44pt. Swipe to refresh on lists. Pull-to-refresh where data can change. Loading: skeletons or spinner; empty state: illustration or message + CTA.
- **Forms:** One column; labeled fields; appropriate keyboard (email, number, phone, date). Inline validation; submit button fixed at bottom or as FAB. Success toast or navigate back.
- **Navigation:** Back from detail to list; deep links to submodules (e.g. Staff → Staff Directory, Add Staff). Breadcrumb or header subtitle for deep screens.
- **Offline:** Show cached data if available; queue mutations and retry; surface "No connection" when needed.

---

## 8. Module Structure and What to Display (Mobile)

For each module: **structure** = screens/sections and their purpose; **what to display** = main data and actions; **UI/UX** = layout and behavior.

---

### 8.1 Home (Dashboard)

**Structure:**  
- **Single screen:** Header (search + context) → Stats strip → Module grid.

**What to display:**  
- **Header:** Search bar (placeholder "Search menu…" or school name); school name; "ID: {school_code}"; current date (e.g. "February 1, 2026"); "Home" link.  
- **Stats (4 cards):** Total Students (number); Fees Collected This Month (₹); Staff Attendance (%); All Classes & Sections (Classes: X, Sections: Y). Data from `GET /api/dashboard/stats` and classes API.  
- **Module grid:** 23 cards (icon + label). Each card = one main module; tap navigates to that module's root (e.g. Institute Info, Gallery, Admin Role Management, … Copy Checking). Filter visible cards by user permissions.

**UI/UX:**  
- Sticky header; stats in 2×2 grid or horizontal scroll; grid 2 columns (phone), 3–4 (tablet). Skeleton for stats and grid while loading. Pull-to-refresh to re-fetch stats. Consistent icon set (e.g. Lucide) and pastel icon colors; tap feedback (highlight or scale).

---

### 8.2 Institute Info

**Structure:**  
- **One screen:** Scrollable form with sections (Basic Info, Address, Principal, Academic). Optional: "Houses" / "Working days" as separate list screens if APIs support it.

**What to display:**  
- **Basic Info:** School name, school code (read-only), email, phone.  
- **Address:** Address, city, state, zip, country.  
- **Principal:** Principal name, email, phone.  
- **Academic:** Established year, school type, affiliation.  
- **Actions:** "Save" at bottom or FAB. Success toast; optionally "View" to stay on screen with updated data.

**UI/UX:**  
- One card per section; labeled inputs; appropriate keyboards. Save button fixed at bottom or FAB. Loading on submit; error messages inline or toast.

---

### 8.3 Gallery

**Structure:**  
- **List screen:** Grid of images; filter by category.  
- **Detail screen:** Full-screen image + title + uploader (optional).  
- **Upload screen (admin):** Category, title, image picker; submit.

**What to display:**  
- **List:** Thumbnail, title (if any), category chip. Filter chips: "All" + categories from API or fixed set.  
- **Detail:** Full image, title, uploaded by (name), date. Optional: delete if permission.  
- **Upload:** Category dropdown, title field, image picker (camera/gallery); "Upload" button. Progress and success toast.

**UI/UX:**  
- Grid 2–3 columns; skeleton placeholders. Tap thumbnail → detail (full-screen or modal). Swipe to close detail. FAB or header "Add" for upload. Consistent corner radius and spacing.

---

### 8.4 Admin Role Management

**Structure:**  
- **Tabs or segmented control:** "Roles" | "Staff assignment".  
- **Roles:** List of roles → tap → Role detail (permissions list, edit name/description).  
- **Staff assignment:** List of staff → tap → Staff detail (assigned roles, add/remove role).

**What to display:**  
- **Roles list:** Role name, description (one line), permission count.  
- **Role detail:** Role name (editable), description (editable), list of permissions (chips or checkboxes). "Save". Optional: "Delete role".  
- **Staff list:** Search bar; staff name, staff_id, current roles (chips).  
- **Staff detail:** Staff name; "Assigned roles" (chips with remove); "Add role" (picker); "Save".

**UI/UX:**  
- Cards for each role/staff; clear section headers. Destructive actions with confirmation. Loading and empty states. Permission picker as bottom sheet or modal.

---

### 8.5 Password Manager

**Structure:**  
- **Segment:** "Staff" | "Students".  
- **List screen:** Searchable list of staff or students; "Reset password" per row or in detail.  
- **Optional:** "Bulk generate" / "Export credentials" (admin) on same screen or settings.

**What to display:**  
- **Staff list:** Staff name, staff_id; "Reset password" button.  
- **Students list:** Student name, admission_no; "Reset password" button.  
- **Reset flow:** Confirmation dialog → optional new password input or "Generate" → success toast.  
- **Bulk/Export:** Button "Generate all" or "Export"; progress; result (message or file share).

**UI/UX:**  
- Search at top; list with clear rows. Sensitive: optional PIN or re-auth before bulk. Success/error toasts.

---

### 8.6 Staff Management

**Structure:**  
- **Entry:** Staff Management home with shortcuts (Directory, Add Staff, Bulk Import, Bulk Photo, Attendance) or bottom tabs.  
- **Directory:** List → tap → Staff detail (Info, Attendance, optional Permissions).  
- **Add Staff:** Single long form or stepper (personal, contact, role, etc.).  
- **Bulk Import:** File picker → Parse → Preview table → Confirm import.  
- **Bulk Photo:** Upload photos; map to staff_id (list or file naming).  
- **Attendance:** Date picker → list of staff with status (Present/Absent/Leave) → Save.

**What to display:**  
- **Directory:** Avatar, name, staff_id, role. Search and filter (role/department if API supports).  
- **Staff detail:** All staff fields; tabs: Info (edit) | Attendance (calendar or list by date).  
- **Add form:** Name, staff_id, email, phone, role, designation, join_date, etc. Validation; "Save" → "Add another" or "View directory".  
- **Attendance:** Date; list of staff with status chip/dropdown per row; "Save" at bottom.

**UI/UX:**  
- Pull-to-refresh and pagination on directory. Skeleton list. Form with one column and clear labels. Attendance: large tap targets for status. Confirm before bulk import.

---

### 8.7 Classes

**Structure:**  
- **List screen:** Classes overview (class + section, student count, class teacher). Tap → Class detail.  
- **Class detail:** Edit class name/section/year; assign class teacher (staff picker). Optional: Subjects / subject-teachers if API exists.  
- **Add class:** Form (class, section, academic_year, optional class teacher).

**What to display:**  
- **List:** Row per class: "Class 5 A", student count, class teacher name.  
- **Detail:** Class, section, academic_year (editable); class teacher (picker); "Save".  
- **Add:** Class, section, academic_year, class teacher (optional). "Create".

**UI/UX:**  
- Cards or list rows; empty state "No classes". Form: dropdowns or typeahead for class/section/year. Class teacher: searchable staff picker.

---

### 8.8 Students

**Structure:**  
- **List screen:** Directory with search and filters (class, section). Tap → Student detail.  
- **Student detail:** Tabs: Info (view/edit) | Attendance | Fees | Marks (if applicable).  
- **Add student:** Long form or stepper (name, admission_no, class, section, DOB, parent, etc.).  
- **Mark attendance:** Date + class/section picker → list of students → status per student → Save.  
- **Bulk import:** File picker → Parse → Preview → Confirm.  
- **Siblings:** Link siblings from student detail (sibling picker).

**What to display:**  
- **List:** Avatar, name, admission_no, class–section.  
- **Detail:** All student fields; attendance summary or calendar; fee summary; marks summary.  
- **Mark attendance:** One row per student; status: Present / Absent / Leave (and half-day if supported). "Save".

**UI/UX:**  
- Pull-to-refresh; pagination or infinite scroll. Skeleton list. Form with appropriate keyboards. Attendance: one primary action "Save"; confirm if many rows.

---

### 8.9 Timetable

**Structure:**  
- **List screen:** List of classes with "Has timetable" / "View timetable".  
- **Timetable screen:** Grid (days × periods) or day selector + list of periods; each cell = subject + teacher (optional room). Tap cell to edit.  
- **Period groups (optional):** Screen to edit period names and times.

**What to display:**  
- **Class list:** Class name, section, "View timetable", slot count.  
- **Grid:** Rows = periods, columns = days; cell = subject abbreviation + teacher name. Or: select day → list of periods with subject, teacher, room.  
- **Edit:** Subject picker, teacher picker, room (optional). "Save" for day or full timetable.

**UI/UX:**  
- On small screens, prefer day selector + vertical list of periods over full grid. Horizontal scroll for grid if used. Clear "Save" and loading state.

---

### 8.10 Calendar

**Structure:**  
- **Month view:** Calendar with dots/badges on dates that have events. Tap date → day sheet (events list).  
- **Events list (optional):** List view grouped by date.  
- **Event detail:** Title, description, type (event/holiday), date, applicable for. Edit/delete if admin.  
- **Add event:** Form (date, title, description, type, applicable for, optional classes). "Create".

**What to display:**  
- **Calendar:** Month strip or full month; event count or type icon per day.  
- **Day sheet:** List of events (title, type, time if any). Tap → detail.  
- **Event form:** Date, title, description, type (event/holiday), applicable for (all/specific classes), class picker if specific.

**UI/UX:**  
- Use calendar component (e.g. react-native-calendars). Color or icon for event vs holiday. FAB or header "Add" for new event.

---

### 8.11 Examinations

**Structure:**  
- **List screen:** Exams (upcoming, ongoing, completed). Filter by status. Tap → Exam detail.  
- **Exam detail:** Info (name, dates, status) | Schedule (date, class, section, subject, time, room) | link to Marks entry. "Publish" button.  
- **Create exam:** Stepper: (1) Basic info (name, type, year, dates) → (2) Classes → (3) Subjects & max marks → (4) Schedule rows. "Create".

**What to display:**  
- **List:** Exam name, start_date–end_date, status badge (Draft/Published).  
- **Detail:** Same; schedule table; "Publish" with confirm.  
- **Create:** Name, type, academic_year, start_date, end_date; class selection; subject–max_marks; schedule (date, class, section, subject, time, room). "Create" at end.

**UI/UX:**  
- Status with color (e.g. draft = gray, published = green). Stepper with clear steps and validation. Schedule: add row, edit row, remove row.

---

### 8.12 Marks

**Structure:**  
- **Entry:** Exam picker → Class picker → Subject picker → Marks entry screen.  
- **Marks entry screen:** List of students with mark input (and optional grade/remarks). "Submit".  
- **View marks:** Same filters; read-only list or table. Optional: Grade scale screen (min/max/grade).

**What to display:**  
- **Entry:** Student name, roll no, marks (numeric), optional grade/remarks. "Submit" at bottom.  
- **View:** Same columns, read-only. Optional export.  
- **Grade scale:** Rows: min_marks, max_marks, grade. Add/edit in form or inline.

**UI/UX:**  
- Large numeric input for marks; optional grade dropdown. Sticky "Submit"; confirm dialog. Loading and "Saved" state.

---

### 8.13 Fees

**Structure:**  
- **Dashboard:** Cards (Total collected, This month, Pending); "Collect payment" button.  
- **Fee heads:** List of heads; add/edit head (name, optional, amount if fixed).  
- **Fee structures:** List; tap → structure detail (components/heads + amounts). Add structure; assign to class/academic year.  
- **Collect payment:** Student search → select student → Outstanding summary → "Add payment" (amount, mode, date) → Receipt.  
- **Statements:** Student search → per-student dues and payment history.  
- **Reports:** Daily/monthly collection, pending, overdue (list or export).

**What to display:**  
- **Dashboard:** Total collected, This month collection, Pending amount; quick "Collect payment".  
- **Collect:** Student name, outstanding amount; payment amount, mode, date; receipt number after success.  
- **Structures/Heads:** Name, optional flag, amount. List with add/edit.  
- **Statements:** Dues, paid amount, date per payment.

**UI/UX:**  
- All amounts in ₹. Clear labels for payment mode and date. Receipt preview or share after payment. Use cards for dashboard and list for transactions.

---

### 8.14 Library

**Structure:**  
- **Catalogue:** List of books (search, filter by section/type). Tap → Book detail (copies, issue).  
- **Book detail:** Title, author, ISBN, section, type; list of copies (accession_number, status). "Issue" per copy.  
- **Issue:** Borrower (student) picker → copy → due date → "Issue".  
- **Returns:** List of issued transactions or search by student/copy → "Return".  
- **Sections / Material types:** Simple list + add/edit (name).  
- **Add book:** Form (title, author, ISBN, section, type) + "Add copies" (count or accession list).

**What to display:**  
- **Catalogue:** Title, author, "X/Y available".  
- **Detail:** Same + list of copies with status (Available/Issued). "Issue" on copy.  
- **Issue:** Student search, copy, due date. Success toast.  
- **Returns:** Transaction list (student, book, due date); "Return" button.

**UI/UX:**  
- Search and filter chips. Status badges (Available/Issued). Clear "Issue"/"Return" actions. Skeleton for list.

---

### 8.15 Transport

**Structure:**  
- **Routes list:** Route name, vehicle, stop count. Tap → Route detail (stops in order, assign students).  
- **Vehicles:** List; add/edit (number, type, capacity).  
- **Stops:** List; add/edit (name, address).  
- **Route detail:** Stops in order; "Assign students" → student picker + stop picker.  
- **Student assignment list:** Student, route, stop; "Remove" option.

**What to display:**  
- **Routes:** Name, vehicle number, number of stops.  
- **Route detail:** Ordered list of stops; "Assign students" opens student list with route+stop picker.  
- **Vehicles/Stops:** Name, number, capacity/address. Simple form.

**UI/UX:**  
- Clear hierarchy: Route → Stops, Route → Students. Reorder stops if API supports. Search for students when assigning.

---

### 8.16 Leave Management

**Structure:**  
- **Dashboard:** Pending staff/student counts; "Leave types" link; "Recent requests" list.  
- **Leave types:** List; add/edit (name, code, max days, applicable to: staff/student).  
- **Staff requests:** List (filter by status). Tap → Detail with Approve/Reject and comment.  
- **Student requests:** Same. Tap → Detail; Approve/Reject (class teacher or admin).  
- **Optional:** Leave basics (working days).

**What to display:**  
- **Dashboard:** Cards: Pending staff, Pending student; list of recent requests (name, dates, type, status).  
- **Request detail:** Applicant name, leave type, dates, reason, status. "Approve" / "Reject"; comment field.  
- **Leave types:** Name, code, max days, applicable to. List + form.

**UI/UX:**  
- Status chips (Pending/Approved/Rejected) with color. Confirm on Approve/Reject. Tabs or segment for Staff vs Student requests.

---

### 8.17 Communication

**Structure:**  
- **List screen:** Notices (filter by category/status). Tap → Detail (full content).  
- **Detail:** Title, content (full), category, priority, publish date. "Edit" if admin.  
- **Create/Edit:** Form (title, content, category, priority, publish_at). "Save draft" / "Publish".

**What to display:**  
- **List:** Title, category, date, priority badge.  
- **Detail:** Full title and body; category, priority, publish_at.  
- **Form:** Title, content (multiline), category dropdown, priority, publish date picker.

**UI/UX:**  
- Priority color (e.g. High = red). Readable font and line height for content. Pull-to-refresh on list.

---

### 8.18 Reports

**Structure:**  
- **List screen:** One row per report type (Student, Staff, Marks, Examination, Financial, Leave, Timetable, Library, Transport, Staff attendance). Tap → Filter screen.  
- **Filter screen:** Date range, class, exam, etc. "View" or "Export".  
- **View screen (if API returns data):** Table or key metrics; pagination if large. Optional "Export" / "Share".

**What to display:**  
- **Report list:** Icon + report name.  
- **Filters:** Depends on report (e.g. date range, class, exam_id).  
- **Result:** Table or cards; optional download/share button.

**UI/UX:**  
- Simple list of report types. Clear filter form. If table is wide, horizontal scroll or card layout per row.

---

### 8.19 Certificate Management

**Structure:**  
- **List screen:** Issued certificates (student name, certificate title, date). Tap → View certificate (image/PDF).  
- **Issue new:** Student picker → Template picker → Fill placeholders → "Generate" → Preview → "Issue" or "Download".  
- **Templates:** List of templates; add/edit (name, layout/placeholders).  
- **Bulk:** Select multiple students + template → Generate all.

**What to display:**  
- **List:** Student name, certificate title, date.  
- **View:** Certificate image/PDF; "Share"/"Download".  
- **Issue form:** Student, template, dynamic fields (name, class, date, etc.). Preview before issue.

**UI/UX:**  
- Cards for list. Preview in modal or full screen. Loading during generate. Success toast and optional share.

---

### 8.20 Digital Diary (Homework)

**Structure:**  
- **List screen:** Diary entries (filter by type/class). Tap → Detail (content + attachments).  
- **Detail:** Title, content, type, due date, target classes, attachments; read count if API provides. "Edit" if admin.  
- **Create:** Form (title, content, type, target class–section multi-select, due date, attachments). "Publish".

**What to display:**  
- **List:** Title, type, due date, target classes, read count (e.g. "X/Y read").  
- **Detail:** Full content; list of attachments (tap to open).  
- **Form:** Title, content, type, target classes (chips), due date, "Add attachment".

**UI/UX:**  
- Chips for target classes. Read count prominent if available. Attachments as list with icon and filename.

---

### 8.21 Expense/Income

**Structure:**  
- **Dashboard:** Total income, total expense, balance; optional monthly chart. "Add income" / "Add expense".  
- **Income list:** Date range filter; list of entries (date, amount, category, description). Tap → Edit. FAB "Add".  
- **Expense list:** Same.  
- **Add/Edit entry:** Date, amount, category, description, payee. "Save".

**What to display:**  
- **Dashboard:** Cards: Total income, Total expense, Balance (income − expense). Optional bar chart by month.  
- **Lists:** Date, amount, category, description.  
- **Form:** Date picker, amount (numeric), category dropdown, description, payee (optional).

**UI/UX:**  
- Color: income = green, expense = red. Rupee formatting. FAB or header "Add". Pull-to-refresh on lists.

---

### 8.22 Front Office Management

**Structure:**  
- **Tabs:** "Gate pass" | "Visitors".  
- **Gate pass:** List (filter by date); "New pass" → Form (person type, name, class if student, reason, date, time out, expected return, approved by). List row: name, reason, time out, status ("Returned" if applicable).  
- **Visitors:** List (filter In/Out). "Check in" → Form (name, phone, purpose, person to meet). List row: name, purpose, time in, time out; "Check out" button.

**What to display:**  
- **Gate pass:** Person name, reason, time out, expected return, status.  
- **Visitors:** Name, purpose, check-in time, check-out time, status.  
- **Forms:** As above; "Submit" / "Check in" / "Check out".

**UI/UX:**  
- "In"/"Out" badges with color. Time in HH:mm. Confirm on Check out. List sorted by date/time.

---

### 8.23 Copy Checking

**Structure:**  
- **Filters:** Class, Section, Subject, Date, Work type (Class work / Homework). "Load" → List of students with check status.  
- **List screen:** One row per student (name, roll no, status: Checked/Pending). Tap to toggle or "Mark checked". Optional remarks per student. "Save".

**What to display:**  
- **Filters:** Class, section, subject, date, work type.  
- **List:** Student name, roll number, status (Checked/Pending), optional remarks.  
- **Actions:** Toggle or "Mark checked"; "Save" at bottom.

**UI/UX:**  
- Large tap targets for status. Optional remarks in expandable row or modal. Confirm before "Save" if many rows. Skeleton while loading list.

---

## 9. Summary: Module → Screens and Primary Display

| Module                | Main screens / sections                    | Primary display |
|-----------------------|--------------------------------------------|-----------------|
| Home                  | Header + Stats + Module grid               | 4 stat cards, 23 module cards |
| Institute Info        | Single form (sections)                     | Basic info, Address, Principal, Academic |
| Gallery               | List (grid) → Detail → Upload              | Thumbnails, full image, upload form |
| Admin Role Management | Roles list/detail; Staff assignment        | Roles + permissions; staff + roles |
| Password Manager      | Staff list; Students list; Reset/Bulk      | Name, id; Reset; Export/Generate |
| Staff Management      | Directory → Detail; Add; Import; Photo; Attendance | List; form; attendance rows |
| Classes               | List → Detail; Add                         | Class–section, count, teacher; form |
| Students              | Directory → Detail; Add; Mark attendance; Import | List; form; attendance rows |
| Timetable             | Class list → Grid/period list; Period groups | Days × periods; subject + teacher |
| Calendar              | Month view → Day sheet → Event detail; Add | Calendar; events list; form |
| Examinations          | List → Detail (schedule); Create (stepper) | Exam card; schedule table; stepper |
| Marks                 | Exam/class/subject → Entry; View; Grade scale | Student rows + marks; read-only; scale |
| Fees                  | Dashboard; Heads; Structures; Collect; Statements; Reports | Cards; lists; payment form; receipt |
| Library               | Catalogue → Book detail; Issue; Returns; Sections/Types | Books; copies; issue/return forms |
| Transport             | Routes → Detail (stops, students); Vehicles; Stops | Route card; stop order; assignment |
| Leave Management      | Dashboard; Types; Staff/Student requests  | Pending counts; request list; approve/reject |
| Communication         | List → Detail; Create/Edit                 | Notice card; full content; form |
| Reports               | Report types → Filters → View/Export       | Report list; filters; table/file |
| Certificate Management| List → View; Issue; Templates             | Certificate card; preview; form |
| Digital Diary         | List → Detail; Create                      | Entry card; content + attachments; form |
| Expense/Income        | Dashboard; Income list; Expense list; Add/Edit | Cards; entry list; form |
| Front Office          | Gate pass list/form; Visitors list/check-in/out | Pass row; visitor row; forms |
| Copy Checking         | Filters → Student list (status + remarks)  | Filter bar; student rows; Save |

---

This document is the single reference for **table structures**, **data flow**, **sidebar/modules**, and **mobile UI/UX and module structure** for the dashboard page and all admin modules.
