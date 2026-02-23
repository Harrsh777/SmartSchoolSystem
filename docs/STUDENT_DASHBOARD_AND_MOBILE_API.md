# Student Dashboard – In-Depth Guide & Mobile API Reference

This document describes how the **Student Portal** (web dashboard) works: menu structure, routing, how each module fetches data, and the **APIs** used. Use it to build a **mobile app** that reuses the same backend.

---

## 1. Authentication & Session

### 1.1 Login

- **Path:** `/student/login`
- **API:** `POST /api/auth/student/login`
- **Body:** `{ school_code, admission_no, password }`
- **Response (success):** `{ success: true, student: { id, admission_no, student_name, class, section, academic_year, school_code, photo_url, parent_name, parent_phone, parent_email, ... } }`
- **Response (failure):** `{ success: false, error: "..." }`

After successful login, the web app stores the **student** object in `sessionStorage` under the key `"student"` and sets `sessionStorage.setItem('role', 'student')`. The mobile app should do the same (or use secure storage) and send `school_code` and `student_id` ( = `student.id`) on every API call that needs them.

### 1.2 Logout

- **API:** `POST /api/auth/logout` (optional; clears server session)
- **Client:** Clear `sessionStorage` (and local token if any). Redirect to `/student/login` or your mobile login screen.

### 1.3 401 handling

The web app uses an API interceptor (`lib/api-interceptor`) that on **401** clears session and redirects to login. The mobile app should treat 401 as “session expired” and redirect to login.

---

## 2. Menu Structure & Routes

The student dashboard menu is **grouped by module**. Below are the **exact paths** and which **API(s)** each screen uses.

| Label                 | Path                                   | Module            |
|-----------------------|----------------------------------------|-------------------|
| Home                  | `/student/dashboard`                   | —                 |
| My Class              | `/student/dashboard/class`            | Academics         |
| Attendance            | `/student/dashboard/attendance`       | Academics         |
| Examinations          | `/student/dashboard/examinations`      | Academics         |
| Marks                 | `/student/dashboard/marks`            | Academics         |
| Report Card           | `/student/dashboard/report-card`      | Academics         |
| Copy Checking         | `/student/dashboard/copy-checking`    | Academics         |
| Academic Calendar     | `/student/dashboard/calendar/academic` | Academics         |
| Digital Diary         | `/student/dashboard/diary`            | Academics         |
| Library               | `/student/dashboard/library`          | Academics         |
| Fees                  | `/student/dashboard/fees`             | Fees & Transport  |
| Transport Info        | `/student/dashboard/transport`        | Fees & Transport  |
| Apply for Leave       | `/student/dashboard/apply-leave`      | Requests          |
| My Leaves             | `/student/dashboard/my-leaves`       | Requests          |
| Certificate Management| `/student/dashboard/certificates`     | Requests          |
| Communication         | `/student/dashboard/communication`    | Communication     |
| Parent Info           | `/student/dashboard/parent`           | Communication     |
| Gallery               | `/student/dashboard/gallery`          | Media & Activities|
| Settings              | `/student/dashboard/settings`         | Account           |
| Change Password       | `/student/dashboard/change-password`  | Account           |

**Layout:** `app/student/layout.tsx` wraps all `/student/dashboard/*` pages. It reads `student` from `sessionStorage`, fetches school name via `GET /api/schools/accepted`, and renders the sidebar + top bar. If there is no student in session, it redirects to login. The **mobile app** does not need the sidebar; it only needs to call the same APIs with the same query/body parameters.

---

## 2.1 Backend: My Class & Attendance (for mobile / Cursor)

This section explains **only the backend behavior** for **My Class** and **Attendance** so the mobile app can fetch the same data. If your app shows “No class teacher”, “No classmates”, or empty attendance, use the same APIs and parameters below.

### Where the student object comes from

After login, the app has a **student** object (e.g. from secure storage). It must include at least:

- `id` (UUID) → use as `student_id`
- `school_code`
- `class` (e.g. `"10"`)
- `section` (e.g. `"A"`)
- `academic_year` (e.g. `"2026"`)

Use these **exact** values in API query params. The backend matches `class` and `section` **exactly** (case-sensitive) against the `classes` and `students` tables. If the server stores `"10"` and you send `"CLASS-10"`, you get 404 or empty data.

---

### My Class — backend flow

The **My Class** screen shows: (1) Class details, (2) Class teacher, (3) Class timetable, (4) Classmates.

#### 1) Class details + Class teacher

**API:** `GET /api/student/class-teacher`

**Query params (all required):**

| Param            | Source           | Example |
|------------------|------------------|--------|
| `school_code`    | `student.school_code` | `VEDANTPUBL` |
| `class`          | `student.class`       | `10` |
| `section`        | `student.section`     | `A` |
| `academic_year`  | `student.academic_year` | `2026` |

**Success response (200):**

```json
{
  "data": {
    "class": {
      "id": "<uuid>",
      "class": "10",
      "section": "A",
      "academic_year": "2026"
    },
    "class_teacher": {
      "id": "<uuid>",
      "full_name": "Dr. Harsh",
      "staff_id": "STF004",
      "email": "rajesh.singh@school.com",
      "phone": "+91 98765 43002",
      "department": "Fitness",
      "designation": "PT Teacher"
    }
  }
}
```

- If no class teacher is assigned to that class, `class_teacher` is `null`.
- **Important:** Save `data.class.id` (UUID). You need it for the **timetable** API below.

**Errors:**

- 400: Missing any of `school_code`, `class`, `section`, `academic_year`.
- 404: No row in `classes` for that school + class + section + academic_year (e.g. typo or wrong year).

