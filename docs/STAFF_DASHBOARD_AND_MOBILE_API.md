# Staff (Teacher) Dashboard — Compulsory Modules & In-Depth Guide

This document first **lists all compulsory modules** in the Teacher Portal dashboard menu, then describes **each module in depth**: how it works, what is displayed, which **tables** and **APIs** are used.

**Audience:** Developers building a mobile app or recreating the staff dashboard; technical reference for every compulsory screen.

---

## Teacher Portal — Dashboard Menu (Compulsory Modules)

These are the **permanent (compulsory)** menu items in the teacher dashboard. Visibility for some items depends on **class teacher** status (see per-module notes).

### Core
| # | Menu item    | Route |
|---|--------------|--------|
| 1 | Home         | `/teacher/dashboard` |

### Academics
| # | Menu item         | Route | Class teacher only? |
|---|-------------------|--------|----------------------|
| 2 | Mark Attendance   | `/teacher/dashboard/attendance` | Yes |
| 3 | My Attendance     | `/teacher/dashboard/attendance-staff` | No |
| 4 | Marks Entry       | `/teacher/dashboard/marks` | Yes |
| 5 | Examinations      | `/teacher/dashboard/examinations` | No |
| 6 | My Class          | `/teacher/dashboard/my-class` | Yes |
| 7 | Classes           | `/teacher/dashboard/classes` | No |
| 8 | Academic Calendar | `/teacher/dashboard/calendar` | No |
| 9 | Digital Diary     | `/teacher/dashboard/homework` | No |
| 10| Copy Checking     | `/teacher/dashboard/copy-checking` | No |

### Leave & Requests
| # | Menu item              | Route | Class teacher only? |
|---|------------------------|--------|----------------------|
| 11| Apply for Leave        | `/teacher/dashboard/apply-leave` | No |
| 12| My Leaves              | `/teacher/dashboard/my-leaves` | No |
| 13| Student Leave Approvals| `/teacher/dashboard/student-leave-approvals` | Yes |

### Information
| # | Menu item            | Route |
|---|----------------------|--------|
| 15| Library              | `/teacher/dashboard/library` |
| 16| Certificate Management | `/teacher/dashboard/certificates` |
| 17| Gallery              | `/teacher/dashboard/gallery` |
| 18| Staff Information    | `/teacher/dashboard/staff-management/directory` |
| 19| Communication        | `/teacher/dashboard/communication` |

### Account & Institute
| # | Menu item    | Route |
|---|--------------|--------|
| 24| Institute Info | `/teacher/dashboard/institute-info` |
| 25| Settings     | `/teacher/dashboard/settings` |
| 26| Change Password | `/teacher/dashboard/change-password` |

---

## In-Depth: Each Compulsory Module

For each module below: **route**, **purpose**, **how it works**, **what is displayed**, **tables used**, and **APIs used**.

---

### 1. Home

- **Route:** `/teacher/dashboard`
- **Purpose:** Main dashboard after login: overview of assigned class(es), attendance, exams, notices, timetable, todos, and quick actions.

**How it works**
- On load, teacher is read from `sessionStorage`. Multiple API calls run in parallel: students list, **classes where teacher is class teacher** (`/api/classes/teacher` with `array=true`), timetable slots, grade distribution, todos, daily agenda, **staff attendance** for the teacher (date range), **examinations** for the teacher, notices, calendar notifications, **staff-subjects** (assigned subjects), and optionally **student leave requests** (pending) for the first assigned class.
- If the teacher is class teacher of at least one class, the first class is set as “assigned class” and **students of that class** are fetched for “My class students” section.
- Teacher can add/complete/delete **todos**; these persist and appear in Daily Agenda.

**What is displayed**
- **Header:** School name, teacher context.
- **Assigned class card:** Class name, section, student count; link to My Class.
- **My class students:** List/count of students in the assigned class (if class teacher).
- **Attendance:** Teacher’s own attendance stats (e.g. percentage, present/total) for a date range; link to My Attendance.
- **Upcoming exams:** Count and/or list; link to Examinations.
- **Notices:** Recent notices (e.g. 5); link to Communication.
- **Event notifications:** Unread calendar events.
- **Grade distribution:** A–B, C–D, below E, pass rate (for teacher’s context).
- **Daily agenda:** Merged timetable slots + todos for the day (time-ordered).
- **Todos:** List with add/toggle complete/delete.
- **Student leave requests:** Pending count/list for class teacher; link to Student Leave Approvals.
- **Assigned subjects:** List of subjects the teacher teaches (from staff_subjects).
- **Assigned classes from timetable:** Classes derived from timetable slots (for non–class teachers too).

