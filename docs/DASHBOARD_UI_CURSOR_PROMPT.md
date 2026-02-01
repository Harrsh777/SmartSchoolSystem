# Dashboard UI/UX — In-Depth Cursor Prompt

**Route:** `http://localhost:8081/dashboard/[school]` (e.g. `/dashboard/SCH001`)  
**Page file:** `app/dashboard/[school]/page.tsx`  
**Layout:** `app/dashboard/[school]/layout.tsx` uses `DashboardLayout` from `components/DashboardLayout.tsx`.

Focus: **top-notch professional UI/UX**. Clean, modern, generous whitespace, rounded corners, clear typography, consistent iconography, and a soft palette (white + pastel accents). No clutter.

---

## 1. Top Section (Above the Fold)

### 1.1 Search Bar

- **Placement:** Top of the main content area, full width (or prominent in the header strip).
- **Placeholder:** `"Search menu..."` or `"ABC"` (school name / search hint). Search should filter or navigate to dashboard modules/pages (align with existing `searchableMenuItems` / quick search in `DashboardLayout.tsx`).
- **Behavior:** On input, show a dropdown of matching menu items (modules/sub-pages). Selecting an item navigates to `/dashboard/[school]<path>`. Reuse or mirror the existing search logic in `DashboardLayout` (e.g. `searchQuery`, `filteredSearchResults`, `getSearchableItems()`).
- **Aesthetics:** Rounded corners (e.g. `rounded-xl`), subtle border, optional search icon inside the field. Plenty of padding; avoid a cramped look.

### 1.2 Context Strip (Same Row or Directly Below Search)

Display in a single horizontal strip (or two short rows) so the user always sees:

- **School / Institute name:** e.g. "ABC" (from `school.school_name` or session/API).
- **ID:** `ID: SCH001` (use `schoolCode` from route params `[school]`).
- **Date:** Current date, formatted like `February 1, 2026` (locale-friendly, e.g. `toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })`).
- **Home:** A clear "Home" link/button that goes to `/dashboard/[school]` (current dashboard root). Can be text or a small icon + "Home".

Layout idea: `[Search bar]` on one row, then `ABC · ID: SCH001 · February 1, 2026 · Home` on the next (or same row on larger screens). Use separators (·) or subtle dividers; keep typography clear (e.g. one size for labels, one for values).

---

## 2. Statistics Section (Below Top Section)

Place a **statistics block** directly under the search + context strip. Use cards or a small grid so each stat is readable at a glance.

### 2.1 Stats to Show

| Stat Label              | Value Source | Example Display |
|-------------------------|-------------|-----------------|
| **Total Students**      | `stats.totalStudents` (from `/api/dashboard/stats`) | `8` |
| **Fees Collected This Month** | `stats.feeCollection.monthlyCollection` or equivalent monthly fee API | `₹0` (format as INR) |
| **Staff Attendance**   | `stats.todayAttendance.staff?.percentage` or equivalent | `0%` |
| **All Classes & Sections** | **Classes:** `classesCount` (from existing classes/sections API), **Sections:** `sectionsCount` | `Classes: 6`, `Sections: 10` |

- **Total Students:** One card or cell; big number, small label.
- **Fees Collected This Month:** One card; amount in ₹ (Indian Rupee). Use same dashboard stats API used elsewhere on the page.
- **Staff Attendance:** One card; percentage. Handle loading/empty state (e.g. show "—" or "0%").
- **All Classes & Sections:** One card (or two small sub-cards) with two lines: "Classes: 6" and "Sections: 10". Data from existing `classesCount` / `sectionsCount` state and `fetchClassesAndSections()` (or equivalent).

### 2.2 Layout and Style

- Use a **grid** (e.g. 2×2 on mobile, 4 columns on desktop) so all four stat blocks sit in one section.
- Each stat in a **card**: light background, rounded corners (`rounded-xl`), subtle shadow or border. Keep padding and spacing consistent.
- Typography: **label** small and muted (e.g. `text-sm text-muted-foreground`); **value** large and bold (e.g. `text-2xl font-semibold`).
- Optional: small icon per stat (e.g. Users for students, DollarSign for fees, UserCheck for staff attendance, BookOpen for classes/sections) for quick scanning.

---

## 3. Modules in Boxes (Replacing Sidebar as Primary Navigation on This Page)

Below the statistics section, show **all dashboard modules as a grid of boxes (cards)**, similar to the reference design: each box has an **icon** and a **label**. No sidebar list here; the main navigation on the dashboard page is this grid.

### 3.1 Module List (23 Items — Exact Order and Labels)

Use this exact list for the module grid. Map each to the same routes and icons used in `DashboardLayout` `menuItems` / `searchableMenuItems`:

| # | Label                     | Path (under `/dashboard/[school]`) | Suggested icon (lucide-react) |
|---|---------------------------|-------------------------------------|-------------------------------|
| 1 | Home                      | `` (empty = dashboard root)         | Home |
| 2 | Institute Info            | `/institute-info`                   | Building2 |
| 3 | Gallery                   | `/gallery`                           | Image |
| 4 | Admin Role Management     | `/settings/roles`                   | Shield |
| 5 | Password Manager          | `/password`                         | Key |
| 6 | Staff Management          | `/staff-management`                 | UserCheck |
| 7 | Classes                   | `/classes`                          | BookOpen |
| 8 | Students                  | `/students`                         | Users (or GraduationCap) |
| 9 | Timetable                 | `/timetable`                        | CalendarDays |
| 10 | Calendar                  | `/calendar`                        | CalendarDays |
| 11 | Examinations              | `/examinations`                     | FileText |
| 12 | Marks                     | `/marks`                            | GraduationCap |
| 13 | Fees                      | `/fees`                             | DollarSign |
| 14 | Library                   | `/library`                          | Library |
| 15 | Transport                 | `/transport`                       | Bus |
| 16 | Leave Management          | `/leave`                            | CalendarDays |
| 17 | Communication             | `/communication`                   | MessageSquare |
| 18 | Reports                   | `/reports`                          | FileBarChart |
| 19 | Certificate Management    | `/certificates`                     | Award |
| 20 | Digital Diary             | `/homework`                         | BookMarked |
| 21 | Expense/income            | `/expense-income`                   | TrendingUp |
| 22 | Front Office management   | `/front-office`                     | DoorOpen |
| 23 | Copy Checking             | `/copy-checking`                    | FileText |

- **Routing:** Each card links to `/dashboard/[school]<path>`. Use Next.js `Link` with `href={basePath + path}` where `basePath = /dashboard/${schoolCode}`.
- **Modals:** Where the app uses modals for Classes, Students, Timetable, Calendar, Library, Transport, Leave (see `DashboardLayout` `menuItems` with `isModal: true`), keep the same behavior: clicking the card can open the same modal or navigate to the same route the sidebar uses (per existing app behavior).

### 3.2 Grid Layout and Styling

- **Layout:** CSS Grid. Example: 2 columns on small screens, 3–4 on medium, 4–6 on large (e.g. `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4`).
- **Each module = one card:**
  - Light background (e.g. white or `bg-card`), rounded corners (`rounded-xl`), subtle shadow or border.
  - **Icon** on top (or top-left), medium size (e.g. 24–32px), in a distinct pastel or brand color per module (can reuse or derive from existing sidebar colors).
  - **Label** below (or beside) the icon, centered or left-aligned, readable (e.g. `text-sm font-medium`). Prefer wrapping for long labels (e.g. "Admin Role Management", "Certificate Management") rather than truncation.
- **Interaction:** Hover state (slight scale or background change). Entire card clickable (wrap in `Link` or use `router.push`). Optional: focus ring for accessibility.
- **Spacing:** Consistent gap between cards (e.g. `gap-4`); padding inside each card so the block doesn’t feel cramped.

### 3.3 Permissions

- If the app filters sidebar items by permission (e.g. `getSearchableItems()` / `usePermission`), **filter the module grid the same way**: only show cards for modules the current user is allowed to see. Use the same permission checks as in `DashboardLayout` so behavior is consistent.

---

## 4. UI/UX Principles (Must Follow)

- **Whitespace:** Generous padding and margins; avoid dense blocks of text or controls.
- **Rounded corners:** Use consistently (e.g. `rounded-lg` / `rounded-xl`) for search bar, stat cards, and module cards.
- **Typography:** Clear hierarchy (e.g. one size for section titles, one for labels, one for values). Prefer a simple sans-serif stack (e.g. existing Tailwind/font setup).
- **Color:** Light, professional palette. Prefer white/off-white backgrounds with pastel or muted accent colors for icons and highlights. Use semantic colors for success/warning/error only where needed.
- **Icons:** One icon per module; consistent style (e.g. all from `lucide-react`). Slightly larger and more colorful than plain text so the grid is scannable.
- **Responsiveness:** Top section, stats grid, and module grid must reflow for mobile and tablet. Search bar and context strip should stack or shrink gracefully.
- **Loading and empty states:** While stats or school data are loading, show skeletons or placeholders (e.g. "—" or shimmer). For modules, if the list is permission-filtered and empty, show a short message (e.g. "No modules available") instead of an empty grid.
- **Accessibility:** Use semantic HTML (e.g. headings for sections), `aria-label` on icon-only or ambiguous controls, and keyboard-focusable links/buttons.

---

## 5. Technical Notes

- **Data:** School name and code from route params and session/API (e.g. `sessionStorage` school object, `/api/schools/accepted`). Stats from `/api/dashboard/stats` and classes/sections from existing dashboard fetches (e.g. `fetchClassesAndSections`). Reuse existing state and API calls in `app/dashboard/[school]/page.tsx` where possible.
- **Search:** Reuse or share logic with `DashboardLayout` search (e.g. same `searchableMenuItems` and filtering). Build the search URL as `/dashboard/[school]<item.path>`.
- **Existing layout:** The page is rendered inside `DashboardLayout`, which may still show a sidebar. The prompt focuses on the **main content area** of the dashboard page: top strip (search + context), stats, then module grid. Sidebar can remain for other pages or be hidden/collapsed on the dashboard home if the product decision is to make the grid the primary nav on this page only.

---

## 6. Summary Checklist

When implementing or reviewing the dashboard at `/dashboard/SCH001`:

- [ ] Search bar at top with placeholder ("Search menu..." or "ABC"); results navigate to dashboard sub-routes.
- [ ] Context strip: School name (ABC), ID: SCH001, current date (e.g. February 1, 2026), Home link.
- [ ] Statistics section: Total Students, Fees Collected This Month (₹), Staff Attendance (%), Classes & Sections (Classes: 6, Sections: 10) in a card grid.
- [ ] Module grid: all 23 modules as icon + label cards, same order and labels as in the table, with correct routes and permission filtering.
- [ ] Professional, clean UI: whitespace, rounded corners, clear typography, pastel accents, responsive and accessible.

Use this document as the single source of truth for the structure, content, and style of the dashboard main page.