**Backend behavior:** The server looks up the `classes` row by `school_code`, `class`, `section`, `academic_year`. Then, if `classes.class_teacher_id` is set, it loads that staff row and returns it as `class_teacher`. So the mobile app must send the **same** `class` / `section` / `academic_year` as in the logged-in student.

---

#### 2) Class timetable

Timetable is **per class** (not per student). You need the **class UUID** from step 1 (`data.class.id`).

**API 1 — Period group for this class:**  
`GET /api/timetable/period-groups/classes?school_code=<school_code>`

- Returns a list of assignments: each has `group_id` and `class.id`.
- Find the item where `class.id === classId` (the UUID from class-teacher). Use that `group_id` in the next call.

**API 2 — Period group details:**  
`GET /api/timetable/period-groups/<group_id>?school_code=<school_code>`

- Returns the period group (e.g. `group_name`, `selected_days`, `periods` with timings and order).
- If no assignment found in step 1, the web shows: “No period group assigned to this class” / “Please assign a period group to this class first”.

**API 3 — Slots (weekly schedule):**  
`GET /api/timetable/slots?school_code=<school_code>&class_id=<class_id>`

- `class_id` = the **same** UUID from class-teacher (`data.class.id`).
- Returns an array of slots: `day`, `period_order` or `period`, `subject` (name, color), `teacher` or `teachers` (full_name, staff_id), etc.
- If the class has no slots or no period group, the list can be empty; the web then shows “No timetable available” or “No period group assigned”.

**Summary for mobile:**  
1. Call class-teacher → get `class.id`.  
2. Call period-groups/classes → find assignment where `class.id === class.id` → get `group_id`.  
3. Optionally call period-groups/:id for group details.  
4. Call timetable/slots with `class_id=class.id`.  
If step 2 has no matching class, show “No period group assigned”. If step 4 returns empty, show “No timetable available”.

---

#### 3) Classmates

**API:** `GET /api/student/classmates`

**Query params (all required):**

| Param            | Source           |
|------------------|------------------|
| `school_code`    | `student.school_code` |
| `class`          | `student.class`  |
| `section`        | `student.section` |
| `academic_year`  | `student.academic_year` |

**Success response (200):**

```json
{
  "data": [
    {
      "id": "<uuid>",
      "student_name": "Arushi",
      "admission_no": "STU010",
      "class": "10",
      "section": "A",
      "academic_year": "2026",
      "photo_url": "<url or null>"
    }
  ]
}
```

- Backend filters `students` by same `school_code`, `class`, `section`, `academic_year` (exact match). Search/filter by name or admission no. can be done **on the client** on this list.

**If you get empty `data`:**  
Check that `student.class`, `student.section`, and `student.academic_year` match exactly what’s in the database (same spelling and case as in the login response or as used on the web).

---

### Attendance — backend flow

The **Attendance** screen shows: total days in range, present/absent/late/not marked counts, percentage, and a day-wise list (e.g. “Last 30 days”) with status per day.

**API:** `GET /api/attendance/student`

**Query params:**

| Param         | Required | Description |
|---------------|----------|-------------|
| `school_code` | Yes      | `student.school_code` |
| `student_id`  | Yes      | `student.id` (UUID) |
| `start_date`  | Yes*     | Start of range, **YYYY-MM-DD** (local date). |
| `end_date`    | Yes*     | End of range, **YYYY-MM-DD** (local date). |

*For the “last 30 days” behavior, the web uses a 30-day window and sends both `start_date` and `end_date`.*

**Example (last 30 days, ending today):**

- Today = 2026-02-22 (local).
- `end_date` = 2026-02-22  
- `start_date` = 2026-01-24 (30 days back, inclusive).

So:  
`/api/attendance/student?school_code=...&student_id=...&start_date=2026-01-24&end_date=2026-02-22`

**Success response (200):**

```json
{
  "data": [
    {
      "id": "<uuid>",
      "attendance_date": "2026-02-20",
      "status": "present",
      "marked_by": "<staff_id or null>",
      "student_id": "<uuid>",
      "school_code": "..."
    }
  ],
  "statistics": {
    "total": 3,
    "present": 2,
    "absent": 1,
    "late": 0,
    "percentage": 66
  }
}
```

- `data`: only **marked** days in the requested range. Days with no row are “not marked”.
- `statistics`: computed **only over the returned rows** (marked days): `total` = number of records, `percentage` = present / total * 100.

**How the web builds the “30 days” UI:**

1. Fix a 30-day window (e.g. `start_date` and `end_date` as above).
2. Call the API with that range.
3. Build a list of all 30 calendar days. For each day:
   - If there is a record in `data` with that `attendance_date` → show status: `present` | `absent` | `late`.
   - If there is no record for that date → show “Not marked”.
4. **Counts:**  
   - Total days = 30 (fixed).  
   - Present / absent / late = from records in `data`.  
   - Not marked = 30 − (number of records in `data`).  
5. **Percentage:** The web uses **only marked days** for the percentage:  
   `percentage = present / (present + absent + late) * 100`  
   (So it’s “% present among marked days”, not “% of all 30 days”.)

**Date format:**  
Always use **YYYY-MM-DD** in local time for `start_date` and `end_date`. The backend compares dates as strings; the web uses local date (no UTC shift) so that “today” and “last 30 days” match what the teacher sees.

**Pagination (Back / Next 30 days):**  
- “Back 30 days”: move the 30-day window backward (e.g. subtract 30 from both start and end).  
- “Next 30 days”: move the window forward.  
Re-call the API with the new `start_date` and `end_date`.

**If attendance is empty or wrong:**

- Ensure you send `student_id` = the logged-in student’s `id` (UUID).
- Ensure `school_code` matches.
- Ensure dates are YYYY-MM-DD and the range is correct (e.g. 30 days inclusive).
- If the server returns empty `data` but you expect marks, the school may not have marked attendance for that student in that range.