**Tables used (via APIs)**  
`students`, `classes`, `timetable_slots` (or equivalent), `staff_attendance`, `examinations` (+ exam-related), `notices` / communication, `events` / academic_calendar, `staff_subjects`, `student_leave_requests`, `teacher_todos` (or equivalent), grade/marks aggregates.

**APIs used**
| Method | API | Purpose |
|--------|-----|--------|
| GET | `/api/students?school_code=` | All students (school) |
| GET | `/api/classes/teacher?school_code=&teacher_id=&staff_id=&array=true` | Classes where teacher is class teacher |
| GET | `/api/timetable/slots?school_code=&teacher_id=` | Teacher’s timetable slots |
| GET | `/api/teacher/grade-distribution?school_code=&teacher_id=` | Grade distribution |
| GET | `/api/teacher/todos?school_code=&teacher_id=&status=pending,in_progress` | Todos |
| POST/PATCH/DELETE | `/api/teacher/todos`, `/api/teacher/todos/:id` | Create/update/delete todo |
| GET | `/api/timetable/daily-agenda?school_code=&teacher_id=` | Daily agenda (slots + todos) |
| GET | `/api/attendance/staff?school_code=&staff_id=&start_date=&end_date=` | Teacher’s attendance |
| GET | `/api/examinations/v2/teacher?school_code=&teacher_id=` | Exams for teacher |
| GET | `/api/communication/notices?school_code=&status=Active&...&limit=5` | Recent notices |
| GET | `/api/calendar/notifications?school_code=&user_type=teacher&user_id=&unread_only=true` | Event notifications |
| GET | `/api/staff-subjects/:teacherId?school_code=` | Assigned subjects |
| GET | `/api/students?school_code=&class=&section=` | Students of a class (for “my class”) |
| GET | `/api/leave/student-requests?school_code=&status=pending` | Pending student leave requests |

---

### 2. Mark Attendance

- **Route:** `/teacher/dashboard/attendance`
- **Purpose:** Class teacher marks daily attendance (present/absent/late) for students of their assigned class(es).
- **Visibility:** Shown only if the teacher is a **class teacher** (otherwise a message: “Not assigned as class teacher”).

**How it works**
- On load, **classes** where the teacher is class teacher are fetched (`/api/classes/teacher` with `array=true`). If none, the page shows “Not assigned as class teacher” and stops.
- User selects **class** (if more than one) and **date**. For that class, **students** are fetched. Then **existing attendance** for that class and date is fetched. If records exist, each student’s status is shown and can be edited; otherwise all default to “present” and user can change per student.
- User clicks **Save**: either `POST /api/attendance/mark` (first time) or `PATCH /api/attendance/update` (already marked). Request body includes `school_code`, `class_id`, `attendance_date`, `attendance_records: [{ student_id, status }]`, `marked_by` (teacher id).

**What is displayed**
- Title “Class Attendance” / “Mark Attendance”.
- **Class dropdown** (if multiple classes).
- **Date picker** (default today; cannot future date).
- **Summary counts:** Present, Absent, Late.
- **Student list:** Each row = student name/roll, with **status buttons** (Present / Absent / Late). Bulk actions (e.g. “Mark all present”).
- **Save** button; success feedback.

**Tables used**  
`classes`, `students`, `student_attendance`, `staff` (for marked_by name).

**APIs used**
| Method | API | Purpose |
|--------|-----|--------|
| GET | `/api/classes/teacher?school_code=&teacher_id=&staff_id=&array=true` | Teacher’s classes |
| GET | `/api/attendance/class?class_id=&date=&school_code=` | Existing attendance for class+date |
| GET | `/api/students?school_code=&class=&section=` | Students of selected class |
| POST | `/api/attendance/mark` | Mark attendance (first time) |
| PATCH | `/api/attendance/update` | Update already marked attendance |

---

### 3. My Attendance

- **Route:** `/teacher/dashboard/attendance-staff`
- **Purpose:** Teacher views their **own** attendance records for a date range.

**How it works**
- Teacher id from session. User selects **start date** and **end date**. API returns all staff-attendance rows for that staff and range. Page computes stats (total days, present, absent, late, leave, percentage) and shows a list of daily records.

