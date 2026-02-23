# Student & Staff Dashboard — Audit: Issues, Inconsistencies & What’s Not Working

This document lists **issues**, **inconsistencies**, and **broken or incomplete behavior** in the **Student** and **Staff (Teacher)** dashboards, based on a codebase review.

---

## 1. Authentication & redirects

### 1.1 Inconsistent login redirect targets (Student)

- **Student layout** (`app/student/layout.tsx`):
  - When **no student** or **role !== 'student'**: redirects to **`/login`** (role selector).
  - One branch (line 107) uses **`/student/login`**.
- **Student change-password** (`app/student/dashboard/change-password/page.tsx`):
  - When no `student` in session: **`router.push('/login')`**.
- **Recommendation:** Decide on a single rule: either always send students to **`/student/login`** (direct student login) or always to **`/login`** (role selector). Then use that everywhere (layout, change-password, and any other “session lost” cases).

### 1.2 Logout and session clear (Student)

- Student layout logout button clears `student` and `role` then pushes to **`/login`**. It does **not** clear all of `sessionStorage` (e.g. `teacher_authenticated` or other keys). If the same browser is used for multiple roles, leftover keys can cause confusion. Optional: use `sessionStorage.clear()` on student logout for a clean slate, or document that only student/role are cleared.

### 1.3 Teacher dashboard — no teacher

- When there is no `teacher` in session, teacher layout and several teacher pages use **`router.push('/login')`**. That is consistent; ensure the generic **`/login`** page clearly offers “Staff” so teachers know where to go.

---

## 2. Student dashboard

### 2.1 Calendar: two routes, home links point to wrong one

- **Sidebar:** “Academic Calendar” → **`/student/dashboard/calendar/academic`** (full calendar UI with month grid, events).
- **Student home** (`app/student/dashboard/page.tsx`): “View calendar” / calendar links use **`/student/dashboard/calendar`** (no `/academic`).
- **`/student/dashboard/calendar`** has its own `page.tsx` (simpler list?) and **`/student/dashboard/calendar/academic`** is the richer view.
- **Issue:** Home sends students to `/calendar` while the menu sends them to `/calendar/academic`. So “Academic Calendar” in the menu and “calendar” on the home are different URLs and potentially different UIs.
- **Recommendation:** Either (a) make home calendar links go to **`/student/dashboard/calendar/academic`** so they match the sidebar, or (b) make `/student/dashboard/calendar` redirect to `/student/dashboard/calendar/academic` and keep a single calendar experience.

### 2.2 Academic calendar route — special auth in layout

- In student layout, **`/student/dashboard/calendar/academic`** is special-cased: it allows “any logged-in user” (checks `role` but not necessarily `student`). So in theory staff could open that URL and see content.
- If the intent is “public or shared calendar”, this is fine. If the intent is “students only”, the condition should require `role === 'student'` and `storedStudent` like other student pages.

### 2.3 Fees: redirect only, no direct link to v2

- **Menu:** “Fees” → **`/student/dashboard/fees`**.
- **`/student/dashboard/fees/page.tsx`** only does **`router.replace('/student/dashboard/fees/v2')`**.
- **Impact:** Every time a student clicks “Fees”, they hit `/fees` then get replaced to `/fees/v2`. It works but causes an extra navigation and possible flash. Consider either (a) changing the menu path to **`/student/dashboard/fees/v2`** and keeping `/fees` as a redirect for old links, or (b) leaving as-is and documenting the redirect.

### 2.4 Error handling and empty API responses

- Several student pages use **`result.data || []`** (or similar), which handles missing `data` safely.
- Not every page shows a clear **error message** when the API returns `response.ok === false` or `result.error`. For example, some only `console.error` and leave the UI in loading or empty state.
- **Recommendation:** For critical flows (attendance, fees, marks, leave), surface **`result.error`** (or a generic “Something went wrong”) in the UI and optionally a retry action.

### 2.5 Change password — API and post-success flow

- Student change-password uses **`/api/students/change-password`** with `admission_no` (and school_code, current_password, new_password). Ensure this API exists and is the same one used by the rest of the app (e.g. no mix of `/api/student/change-password` vs `/api/students/change-password` elsewhere).
- On success, the page only shows a success state; it does **not** redirect to login or clear session. If the backend invalidates the session on password change, the user might hit 401 on the next request. Consider: after successful change, either redirect to **`/student/login`** and clear session, or document that the user stays logged in.

---

## 3. Staff (Teacher) dashboard

### 3.1 Duplicate “Staff” entry points

- **Sidebar:** “Staff Information” → **`/teacher/dashboard/staff-management/directory`**.
- **Teacher home:** “All Staff” button → **`/teacher/dashboard/staff`**.
- **`/teacher/dashboard/staff-management`** immediately redirects to **`/teacher/dashboard/staff-management/directory`**.
- **`/teacher/dashboard/staff`** and **`/teacher/dashboard/staff-management/directory`** both list staff (same API: `GET /api/staff?school_code=`).
- **Issue:** Two URLs for the same concept (“view staff list”) and two labels (“Staff Information” vs “All Staff”). This can confuse users and duplicate maintenance.
- **Recommendation:** Use a single route and label, e.g. “Staff Information” → **`/teacher/dashboard/staff-management/directory`**, and change the home “All Staff” link to the same URL. Optionally remove **`/teacher/dashboard/staff`** or make it redirect to **`/teacher/dashboard/staff-management/directory`**.