---

### Examinations — backend for mobile

The **Examinations** screen shows **all** exams for the student’s class: **upcoming**, **ongoing**, and **previous (past)**. The web app groups them into “Upcoming & ongoing” and “Previous examinations”; the mobile app should do the same using the same API and client-side grouping.

**API:** `GET /api/examinations/v2/student`

| Query param   | Required | Description |
|---------------|----------|-------------|
| `school_code` | Yes      | From logged-in student. |
| `student_id`  | Yes      | Student UUID (`student.id`). |

**Response:** `{ "data": [ ... ] }` — array of examinations for the student’s class, ordered by `start_date` ascending. Each item includes:

- `id`, `exam_name`, `start_date`, `end_date`, `academic_year`, `description` (optional)
- `status` (optional) — may be `upcoming` / `ongoing` / `completed` if set by the backend
- `subject_mappings` — array of `{ subject_id?, subject_name?, teacher_name?, max_marks?, pass_marks? }`
- `schedules` — array of `{ id?, exam_date?, start_time?, end_time?, subject? }` for per-subject date/time
- `total_max_marks`, `total_pass_marks` (optional)

**How to show “Upcoming” vs “Previous” in the mobile app:**

1. **Use the full list** — do not filter exams on the client before grouping; show both upcoming and previous.
2. **Classify by date (today vs end_date):**
   - **Upcoming / ongoing:** `end_date >= today` (today at start of day). Include exams that haven’t ended yet.
   - **Previous:** `end_date < today` (exam has ended).
3. **Optional:** If the API does not send `status`, derive it:  
   - `end_date < today` → **Completed** (or “Previous”)  
   - `start_date > today` → **Upcoming**  
   - else → **Ongoing**
4. **UI:** Show two sections (or tabs): e.g. “Upcoming & ongoing” and “Previous examinations”. If there are no upcoming exams, still show “Previous examinations” if the API returned past exams. Use “No examinations found” only when `data` is empty.

**Marks for an exam:** If your app shows results, use the same marks API as the web (e.g. marks per examination). The examinations API does not include marks; fetch marks separately if your backend exposes a student marks-by-exam endpoint.

---

### Checklist for mobile (My Class & Attendance)

- Use **exact** `student.class`, `student.section`, `student.academic_year` from login (or profile) for class-teacher and classmates.
- Use `data.class.id` from class-teacher as `class_id` for timetable (period-groups and slots).
- For attendance, use `student.id` as `student_id` and send `start_date` and `end_date` in **YYYY-MM-DD** (e.g. 30-day window).
- Implement “not marked” and percentage the same way as the web: 30-day grid, and percentage = present / (present + absent + late) for marked days only.

---

## 2.2 UI/UX & Visual Design (React Native Mobile App)

This section defines the **look and structure** of the student dashboard in your React Native app so it matches the intended wireframe: dark theme, card-based layout, and two main entry screens (Home + Modules grid).

### Colour scheme

| Use | Colour | Notes |
|-----|--------|--------|
| **Primary background** | Dark charcoal / near-black (`#1a1a1a`–`#0d0d0d`) | Full-screen background; sets dark-mode tone. |
| **Phone / container** | Slightly lighter dark grey | For device frame or outer container if needed. |
| **Cards & content panels** | Lighter grey / off-white (`#2d2d2d`, `#f5f5f5` or `#e8e8e8`) | Rounded rectangles; clear contrast against dark background. |
| **Text on dark** | White or very light grey | Titles, labels, body on dark areas. |
| **Text on light** | Dark grey or black | Titles, labels, body on cards. |
| **Accent (optional)** | Reserve one brand colour | For primary actions, active tab, or key stats; keep rest of UI neutral for clarity. |

Use the same palette across Home, Modules screen, and all module detail screens so the app feels consistent.

### Global UI elements

- **Status bar:** Dark; show time, battery, signal (use React Native `StatusBar`).
- **Top app bar:** Lighter grey bar below status bar.
  - **Left:** Hamburger (three lines) to open drawer/menu or go to Modules.
  - **Right:** Profile avatar or notification icon (circle); tap to open profile/settings or notifications.
  - **Centre (optional):** Screen title or school name.
- **Cards:** Rectangular containers with rounded corners and lighter background; use for grouping content (stats, lists, sections).
- **Circular icons:** Use for:
  - Category/segment selector on Home (e.g. Today, Upcoming, Notifications).
  - Module icons on the Modules grid (one icon + label per module).
  - Avatar placeholders, quick actions, or status.
- **Bottom navigation:**
  - **Primary:** One large, rounded bar at the bottom with a **central Home button** (filled circle or icon). Tapping it returns to the Home dashboard.
  - **Optional:** Additional tabs (e.g. Modules, Profile) as smaller circles or icons on the same bar, or a second row (e.g. pagination dots for multiple module pages).
- **Lists:** Rows with optional left icon (circle), title + subtitle (two lines), and right element (chevron, toggle, or “View” pill). Use for notices, upcoming items, leaves, etc.

### Home page structure (main dashboard)

The **Home** screen (`/student/dashboard`) is the first screen after login. Structure it as follows so it matches the wireframe and the data from the APIs:

1. **Top: Category / segment selector**
   - Horizontal row of **five circular elements** (or horizontal scroll).
   - First circle: **filled** (active); rest: **outline only**.
   - Labels can be: e.g. **Today**, **Upcoming**, **Notifications**, **Messages**, **All** (or similar). Only one active at a time; content below can filter by selected segment (e.g. “Today” = today’s attendance + today’s notices; “Upcoming” = upcoming exams + upcoming items).