**What is displayed**
- Title “My Attendance”, subtitle “View your attendance records”.
- **Date range:** Start date, End date (inputs).
- **Stats card:** Total days, Present, Absent, Late, Leave, **Attendance %**.
- **List:** One row per day: date, status (present/absent/late/half_day/leave/holiday), check-in/check-out if available, remarks. Status shown with icon and color.

**Tables used**  
`staff_attendance`, `staff` (join for staff info), `accepted_schools` (school lookup).

**APIs used**
| Method | API | Purpose |
|--------|-----|--------|
| GET | `/api/attendance/staff?school_code=&staff_id=&start_date=&end_date=` | Staff attendance in range |

---

### 4. Marks Entry

- **Route:** `/teacher/dashboard/marks`
- **Purpose:** Class teacher (or subject teacher) enters or edits **exam marks** for students. Supports selecting exam → class → students and entering marks per subject; can submit/lock.
- **Visibility:** Menu item is shown only for **class teachers** (and subject teachers via role); page may still be used if teacher has exams assigned.

**How it works**
- **Exams** for the teacher are fetched (`/api/examinations/v2/teacher`). User selects an **exam**. For that exam, if the teacher is class teacher, the **class** is auto-selected from exam’s class mappings; otherwise user selects class. For selected class, **students** and **subject mappings** (subjects, max_marks, pass_marks) for that exam are loaded. For each student and each subject, **existing marks** are fetched (`/api/examinations/marks?exam_id=&student_id=`). Page shows a grid: rows = students, columns = subjects; cells are inputs (marks, absent checkbox). **Save** writes to `POST /api/examinations/marks`; **Submit** calls `POST /api/examinations/marks/submit` (lock). Marks status (locked or not) is checked via `/api/examinations/marks/status`.

**What is displayed**
- **Exam selector** (dropdown or cards).
- **Class selector** (if multiple classes in exam).
- **Search** for student name/roll.
- **Table/grid:** Rows = students (admission_no, name, roll); columns = subjects (with max_marks); cells = marks obtained + absent. Total/percentage may be computed client-side.
- **Save** and **Submit** (lock) buttons; lock state and success/error messages.

**Tables used**  
`examinations`, examination class/subject mappings, `classes`, `students`, `examination_marks` (or equivalent), marks submission/lock state.

**APIs used**
| Method | API | Purpose |
|--------|-----|--------|
| GET | `/api/examinations/v2/teacher?school_code=&teacher_id=` | Exams for teacher |
| GET | `/api/classes/teacher?school_code=&teacher_id=&staff_id=` | Teacher’s class (for auto-select) |
| GET | `/api/classes?school_code=&id=` | Class details by id |
| GET | `/api/students?school_code=&class=&section=&status=active` | Students in class |
| GET | `/api/examinations/marks?exam_id=&student_id=` | Marks for one student (all subjects) |
| GET | `/api/examinations/marks/status?exam_id=&student_id=` | Lock status |
| POST | `/api/examinations/marks` | Save marks (body: exam_id, student_id, subject marks, etc.) |
| POST | `/api/examinations/marks/submit` | Submit/lock marks |

---

### 5. Examinations

- **Route:** `/teacher/dashboard/examinations`
- **Purpose:** List **examinations** relevant to the teacher (by assignment/class/subject). Teacher can open an exam to see details or go to marks entry.

**How it works**
- On load, `GET /api/examinations/v2/teacher?school_code=&teacher_id=` (and optionally `staff_id`). Response is filtered client-side to show upcoming, ongoing, active, or completed. List is sorted by start date. Optionally grouped by date for a date-wise view.

**What is displayed**
- Title “Examinations”.
- **List of exam cards:** Each card shows exam name, academic year, start date, end date, status (e.g. Upcoming/Ongoing/Completed). Optional: subject mappings (subject names, max/pass marks). **Action:** “View” or “Enter marks” linking to exam detail or marks entry (e.g. `/teacher/dashboard/marks?exam_id=...` or exam detail page).

**Tables used**  
`examinations`, exam–class and exam–subject mappings, related subject/class tables.

**APIs used**
| Method | API | Purpose |
|--------|-----|--------|
| GET | `/api/examinations/v2/teacher?school_code=&teacher_id=` | Examinations for teacher |

---

### 6. My Class