### 3.2 Dynamic teacher routes (Fees, Timetable, Transport, Reports, etc.) — placeholder only

- Routes like **Fees**, **Timetable**, **Transport**, **Expense/Income**, **Reports**, **Gate pass** are handled by **`/teacher/dashboard/[...slug]/page.tsx`**.
- That page:
  - Checks permission via **`GET /api/staff/:id/menu`**.
  - If **no permission**: shows “Access Denied” and a link back to teacher dashboard.
  - If **has permission**: does **not** render the real admin module; it shows a **placeholder**: “This feature is being integrated into the teacher portal” and “This module is available in the admin dashboard”.
- **Issue:** Teachers with permission see a message that the feature is “being integrated” and are not given the actual feature (no iframe, no embedded app, no redirect to admin with token). So from a user perspective, **these modules are not working** in the teacher portal.
- **Recommendation:** Either (a) implement or embed the real feature for teachers (e.g. iframe to admin with a teacher-scoped token, or rebuild a teacher-specific view), or (b) remove these items from the teacher menu until they are available, or (c) clearly label them as “Coming soon” so expectations are set.

### 3.3 Mark Attendance / My Class / etc. — no permission, only “class teacher”

- **Mark Attendance**, **My Class**, **Student Leave Approvals**, **Marks Entry** are shown only when the teacher is a **class teacher** (from **`GET /api/classes/teacher`**). If not class teacher, the pages show a message like “Not assigned as class teacher”.
- There is no separate “permission” from the menu API for these; visibility is driven only by class-teacher status. So if the menu API returns “Mark Attendance” for a non–class teacher (e.g. due to role), they would still see the “Not assigned” message on the page. That’s consistent, but worth documenting: **class-teacher-only pages ignore menu permission** and rely only on class assignment.

### 3.4 Teacher dashboard home — “All Staff” vs sidebar

- Home quick link “All Staff” goes to **`/teacher/dashboard/staff`** (see §3.1). Sidebar “Staff Information” goes to **`/teacher/dashboard/staff-management/directory`**. Unifying these avoids confusion.

### 3.5 Teacher change-password redirect

- Teacher change-password page uses **`router.push('/login')`** when there is no teacher in session (or after submit, if applicable). That’s consistent with the rest of the teacher app. Ensure **`/login`** (or the staff login entry point) is the intended destination for teachers after password change or session loss.

---

## 4. Cross-dashboard and API

### 4.1 Session keys and role

- **Student:** `student`, `role` (expects `'student'`).
- **Teacher:** `teacher`, `teacher_authenticated`, `role` (expects `'teacher'` for teacher layout).
- If the same browser is used for both roles (e.g. testing), switching roles requires logging in again; the two dashboards don’t share a single “current user” model. No bug, but be aware when testing.

### 4.2 API error and 401 handling

- **API interceptor** (e.g. in `api-interceptor`) is set up in both student and teacher layouts to logout on **401** and clear session / redirect to login. So expired or invalid sessions should trigger a redirect. Ensure every dashboard fetch goes through the same client (or same fetch wrapper) so 401 is consistently handled and the user is sent to the correct login (student vs generic `/login`).

### 4.3 Inconsistent response handling

- Some pages check **`response.ok && result.data`** and ignore **`result.error`** when `response.ok` is true. A few APIs might return **200** with **`result.error`** set; those errors would not be shown. Prefer: if **`result.error`** is present, treat as failure and show it (or a generic message) in the UI.

---

## 5. Summary table

| Area | Issue | Severity | Suggested fix |
|------|--------|----------|----------------|
| Student | Login redirect: mix of `/login` vs `/student/login` | Low | Use one convention everywhere |
| Student | Home calendar links → `/calendar`; menu → `/calendar/academic` | Medium | Point home to `/calendar/academic` or redirect `/calendar` → `/calendar/academic` |
| Student | Fees path `/fees` only redirects to `/fees/v2` | Low | Optionally set menu to `/fees/v2` |
| Student | Change password: no redirect after success; possible 401 later | Low | Redirect to `/student/login` and clear session after success (if backend invalidates session) |
| Student | Some pages don’t show API error to user | Medium | Show `result.error` or generic message + retry where relevant |
| Teacher | Two staff URLs: `/staff` and `/staff-management/directory` | Low | Use one URL; link “All Staff” to directory |
| Teacher | Fees/Timetable/Transport/Reports etc. show placeholder only | High | Implement or embed real feature, or remove/relabel as “Coming soon” |
| Both | Logout/session clear scope (student only clears student/role) | Low | Document or expand clear on logout |

---

## 6. What’s working as intended

- **Student:** Home, Class, Attendance, Examinations, Marks, Report card, Copy checking, Fees (v2), Transport, Apply leave, My leaves, Certificates, Library, Gallery, Communication, Parent info, Settings, Change password (flow works; post-success behavior can be improved as above).
- **Teacher:** Home, Mark Attendance (for class teachers), My Attendance, Marks Entry (for class teachers), Examinations, My Class (for class teachers), Classes, Apply leave, My leaves, Student leave approvals (for class teachers), Institute info, Students, Library, Certificates, Gallery, Academic calendar, Digital diary, Copy checking, Staff directory (via staff-management/directory), Communication, Settings, Change password. Class-teacher gating and menu visibility are consistent.
- **Auth:** Session in `sessionStorage`, layout guards, and 401 interceptor are in place for both dashboards.

Use this audit to fix redirect and UX inconsistencies first, then address the teacher placeholder modules and any error-handling gaps you care about most.