2. **Content card 1 – Stats / summary**
   - One **card** (lighter background).
   - **Two lines of text:** e.g. “Attendance”, “85%” or “Weekly completion” and a short summary.
   - **Row of small circles + ovals:** Can represent:
     - **Weekly completion:** e.g. 6 small filled circles (days) + oval “View details” or progress bar.
     - Or **upcoming assignments count** + CTA.
   - **Data source:** `/api/student/stats`, `/api/student/weekly-completion`, `/api/student/attendance` (last 7 days). Show at-a-glance numbers and a tappable “See more” that goes to the relevant module.

3. **Content card 2 – List (notices / upcoming / activities)**
   - Another **card**.
   - **Two lines of text:** Section title (e.g. “Notices”, “Upcoming events”, “Recent activity”).
   - **Vertical list** (2–5 items). Each row:
     - **Left:** Dark circle (icon or avatar placeholder).
     - **Middle:** Two short lines (title + subtitle or date).
     - **Right:** Thin horizontal oval (e.g. “View” or chevron).
   - **Data source:** `/api/communication/notices`, `/api/student/upcoming-items`, or merged list. Tap row to open detail (e.g. notice body or exam/event detail).

4. **Bottom**
   - Same **bottom navigation** as everywhere: central Home button (and optional Modules / Profile).

**Flow:** On load, call the Home APIs in parallel (stats, upcoming-items, weekly-completion, class-teacher, attendance, notices, upcoming exams). Map responses into the segments and cards above. Tapping a segment only changes which data is highlighted or filtered on the same screen (or refreshes the list); tapping a row or “View” navigates to the relevant module or detail screen.

### Modules screen structure (all features)

The **Modules** screen is the “all features” view: a grid of every student menu item, grouped by module. Use this when the user taps “Modules” or the hamburger menu.

1. **Top app bar**
   - Same as global: menu (left), title e.g. “Modules” or “All features” (centre), profile/notification (right).

2. **Module grid**
   - One **card** (lighter background) containing the grid.
   - **Layout:** 3 or 4 columns; multiple rows. Each cell:
     - **Circular icon** (dark circle with icon or two lines as placeholder).
     - **Label** below (one or two lines): e.g. “My Class”, “Attendance”, “Examinations”, “Marks”, “Report Card”, “Copy Checking”, “Academic Calendar”, “Digital Diary”, “Library”, “Fees”, “Transport Info”, “Apply for Leave”, “My Leaves”, “Certificate Management”, “Communication”, “Parent Info”, “Gallery”, “Settings”, “Change Password”.
   - Group by section visually (e.g. spacing or sub-headers): **Academics** (My Class → Library), **Fees & Transport**, **Requests**, **Communication**, **Media & Activities**, **Account**.
   - **Tap:** Navigate to the corresponding module screen (same paths as in the table in §2).

3. **Bottom**
   - **Pagination dots** (e.g. 5 small filled circles) if you split modules across multiple pages.
   - **Central Home button** (same as Home screen) to return to the dashboard.

**Flow:** No API call needed for the grid itself; routes and labels are fixed. Each module screen then loads its own data via the APIs in §3.

---

## 3. Per-Module: Data Flow & APIs

For each module we describe: **what the page shows**, **how data is fetched**, and the **exact API(s)** with **method**, **query/body**, and **response shape** (where useful for mobile).

**Convention:** `school_code` and `student_id` are required for almost all student APIs. They come from the logged-in student: `student.school_code`, `student.id`.

---

### 3.1 Home (`/student/dashboard`)

**Purpose:** Overview: stats, upcoming items, class teacher, last 7 days attendance, recent notices, and optional timetable.

**Data fetching:** One `useEffect` runs on load. It reads `student` from `sessionStorage` and then runs **parallel** `fetch()` calls. No auth header is sent; the backend identifies the school by `school_code` (and student by `student_id` where applicable).

**APIs used:**

| API | Method | Query params | Response (success) |
|-----|--------|--------------|--------------------|
| `/api/student/stats` | GET | `school_code`, `student_id` | `{ data: { attendance, attendance_change, gpa, gpa_rank, merit_points, progress_current, progress_total, term } }` |
| `/api/student/upcoming-items` | GET | `school_code`, `student_id`, `limit=3` | `{ data: [ { id, title, subtitle, month, day } ] }` |
| `/api/student/weekly-completion` | GET | `school_code`, `student_id` | `{ data: { weekly_completion, assignments_to_complete } }` |
| `/api/student/class-teacher` | GET | `school_code`, `class`, `section`, `academic_year` | `{ data: { class: { id, class, section, academic_year }, class_teacher: { full_name, designation?, email?, phone? } } }` |
| `/api/student/attendance` | GET | `school_code`, `student_id`, `start_date`, `end_date` (YYYY-MM-DD) | `{ data: [ { attendance_date, status: 'present' \| 'absent' \| 'late', ... } ] }` |
| `/api/communication/notices` | GET | `school_code`, `limit=5` | `{ data: [ { id, title, content, category, status, publish_at, ... } ] }` |
| `/api/examinations` | GET | `school_code`, `status=upcoming` | `{ data: [ { id, exam_name, start_date, end_date, status, ... } ] }` (used to count upcoming exams) |

If the class teacher response includes `class.id`, the Home page may also fetch **timetable** for that class:

- `GET /api/timetable/slots?school_code=...&class_id=...`  
- Response: `{ data: [ { day, period, period_order, subject, teacher, class_reference, ... } ] }`

**Mobile:** You can call the same set of APIs on app launch (or when the student opens the “Home” tab). Use the same query parameters; cache or refresh as needed.

**Mobile screen (React Native):** Implement as in §2.1 "Home page structure": category selector (circular tabs) at top; first card for stats/weekly completion (from stats + weekly-completion + attendance APIs); second card for list of notices/upcoming items (from notices + upcoming-items). Optional third card for class teacher or next exam. Use cards with rounded corners on dark background; list rows with icon + two lines + "View" oval. Pull-to-refresh to re-fetch all Home APIs.