- **Route:** `/teacher/dashboard/my-class`
- **Purpose:** Class teacher sees **their** assigned class(es) and list of students in each class.
- **Visibility:** Shown only if the teacher is a **class teacher**. Otherwise: “You are not assigned as a class teacher.”

**How it works**
- **Classes** where teacher is class teacher: `GET /api/classes/teacher` (with `teacher_id` and/or `staff_id`). If empty, show “not class teacher” message. Otherwise show first class (or dropdown to switch). For selected class, **students** are fetched: `GET /api/students?school_code=&class=&section=&status=active`. Optional: timetable for that class (e.g. from timetable API) can be shown on the same page.

**What is displayed**
- **Class selector:** Dropdown or tabs (Class – Section, optional academic year). If single class, no selector.
- **Student list:** Search by name/admission no/roll; table or cards: admission_no, student name, roll, parent name, etc. Optional: link to student profile or fees/transport.
- Optional: **Timetable** for the class (if API supports it).

**Tables used**  
`classes`, `students`.

**APIs used**
| Method | API | Purpose |
|--------|-----|--------|
| GET | `/api/classes/teacher?school_code=&teacher_id=&staff_id=&array=true` | Teacher’s classes |
| GET | `/api/students?school_code=&class=&section=&status=active` | Students in selected class |

---

### 7. Classes

- **Route:** `/teacher/dashboard/classes`
- **Purpose:** View **all classes** in the school (read-only list) and see student count per class. Not restricted to class teacher.

**How it works**
- `GET /api/classes?school_code=`. For each class (or on expand), student count can be fetched via same API or a students count endpoint. No edit from this page.

**What is displayed**
- Title “Classes”.
- **List of classes:** Class name, section, academic year, **student count**. Optional: expand to show list of students (same as students API by class/section).

**Tables used**  
`classes`, `students` (for count or list).

**APIs used**
| Method | API | Purpose |
|--------|-----|--------|
| GET | `/api/classes?school_code=` | All classes |
| GET | `/api/students?school_code=&class=&section=&academic_year=` | Students in a class (for count or list) |

---

### 8. Academic Calendar

- **Route:** `/teacher/dashboard/calendar`
- **Purpose:** View **academic calendar and events** (holidays, events) in a month/year view.

**How it works**
- User selects **academic year** (e.g. 2024–25). `GET /api/calendar/academic?school_code=&academic_year=`. Response is a list of events (event_date, title, event_type, description). Page builds a calendar grid for the selected month; dates with events are highlighted. Clicking a date shows events for that day.

**What is displayed**
- **Year selector** (and optionally month).
- **Calendar grid:** Month view with weekdays; each day cell may show event indicators or count.
- **Selected date panel:** List of events for that date (title, type, description).

**Tables used**  
`events` and/or `academic_calendar` (or equivalent calendar/events table).

**APIs used**
| Method | API | Purpose |
|--------|-----|--------|
| GET | `/api/calendar/academic?school_code=&academic_year=` | Events / academic calendar entries |

---

### 9. Digital Diary

- **Route:** `/teacher/dashboard/homework`
- **Purpose:** Create and manage **diary entries** (homework, assignment, notice, other) for classes; optional attachments.

**How it works**
- **Academic years** are fetched: `GET /api/classes/academic-years?school_code=`. User selects year. **Diary list** is fetched: `GET /api/diary?school_code=&academic_year_id=&page=&limit=`. Optional: **stats** (e.g. total count) `GET /api/diary/stats?school_code=&academic_year_id=`. User can **create** diary (title, content, type, target classes) via `POST /api/diary`; **edit** via `PUT /api/diary/:id`; **delete** via `DELETE /api/diary/:id`. Attachments: `POST /api/diary/upload`. Targets (classes/sections) are sent in the diary payload.

**What is displayed**
- **Academic year** dropdown.
- **List of diary entries:** Card per entry: title, type badge (Homework/Assignment/Notice/Other), content snippet, target classes, attachment count, read count, “time ago”. Actions: Edit, Delete, View.
- **Create/Edit form (modal or page):** Title, content (rich text or textarea), type, target classes (multi-select), file attachments. Save/Cancel.
- **Pagination** (page, limit).

**Tables used**  
`diaries`, `diary_targets`, `diary_attachments`, `diary_reads`, `accepted_schools`, `classes` (for target list).