---

### 3.2 My Class (`/student/dashboard/class`)

**Purpose:** Show the student’s class, class teacher details, and list of classmates (with optional search).

**APIs:**

| API | Method | Query params | Response |
|-----|--------|--------------|----------|
| `/api/student/class-teacher` | GET | `school_code`, `class`, `section`, `academic_year` | `{ data: { class: { id, class, section, academic_year }, class_teacher: { id, full_name, staff_id, email?, phone?, designation? } } }` |
| `/api/student/classmates` | GET | `school_code`, `class`, `section`, `academic_year` | `{ data: [ { id, student_name, admission_no, class, section, academic_year, photo_url } ] }` |

**Fetching:** On mount, read `student` from session; then call both APIs. Classmates can be filtered client-side by name/admission number.

**Mobile:** Same two GETs. Use `student.class`, `student.section`, `student.academic_year` for both.

**Mobile screen (React Native):** One or two cards on dark background. **Card 1:** Class teacher – photo (circle), name, designation, optional email/phone (tappable). **Card 2:** “Classmates” – search bar (optional), then vertical list: each row = circular avatar + student name + admission no; tap to see profile if you add that later. Use same card style and list row style as Home.

---

### 3.3 Attendance (`/student/dashboard/attendance`)

**Purpose:** Show attendance for a sliding 30-day window (present/absent/late) and summary stats.

**API:**

- **GET** `/api/attendance/student?school_code=...&student_id=...&start_date=...&end_date=...`
  - Dates: **YYYY-MM-DD** (local date range).
  - Response: `{ data: [ { id, attendance_date, status: 'present' | 'absent' | 'late', marked_by?, staff? } ] }`

**Fetching:** The page uses a “window” (e.g. last 30 days). It computes `start_date` and `end_date` in local time, then calls the API once per window. Stats (total, present, absent, late, percentage) are **computed on the client** from the returned array.

**Mobile:** Same GET. You can reuse the same date-window logic and stats calculation, or add a dedicated “attendance summary” API later if needed.

---

### 3.4 Examinations (`/student/dashboard/examinations`)

**Purpose:** List **all** exams for the student (upcoming, ongoing, and **previous**). Show schedule (subject, date, time) and marks when available.

**APIs:**

| API | Method | Query params | Response |
|-----|--------|--------------|----------|
| `/api/examinations/v2/student` | GET | `school_code`, `student_id` | `{ data: [ { id, exam_name, start_date, end_date, status?, academic_year, schedules?, subject_mappings?, total_max_marks?, total_pass_marks? } ] }` — **all** exams for the class (no server-side filter by status). |
| `/api/marks` | GET | `school_code`, `student_id` | `{ data: [ { exam_id, subject_id, marks_obtained, max_marks, ... } ] }` (marks per exam/subject) |

**Fetching:** On mount, fetch exams first; then fetch marks and merge by `exam_id`. **Do not** drop past exams: show both “Upcoming & ongoing” and “Previous”. Group client-side: `end_date >= today` → upcoming/ongoing; `end_date < today` → previous. See **§2.1 Examinations — backend for mobile** for full details.

**Mobile:** Same two GETs. Show two sections (or tabs): “Upcoming & ongoing” and “Previous examinations”. If there are no upcoming exams, still show the previous section when the API returns past exams. Use “No examinations found” only when `data` is empty.

**Mobile screen (React Native):** Two sections: “Upcoming & ongoing” and “Previous examinations”. Each section: list of exam cards. Each card: exam name, date range, status badge (Upcoming/Ongoing/Completed). Expand or tap to see schedule (subject, date, time) and marks from the marks API when available.

---

### 3.5 Marks (`/student/dashboard/marks`)

**Purpose:** Show marks by exam and subject (subject name, marks obtained, max marks, percentage, grade).

**API:**

- **GET** `/api/student/marks?school_code=...&student_id=...`
- Response: `{ data: [ { exam_id, exam_name, exam_type, start_date, end_date, academic_year, subjects: [ { subject_id, subject_name, subject_color, marks_obtained, max_marks, percentage, grade, status, remarks } ], total_marks, total_max_marks, overall_percentage, overall_grade } ] }`

**Fetching:** Single GET on mount. All filtering (by exam type, search) is done client-side.

**Mobile:** Same GET; then render list/cards per exam and per subject.

**Mobile screen (React Native):** List of exams (one card per exam). Each card: exam name, overall percentage/grade, date. Tap to expand or open detail: list of subjects with marks obtained, max marks, percentage, grade (use subject_color if provided). Same card + list row pattern; optional filter by exam type.

---

### 3.6 Report Card (`/student/dashboard/report-card`)

**Purpose:** List generated report cards and allow view/download as HTML/PDF.

**APIs:**

| API | Method | Query params | Response / usage |
|-----|--------|--------------|------------------|
| `/api/marks/report-card/student` | GET | `school_code`, `student_id` | `{ data: [ { id, student_name, academic_year, ... } ] }` – list of report cards |
| `/api/marks/report-card/:id` | GET | `student_id` (query, for auth) | Returns HTML report card (document). Used in browser as view URL or download (e.g. `window.open` or download link). |

**Fetching:** On mount, GET list. “View” opens `GET /api/marks/report-card/{id}?student_id=...` in a new window or WebView. “Download” uses the same URL with a download trigger.

**Mobile:** List via first API. For view: open the report URL in a WebView or in-app browser with `student_id` in query. For download: same URL and save the response body to a file (e.g. PDF if backend sends PDF, or HTML).