**APIs used**
| Method | API | Purpose |
|--------|-----|--------|
| GET | `/api/classes/academic-years?school_code=` | Academic years |
| GET | `/api/diary?school_code=&academic_year_id=&page=&limit=` | Diary list |
| GET | `/api/diary/stats?school_code=&academic_year_id=` | Diary stats |
| GET | `/api/diary/:id` | Single diary (for edit) |
| POST | `/api/diary` | Create diary |
| PUT | `/api/diary/:id` | Update diary |
| DELETE | `/api/diary/:id` | Delete diary |
| POST | `/api/diary/upload` | Upload attachment |

---

### 10. Copy Checking

- **Route:** `/teacher/dashboard/copy-checking`
- **Purpose:** View **classes and timetable** the teacher is assigned to (for copy-checking context). Read-only; no separate “copy checking” submission in the current flow—it’s informational.

**How it works**
- **Teacher’s classes:** `GET /api/classes/teacher?school_code=&teacher_id=&staff_id=&array=true`. **Teacher’s timetable:** `GET /api/timetable/slots?school_code=&teacher_id=`. Page shows which classes and slots the teacher has; useful to know which copies (subjects/classes) to check.

**What is displayed**
- Title “Copy Checking”.
- **Classes** the teacher is class teacher of (or teaches).
- **Timetable:** Day-wise slots (subject, class, time, room, etc.) so teacher can see their teaching schedule for copy checking reference.

**Tables used**  
`classes`, `timetable_slots`, class/subject references.

**APIs used**
| Method | API | Purpose |
|--------|-----|--------|
| GET | `/api/classes/teacher?school_code=&teacher_id=&staff_id=&array=true` | Teacher’s classes |
| GET | `/api/timetable/slots?school_code=&teacher_id=` | Teacher’s timetable slots |

---

### 11. Apply for Leave

- **Route:** `/teacher/dashboard/apply-leave`
- **Purpose:** Staff **submit a leave request** (type, start/end date, reason, comment).

**How it works**
- **Leave types** for the school: `GET /api/leave/types?school_code=`. User fills form: leave type, start date, end date, reason, optional comment. Client may validate max days per type (if returned by leave types). **Submit:** `POST /api/leave/requests` with body: `school_code`, `staff_id` (teacher id), `leave_type_id`, `leave_start_date`, `leave_end_date`, `reason`, `comment`.

**What is displayed**
- Title “Apply for Leave”.
- **Form:** Leave type (dropdown), Start date, End date, Reason (required), Comment. Day count display. Submit button.
- Success/error message after submit.

**Tables used**  
`leave_types`, `staff_leave_requests`, `staff`, `accepted_schools`.

**APIs used**
| Method | API | Purpose |
|--------|-----|--------|
| GET | `/api/leave/types?school_code=` | Leave types |
| POST | `/api/leave/requests` | Create leave request (body: school_code, staff_id, leave_type_id, leave_start_date, leave_end_date, reason, comment) |

---

### 12. My Leaves

- **Route:** `/teacher/dashboard/my-leaves`
- **Purpose:** View **list of own leave requests** and **withdraw** a request if allowed.

**How it works**
- **Leave types:** `GET /api/leave/types?school_code=`. **My requests:** `GET /api/leave/requests?school_code=&staff_id=`. Each request shows type, dates, reason, status (pending/approved/rejected). **Withdraw:** `POST /api/leave/requests/:id/withdraw` (if status allows).

**What is displayed**
- Title “My Leaves”.
- **List of leave requests:** Card or table: leave type, start date, end date, days, reason, status (badge). Action: Withdraw (if pending).
- Optional: filters by status or date range.

**Tables used**  
`leave_types`, `staff_leave_requests`, `staff`.

**APIs used**
| Method | API | Purpose |
|--------|-----|--------|
| GET | `/api/leave/types?school_code=` | Leave types |
| GET | `/api/leave/requests?school_code=&staff_id=` | Staff’s leave requests |
| POST | `/api/leave/requests/:id/withdraw` | Withdraw request |

---

### 13. Student Leave Approvals

- **Route:** `/teacher/dashboard/student-leave-approvals`
- **Purpose:** **Class teacher** approves or rejects **student leave requests** for their class(es).
- **Visibility:** Shown only for **class teachers**.