**Mobile screen (React Native):** List of report cards (one row per card): student name, academic year, optional date. Each row: left icon, two lines of text, right “View” / “Download” (oval or icon). Tap View → open report URL in WebView. Tap Download → same URL, save to device. Use card or plain list on dark background.

---

### 3.7 Copy Checking (`/student/dashboard/copy-checking`)

**Purpose:** Show teacher’s copy-checking records for this student (class work / homework, status, remarks, date).

**API:**

- **GET** `/api/student/copy-checking?school_code=...&student_id=...`
- Response: `{ data: [ { id, subject_id, subject_name, subject_color, work_date, work_type: 'class_work'|'homework', status: 'green'|'yellow'|'red'|'not_marked'|'absent', remarks, topic, marked_by, checked_date, created_at, updated_at } ] }`

**Fetching:** Single GET on mount. Filtering by status/work type is client-side.

**Mobile:** Same GET; display as list/cards with status colors.

**Mobile screen (React Native):** List of copy-checking entries. Each row: subject (use subject_color as left accent or dot), work type (Class work / Homework), date, status (colour pill: green/yellow/red/not marked/absent), optional remarks. Filter by work type or status (segmented control or chips). Same card/list style.

---

### 3.8 Academic Calendar (`/student/dashboard/calendar/academic`)

**Purpose:** Show school events and holidays by month/year.

**API:**

- **GET** `/api/calendar/academic?school_code=...&academic_year=...&include_events=true|false`
- Response: `{ data: [ { id, event_date (YYYY-MM-DD), title, description?, type?, academic_year } ] }`

**Fetching:** When the user changes year (and optionally month), the page calls this API. `include_events=true` includes custom events; `false` may return only holidays (implementation-dependent).

**Mobile:** Same GET; use `academic_year` from student or selector. Map `event_date` to calendar cells.

**Mobile screen (React Native):** Month/year picker at top. Calendar grid (e.g. 7×5 or 7×6): each cell = date number; dots or badges on dates that have events (from API). Tapping a date shows a bottom sheet or list of events for that day (title, description, type). Use one card for the calendar; list for events. Same dark background and card style.

---

### 3.9 Digital Diary (`/student/dashboard/diary`)

**Purpose:** List diary entries (homework/assignments) for the student’s class; mark as read.

**APIs:**

| API | Method | Query / body | Response |
|-----|--------|--------------|----------|
| `/api/student/diary` | GET | `school_code`, `student_id`, `class`, `section`, `academic_year` | `{ data: [ { id, title, content, subject?, homework?, event_date, is_read?, created_at, ... } ] }` |
| `/api/diary/:diaryId/read` | POST | Body: `{ user_id, user_type: 'STUDENT' }` | Marks the diary entry as read for this student. Response typically 200 OK. |

**Fetching:** On mount, GET diary list. When the user opens an entry, POST to `.../read` and then update local state so `is_read` is true.

**Mobile:** Same GET for list. Same POST when user opens an entry (to mark read).

**Mobile screen (React Native):** List of diary entries (newest first). Each row: left icon or subject badge, title, date, “Read”/“Unread” indicator (e.g. dot). Tap row → detail screen (title, content, homework, date); on open call POST mark-read, then set local is_read. Optional filter by date. Card or list on dark background.

---

### 3.10 Library (`/student/dashboard/library`)

**Purpose:** Show books and the student’s issued/borrowed books.

**API:**

- **GET** `/api/student/library?school_code=...&student_id=...`
- Response: `{ data: { books: [ ... ], borrowed_books: [ { id, book_id, issue_date, due_date, return_date?, status, book_title?, ... } ] } }`

**Fetching:** Single GET on mount. Status (issued, returned, overdue) can be derived client-side from dates and `status`.

**Mobile:** Same GET; render two sections (catalog and “My books”).

**Mobile screen (React Native):** Two sections in one scroll. **Section 1 – My books:** List of borrowed_books: book title, issue date, due date, status (Issued/Returned/Overdue) with colour. **Section 2 – Library / Catalog:** List of books (title, author if available). Use section headers + card/list rows; same visual language as other screens.

---

### 3.11  (`/student/dashboard/fees` and `/student/dashboard/fees/v2`)

**Purpose:** Show fee structure and payment history; optional receipt download.

**APIs:**

| API | Method | Query params | Response |
|-----|--------|--------------|----------|
| `/api/student/fees` | GET | `school_code`, `student_id` | `{ data: [ { id, component_name, amount, due_date, status, ... } ] }` – fee components/dues for the student |
| `/api/student/fees/receipts` | GET | `school_code`, `student_id` | `{ data: [ { id, payment_id, amount, paid_at, status, ... } ] }` – payment/receipt list |
| `/api/fees/receipts/[id]/download` | GET | `school_code` (query) | Returns PDF for that receipt. `[id]` = payment ID (use `receipt.payment.id` or `receipt.id` from receipts list). Used in browser as download link. |

**Fetching:** On mount, fetch fees and receipts in parallel (as in `fees/v2/page.tsx`). Receipt download: open the download URL (with `school_code`) in a new window or use as download URL in mobile.

**Mobile:** Same two GETs for list. For receipt download, GET the download URL and save the response (e.g. to files or open in viewer).

**Mobile screen (React Native):** **Card 1 – Fee dues:** List of fee components (name, amount, due date, status). **Card 2 – Payment history:** List of receipts (amount, paid date, status). Each receipt row: “View”/“Download” → open download URL in WebView or save file. If no data, show empty state in card. Same dark background and card style.

---

### 3.12 Transport Info (`/student/dashboard/transport`)

**Purpose:** Show whether the student has transport, route, vehicle, pickup/drop stops.

**API:**

- **GET** `/api/student/transport?school_code=...&student_id=...`
- Response: `{ data: { has_transport, transport_type, route, vehicle, stops: [], pickup_stop, dropoff_stop, ... } }`  
  If no transport or error, the web app falls back to `{ has_transport: false, ... }`.

**Fetching:** Single GET on mount.

**Mobile:** Same GET; show a single “Transport” screen with the same fields.

---

### 3.13 Apply for Leave (`/student/dashboard/apply-leave`)

**Purpose:** Load leave types, submit a new leave request.

**APIs:**

| API | Method | Query / body | Response |
|-----|--------|--------------|----------|
| `/api/leave/types` | GET | `school_code` | `{ data: [ { id, abbreviation, name, is_active, max_days? } ] }` – list of leave types (use only `is_active: true`) |
| `/api/leave/student-requests` | POST | Body: `{ school_code, student_id, leave_type_id, leave_title, leave_start_date, leave_end_date, reason?, absent_form_submitted?: false }` | Creates a leave request. Success: 200/201 with success payload. |

**Fetching:** On mount, GET leave types. On submit, POST to create request. Dates are **YYYY-MM-DD**.

**Mobile:** Same GET for types; same POST for submit. You can reuse the same request body.

**Mobile screen (React Native):** Form in a card: leave type (picker from API), title, start date, end date (date pickers), reason (text input), optional "Absent form submitted" toggle. Submit button (oval or full-width). On success show toast and navigate back or to My Leaves. Same dark background and card style.

---

### 3.14 My Leaves (`/student/dashboard/my-leaves`)

**Purpose:** List leave requests submitted by this student (status: pending/approved/rejected).

**API:**

- **GET** `/api/leave/student-requests?school_code=...&student_id=...`
- Response: `{ data: [ { id, leave_type_id, leave_title, leave_start_date, leave_end_date, reason, status, created_at, reviewed_at?, ... } ] }`

**Fetching:** Single GET on mount.

**Mobile:** Same GET; show as list with status badges.

**Mobile screen (React Native):** List of leave requests. Each row: leave title, date range, status pill (Pending=neutral, Approved=green, Rejected=red), optional reason. Tap row for detail. Same card/list style; optional filter by status (chips or segment).

---

### 3.15 Certificate Management (`/student/dashboard/certificates`)

**Purpose:** List certificates (e.g. bonafide, conduct) and allow preview/download of certificate image.

**API:**

- **GET** `/api/student/certificates?school_code=...&student_id=...`
- Response: `{ data: [ { id, type: 'simple'|'issued', title, image_url, issued_date, verification_code?, description? } ] }`

**Fetching:** Single GET on mount. “Download” uses `image_url` (open or save). “Preview” opens the same URL in a modal or WebView.

**Mobile:** Same GET. Use `image_url` for full-screen preview and for download/save to device.

**Mobile screen (React Native):** Grid or list of certificate cards. Each card: title, issued date, optional verification code. Tap → full-screen image (image_url) with "Download" / "Share" actions. Same dark background and card style.

---

### 3.16 Communication (`/student/dashboard/communication`)

**Purpose:** List active notices/announcements from the school.

**API:**

- **GET** `/api/communication/notices?school_code=...&status=Active&limit=...` (optional limit)
- Response: `{ data: [ { id, title, content, category, status, publish_at, created_at } ] }`

**Fetching:** On mount, GET notices. The web app filters client-side to “published” (e.g. `publish_at <= now` or null).

**Mobile:** Same GET; optionally filter by `publish_at` on the client.

**Mobile screen (React Native):** List of notices. Each row: left icon or category badge, title, short date/subtitle; tap → detail screen (title, content, publish_at). Optional category filter at top. Same card/list style; pull-to-refresh.

---

### 3.17 Parent Info (`/student/dashboard/parent`)

**Purpose:** Show parent/guardian name, phone, email from the student record.

**Data:** No separate API. The page uses the **student** object from session: `student.parent_name`, `student.parent_phone`, `student.parent_email`. These come from the login response and/or from the student profile API if you have one.

**Mobile:** Use the same fields from the logged-in student payload (or from `GET /api/students/:id?school_code=...` if you load profile separately).

**Mobile screen (React Native):** Single card with three rows: Parent/Guardian name (with icon), Phone (tappable to call), Email (tappable to mail). No API call; data from stored student. Same dark background and card style.

---

### 3.18 Gallery (`/student/dashboard/gallery`)

**Purpose:** Show school gallery images, optionally by category.

**API:**

- **GET** `/api/gallery?school_code=...&category=...`  
  Omit `category` or use `category=all` for all. Response: `{ data: [ { id, image_url, title?, category?, created_at } ] }`

**Fetching:** On mount and when category changes. No student_id needed; school-wide gallery.

**Mobile:** Same GET; grid of images, optional category filter.

**Mobile screen (React Native):** Optional category chips at top; then image grid (2–3 columns). Each cell: image (image_url), optional title overlay. Tap → full-screen image or lightbox. Same dark background; cards or simple grid.

---

### 3.19 Settings (`/student/dashboard/settings`)

**Purpose:** Edit profile (phone, email, address) and upload/remove profile photo.

**APIs:**

| API | Method | Body / params | Response |
|-----|--------|----------------|----------|
| `GET /api/students/:studentId` | GET | Query: `school_code` | Full student record (for pre-filling form). |
| `PATCH /api/students/:studentId` | PATCH | Query: `school_code`. Body: `{ phone?, email?, address? }` | Updated student; store in session. |
| `POST /api/students/photo` | POST | `FormData`: `file`, `school_code`, `student_id` | `{ data: { photo_url \| public_url } }` – new photo URL; update student in session. |

**Fetching:** On mount, GET student to fill form. On save, PATCH. On photo upload, POST form-data. After PATCH or photo upload, the web app updates `sessionStorage` with the new student object.