**How it works**
- **Pending requests** for classes where the teacher is class teacher: `GET /api/leave/student-requests/class-teacher?school_code=&...` (params may include class/section or teacher id). List shows student name, class, section, leave type, dates, reason. **Approve/Reject:** `POST /api/leave/student-requests/:id/class-teacher-approval` with body e.g. `{ status: 'approved' | 'rejected', remarks? }`.

**What is displayed**
- Title “Student Leave Approvals”.
- **List of pending requests:** Student name, admission no, class, section, leave type, start/end date, reason. Actions: Approve, Reject (with optional remarks).
- Optional: filter by status (pending/approved/rejected).

**Tables used**  
`student_leave_requests`, `students`, `classes`, `leave_types`.

**APIs used**
| Method | API | Purpose |
|--------|-----|--------|
| GET | `/api/leave/student-requests/class-teacher?school_code=&...` | Pending student leave for class teacher’s classes |
| POST | `/api/leave/student-requests/:id/class-teacher-approval` | Approve/reject (body: status, remarks?) |

---

### 15. Library

- **Route:** `/teacher/dashboard/library`
- **Purpose:** View **library books** (catalogue) for the school. Read-only in teacher portal.

**How it works**
- `GET /api/library/books?school_code=`. Response is list of books (title, author, ISBN, availability, etc.). Page may support search/filter client-side.

**What is displayed**
- Title “Library”.
- **Book list:** Table or cards: title, author, ISBN, category, availability (e.g. Available/Issued). Optional: search and filters.

**Tables used**  
`books` or library catalogue table, possibly `library_transactions` for availability.

**APIs used**
| Method | API | Purpose |
|--------|-----|--------|
| GET | `/api/library/books?school_code=` | List books |

---

### 16. Certificate Management

- **Route:** `/teacher/dashboard/certificates`
- **Purpose:** View and **create/issue certificates** for students (e.g. bonafide, conduct). Teacher selects class/section and students, fills template, can upload/generate.

**How it works**
- **Teacher’s classes:** `GET /api/classes/teacher?...` (optional, to restrict to own class). **Students:** `GET /api/students?school_code=&class=&section=`. **Certificate list/templates:** `GET /api/certificates/simple?school_code=`. **Create/upload:** `POST /api/certificates/simple/upload` (or similar) with certificate type, student, data, optional file.

**What is displayed**
- Title “Certificate Management”.
- **Class/section** selector (optional).
- **Student list** (for selecting recipient).
- **Certificate type** and form (fields depend on type). **Upload** or **Generate** certificate.
- List of **issued certificates** (if API returns them).

**Tables used**  
`classes`, `students`, `certificates` (or certificate templates and issued certificates).

**APIs used**
| Method | API | Purpose |
|--------|-----|--------|
| GET | `/api/classes/teacher?...` | Teacher’s classes |
| GET | `/api/students?school_code=&class=&section=` | Students |
| GET | `/api/certificates/simple?school_code=` | Certificate types / list |
| POST | `/api/certificates/simple/upload` | Create/upload certificate |

---

### 17. Gallery

- **Route:** `/teacher/dashboard/gallery`
- **Purpose:** View **school gallery** (images/albums). Read-only.

**How it works**
- `GET /api/gallery?school_code=&category=` (category optional). Response: list of images or albums. Page displays grid of images; optional category filter.

**What is displayed**
- Title “Gallery”.
- **Category filter** (if supported).
- **Image grid:** Thumbnails; click to enlarge or view album.

**Tables used**  
Gallery/media table (e.g. `gallery`, `gallery_albums`, `gallery_images`).

**APIs used**
| Method | API | Purpose |
|--------|-----|--------|
| GET | `/api/gallery?school_code=&category=` | Gallery images/albums |

---

### 18. Staff Information

- **Route:** `/teacher/dashboard/staff-management/directory`
- **Purpose:** View **directory of staff** in the school (name, role, contact, etc.). Read-only.

**How it works**
- `GET /api/staff?school_code=`. List of staff with basic info. Optional search/filter by name, role, department.

**What is displayed**
- Title “Staff Information” / “Staff Directory”.
- **Staff list:** Name, staff_id, role, designation, email, phone (if allowed). Optional: photo, department. Search box.

**Tables used**  
`staff`.

**APIs used**
| Method | API | Purpose |
|--------|-----|--------|
| GET | `/api/staff?school_code=` | All staff |

---

### 19. Communication

- **Route:** `/teacher/dashboard/communication`
- **Purpose:** View **notices and circulars** published by the school.

**How it works**
- `GET /api/communication/notices?school_code=&status=Active&category=all&priority=all` (optional limit). List of notices; click to read full content.

**What is displayed**
- Title “Communication”.
- **Notice list:** Title, category, priority, date, snippet. Click to open **detail** (full body, attachments if any).

**Tables used**  
Notices/circulars table (e.g. `notices`, `communication`).

**APIs used**
| Method | API | Purpose |
|--------|-----|--------|
| GET | `/api/communication/notices?school_code=&status=Active&category=all&priority=all` | Notices list |

---

### 24. Institute Info

- **Route:** `/teacher/dashboard/institute-info`
- **Purpose:** View **school/institute details** (name, address, contact, principal, etc.). Read-only in teacher portal.

**How it works**
- `GET /api/schools/accepted`. Find school by `school_code` from session. Display fields from the accepted_school record.

**What is displayed**
- Title “Institute Info”.
- **Cards/sections:** School name, code, address, city, state, pin; principal name, email, phone; established year, type, affiliation; contact details.

**Tables used**  
`accepted_schools` (or equivalent).

**APIs used**
| Method | API | Purpose |
|--------|-----|--------|
| GET | `/api/schools/accepted` | School list (match by school_code) |

---

### 25. Settings

- **Route:** `/teacher/dashboard/settings`
- **Purpose:** View and **edit profile** (name, email, phone, etc.) and **profile photo**; optionally **change password** (or link to Change Password page).

**How it works**
- **Profile:** `GET /api/staff/:teacherId` to load; `PATCH /api/staff/:teacherId` to update. **Photo:** `GET /api/staff/photos/self` (current photo); upload/update via API if available (e.g. `POST /api/staff/photos/self` or similar). **Change password:** Often a separate page; see below.

**What is displayed**
- **Profile form:** Full name, email, phone, designation, etc. Save button.
- **Profile photo:** Current image; option to upload new photo.
- Link or section for “Change Password”.

**Tables used**  
`staff`, staff photo storage.

**APIs used**
| Method | API | Purpose |
|--------|-----|--------|
| GET | `GET /api/staff/:teacherId` | Load profile |
| PATCH | `PATCH /api/staff/:teacherId` | Update profile |
| GET | `GET /api/staff/photos/self` | Current photo |
| POST | `POST /api/staff/change-password` | Change password (if on same page) |

---

### 26. Change Password

- **Route:** `/teacher/dashboard/change-password`
- **Purpose:** Staff **change their password** (current password + new password).

**How it works**
- Form: current password, new password, confirm new password. **Submit:** `POST /api/staff/change-password` with body: `school_code`, `staff_id` (or identifier), `current_password`, `new_password`. Backend validates against `staff_login` and updates hash.

**What is displayed**
- Title “Change Password”.
- **Form:** Current password, New password, Confirm new password (all masked). Submit button. Success/error message.

**Tables used**  
`staff_login`, `staff`.

**APIs used**
| Method | API | Purpose |
|--------|-----|--------|
| POST | `/api/staff/change-password` | Change password (body: school_code, staff_id, current_password, new_password) |

---

## Authentication (Teacher Login)

- **Route:** `/teacher/login` (or `/staff/login`)
- **API:** `POST /api/auth/teacher/login`
- **Body:** `school_code`, `staff_id` (or login id), `password`
- **Success:** Returns staff object (`id`, `staff_id`, `school_code`, `full_name`, `role`, `designation`, etc.). Store in session; set `role = 'teacher'`, `teacher_authenticated = '1'`.
- **Table:** `staff_login` (credentials), `staff` (profile).

---

## Class Teacher Check (Used for Menu Visibility)

- **API:** `GET /api/classes/teacher?school_code=...&teacher_id=...&staff_id=...&array=true`
- **Returns:** `{ data: [ classes ] }` if the teacher is class teacher of at least one class; otherwise `{ data: [] }` or `data: null`.
- **Tables:** `classes` (filter by `class_teacher_id` or `class_teacher_staff_id`).
- **Menu items that require class teacher:** Mark Attendance (2), Marks Entry (4), My Class (6), Student Leave Approvals (13). These are hidden if the class-teacher API returns no classes.

---

This completes the list of **compulsory modules** and the **in-depth** description of how each works, what is displayed, and which **tables** and **APIs** are used. Use this for the mobile app or to rebuild the teacher dashboard.