**Mobile:** Same GET/PATCH for profile. For photo: multipart POST with `file`, `school_code`, `student_id`; then update local profile with returned `photo_url`.

**Mobile screen (React Native):** Top: circular profile photo (from student.photo_url); tap to change photo (camera/gallery). Card with form: phone, email, address (text inputs). Save button; on success update stored student and show toast. Same dark background and card style.

---

### 3.20 Change Password (`/student/dashboard/change-password`)

**Purpose:** Change the student’s password (current + new).

**API:**

- **POST** `/api/students/change-password`
- Body: `{ school_code, admission_no, current_password, new_password }`
- Response (success): `{ success: true }`. Response (error): `{ success: false, error: "..." }`

**Fetching:** No GET. On submit, single POST. Validation (e.g. new password length) is done on client and server.

**Mobile:** Same POST; then clear session and redirect to login if you require re-login after password change.

**Mobile screen (React Native):** Single card with three fields: current password, new password, confirm new password (all secure inputs). Submit button. On success: optional toast, clear session, navigate to login. Same dark background and card style.

---

## 4. Common Patterns for Mobile

1. **Auth:** After login, store `student` (and optionally a token if you add one later). Send `school_code` and `student_id` on every student-scoped API call.
2. **Base URL:** All APIs are relative to the same origin (e.g. `https://yourschool.com/api/...`). Mobile should use the same base URL (e.g. from config).
3. **No special headers:** The web app does not send a Bearer token in the examples above; session may be cookie-based. For mobile, if you add token-based auth, send `Authorization: Bearer <token>` and keep using the same query/body params.
4. **Errors:** On 4xx/5xx, parse `response.json()` for `error` or `message`. On 401, treat as session expired and redirect to login.
5. **Pagination:** Most list APIs used by the student dashboard return a single page (e.g. “all notices”, “all certificates”). If an API supports `page`/`limit`, use the same query params on mobile.
6. **Dates:** Use **YYYY-MM-DD** for date params (`start_date`, `end_date`, `leave_start_date`, etc.) and for display use the same as the web (e.g. local date strings).

---

## 5. Quick API Reference Table (for Mobile)

| Module / feature      | API path (all GET unless noted) | Key params / body |
|-----------------------|----------------------------------|-------------------|
| Login                 | `POST /api/auth/student/login`   | `school_code`, `admission_no`, `password` |
| Home stats            | `/api/student/stats`            | `school_code`, `student_id` |
| Upcoming items        | `/api/student/upcoming-items`   | `school_code`, `student_id`, `limit` |
| Weekly completion     | `/api/student/weekly-completion`| `school_code`, `student_id` |
| Class teacher         | `/api/student/class-teacher`    | `school_code`, `class`, `section`, `academic_year` |
| Attendance            | `/api/student/attendance`      | `school_code`, `student_id`, `start_date`, `end_date` |
| Notices               | `/api/communication/notices`   | `school_code`, `status=Active`, `limit`? |
| Timetable             | `/api/timetable/slots`          | `school_code`, `class_id` |
| Classmates            | `/api/student/classmates`       | `school_code`, `class`, `section`, `academic_year` |
| Examinations (student)| `/api/examinations/v2/student`  | `school_code`, `student_id` |
| Marks (raw)           | `/api/marks`                    | `school_code`, `student_id` |
| Marks (by exam)       | `/api/student/marks`            | `school_code`, `student_id` |
| Report card list      | `/api/marks/report-card/student`| `school_code`, `student_id` |
| Report card view      | `/api/marks/report-card/:id`    | `student_id` (query) |
| Copy checking         | `/api/student/copy-checking`    | `school_code`, `student_id` |
| Academic calendar     | `/api/calendar/academic`        | `school_code`, `academic_year`, `include_events` |
| Diary list            | `/api/student/diary`            | `school_code`, `student_id`, `class`, `section`, `academic_year` |
| Diary mark read       | `POST /api/diary/:id/read`      | Body: `user_id`, `user_type: 'STUDENT'` |
| Library               | `/api/student/library`          | `school_code`, `student_id` |
| Fees                  | `/api/student/fees`             | `school_code`, `student_id` |
| Fee receipts          | `/api/student/fees/receipts`    | `school_code`, `student_id` |
| Receipt download      | `/api/fees/receipts/:id/download` | `school_code` |
| Transport             | `/api/student/transport`        | `school_code`, `student_id` |
| Leave types           | `/api/leave/types`              | `school_code` |
| Leave submit          | `POST /api/leave/student-requests` | Body: `school_code`, `student_id`, `leave_type_id`, `leave_title`, `leave_start_date`, `leave_end_date`, `reason?` |
| My leaves             | `/api/leave/student-requests`   | `school_code`, `student_id` (GET) |
| Certificates          | `/api/student/certificates`    | `school_code`, `student_id` |
| Gallery               | `/api/gallery`                  | `school_code`, `category?` |
| Student profile       | `GET/PATCH /api/students/:id`   | `school_code`; PATCH body: `phone`, `email`, `address` |
| Student photo         | `POST /api/students/photo`      | FormData: `file`, `school_code`, `student_id` |
| Change password       | `POST /api/students/change-password` | Body: `school_code`, `admission_no`, `current_password`, `new_password` |
| Schools (for name)    | `GET /api/schools/accepted`     | — (returns list; find by `school_code`) |

---

## 6. File Locations (Web)

- **Layout & menu:** `app/student/layout.tsx`
- **Login:** `app/student/login/page.tsx`
- **Dashboard home:** `app/student/dashboard/page.tsx`
- **All other pages:** `app/student/dashboard/<module>/page.tsx` (or under `calendar/academic`, `fees/v2`, etc.)

Using this document you can replicate the same flows and API calls in your mobile app while keeping one backend.
