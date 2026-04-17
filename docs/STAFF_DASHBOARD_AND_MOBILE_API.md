# Staff (teacher) portal — module-by-module API & tables

Reference for the **React Native** app: same **`/api/*`** as web. Web paths are **labels only** (`/teacher/dashboard/...`).

**Auth:** `POST /api/auth/teacher/login` (cookie session). `GET /api/auth/session` returns `{ role, user }`. Mobile must send cookies or use the pattern in `docs/MOBILE_APP_GUIDE.md`.

**Menu gating:** `app/teacher/layout.tsx` — class teacher = non-empty `GET /api/classes/teacher` **`data`**; subject teacher (marks) = non-empty `GET /api/teachers/teaching-assignments` **`data.assignments`**; RBAC extras = `GET /api/staff/{id}/menu`.

---

## Menu index (teaching staff)

| Module | Web path | Who sees it |
|--------|----------|-------------|
| Home | `/teacher/dashboard` | Teaching |
| Mark Attendance | `/teacher/dashboard/attendance` | Class teacher |
| My Attendance | `/teacher/dashboard/attendance-staff` | Teaching |
| My Timetable | `/teacher/dashboard/my-timetable` | Teaching |
| Marks Entry | `/teacher/dashboard/marks` | Class teacher **or** timetable assignments |
| Non-Scholastic Marks | `/teacher/dashboard/non-scholastic-marks` | Class teacher |
| Examinations | `/teacher/dashboard/examinations` | Teaching |
| My Class | `/teacher/dashboard/my-class` | Class teacher |
| Classes | `/teacher/dashboard/classes` | Teaching |
| Student Management | `/teacher/dashboard/students` | Teaching |
| Academic Calendar | `/teacher/dashboard/calendar` | Teaching |
| Digital Diary | `/teacher/dashboard/homework` | Teaching |
| Copy Checking | `/teacher/dashboard/copy-checking` | Teaching |
| Apply for Leave | `/teacher/dashboard/apply-leave` | Teaching |
| My Leaves | `/teacher/dashboard/my-leaves` | Teaching |
| Student Leave Approvals | `/teacher/dashboard/student-leave-approvals` | Class teacher |
| Institute Info | `/teacher/dashboard/institute-info` | Teaching |
| Library | `/teacher/dashboard/library` | Teaching |
| Certificate Management | `/teacher/dashboard/certificates` | Teaching |
| Gallery | `/teacher/dashboard/gallery` | Teaching |
| Staff Information | `/teacher/dashboard/staff-management/directory` | Teaching |
| Communication | `/teacher/dashboard/communication` | Teaching |
| Settings | `/teacher/dashboard/settings` | Teaching |
| Change Password | `/teacher/dashboard/change-password` | Teaching |

**Non-teaching staff:** reduced menu + redirect (`lib/staff-teaching-role.ts`, `NON_TEACHING_TEACHER_PORTAL_MENU_IDS`).

**Permission-based extras:** Fees, Timetable (admin), Transport, Reports, Gate pass, etc. appear when `GET /api/staff/{id}/menu` / derived permission keys match. They reuse **admin** APIs under `/teacher/dashboard/...`; tables are whatever those routes query (not duplicated here).

---

## 0. Session, login, staff menu (cross-cutting)

### 0a. Login & session

| API | Tables / storage | Read / write |
|-----|------------------|--------------|
| `POST /api/auth/teacher/login` | `accepted_schools` (hold check), `staff_login`, `staff`, `sessions` | Validates credentials; inserts **session** row; sets cookie |
| `GET /api/auth/session` | `sessions` | Reads session by cookie; returns `user` payload |

### 0b. Staff menu & RBAC (dynamic sidebar + permission keys)

| API | Tables | Read / write |
|-----|--------|--------------|
| `GET /api/staff/{id}/menu` | `staff`; `classes` (class-teacher check); `staff_subjects`; `staff_roles` → `roles`; `role_permissions` → `sub_modules`, `modules`, `permission_categories`; `staff_permissions` (same joins); optional `sub_modules` fetch for fallback | **Read** merged view/edit flags per sub-module |
| Admin assign roles (web) | `staff`; `staff_roles`; `roles` | `GET /api/admin/staff`; `GET /api/staff/{id}/roles`; `POST /api/staff/{id}/roles` replaces rows in **`staff_roles`** |

### 0c. Class teacher & teaching scope

| API | Tables | Read / write |
|-----|--------|--------------|
| `GET /api/classes/teacher` | `classes` (filter `class_teacher_id` / `class_teacher_staff_id`); `students` (count per class) | **Read** |
| `GET /api/teachers/teaching-assignments` | `timetable_slots` (all school slots, filtered in code); `classes`; `subjects` | **Read** — builds class → subject list for staff UUID |

---

## 1. Home (`/teacher/dashboard`)

| API | Tables | Fetched / written |
|-----|--------|-------------------|
| `GET /api/students?school_code=` | `accepted_schools`; `academic_years` (current); **`students`** | **Read** student list columns (see `app/api/students/route.ts` `studentFields`) |
| `GET /api/classes/teacher?...` | `classes`; `students` (counts) | **Read** assigned classes |
| `GET /api/timetable/slots?school_code=&teacher_id=` | **`timetable_slots`**; `staff`; `classes`; `subjects`; `timetable_period_groups`; `accepted_schools` | **Read** teacher slots |
| `GET /api/teacher/grade-distribution?...` | **`classes`**; **`exam_summaries`** or **`student_subject_marks`** | **Read** grade buckets / pass rate |
| `GET|POST /api/teacher/todos`, `PATCH|DELETE /api/teacher/todos/:id` | `accepted_schools`; **`teacher_todos`** | **Read / write** todos |
| `GET /api/timetable/daily-agenda?...` | **`timetable_slots`**; **`teacher_todos`** | **Read** merged day view |
| `GET /api/attendance/staff?...` | `accepted_schools`; **`staff_attendance`** | **Read** staff attendance rows |
| `GET /api/examinations/v2/teacher?...` | **`examinations`**; **`exam_class_mappings`**; **`exam_subject_mappings`**; **`classes`**; **`subjects`**; **`timetable_slots`** (via lib); **`staff`**; **`staff_subjects`** | **Read** exams scoped to teacher |
| `GET /api/communication/notices?...` | `accepted_schools`; **`notices`** | **Read** notice list |
| `GET /api/calendar/notifications?...` | **`event_notifications`** | **Read** unread events |
| `GET /api/staff-subjects/{staffUuid}?...` | **`staff`**; **`staff_subjects`**; **`subjects`** | **Read** assigned subjects |
| `GET /api/students?class=&section=&...` | **`students`** | **Read** roster slice |
| `GET /api/leave/student-requests?...` | **`student_leave_requests`**; `students`; `leave_types` | **Read** pending leaves (school-wide filter) |

---

## 2. Mark attendance (`/teacher/dashboard/attendance`)

| API | Tables | Fetched / written |
|-----|--------|-------------------|
| `GET /api/classes/teacher?...` | `classes`; `students` | **Read** |
| `GET /api/attendance/class?class_id=&date=&school_code=` | **`student_attendance`**; `students`; `staff` | **Read** existing marks + names |
| `GET /api/students?class=&section=&academic_year=` | **`students`** | **Read** roster |
| `POST /api/attendance/mark` | `accepted_schools`; `classes`; **`staff`**; **`student_attendance`** | **Insert** attendance rows |
| `PATCH /api/attendance/update` | `classes`; `staff`; **`student_attendance`** | **Update** rows |

---

## 3. My attendance (`/teacher/dashboard/attendance-staff`)

| API | Tables | Fetched / written |
|-----|--------|-------------------|
| `GET /api/attendance/staff?school_code=&staff_id=&start_date=&end_date=` | `accepted_schools`; **`staff_attendance`** (optional POST path uses `staff` too) | **Read** |

---

## 4. My timetable (`/teacher/dashboard/my-timetable`)

| API | Tables | Fetched / written |
|-----|--------|-------------------|
| `GET /api/timetable/period-groups?school_code=` | `accepted_schools`; **`timetable_period_groups`**; **`timetable_periods`** | **Read** period definitions |
| `GET /api/timetable/slots?school_code=&teacher_id=` | **`timetable_slots`**; `staff`; `classes`; `subjects`; … | **Read** |

---

## 5. Marks entry — scholastic (`/teacher/dashboard/marks`)

| API | Tables | Fetched / written |
|-----|--------|-------------------|
| `GET /api/examinations/v2/teacher?...` | **`examinations`**; **`exam_class_mappings`**; **`exam_subject_mappings`**; **`classes`**; **`subjects`**; **`timetable_slots`** (teaching map); **`staff`**; **`staff_subjects`** | **Read** exams + trimmed mappings + `teaching_assignments` / `class_teacher_class_ids` |
| `GET /api/examinations/{examId}?school_code=` | **`examinations`**; **`exam_class_mappings`**; **`exam_subject_mappings`**; **`classes`**; **`subjects`**; `staff` (created_by) | **Read** full exam payload |
| `GET /api/examinations/{examId}/class-mappings?school_code=&class_id=` | **`examinations`**; **`exam_subject_mappings`**; **`subjects`** | **Read** all subject mappings for class (class-teacher grid) |
| `GET /api/classes/teacher?...` | `classes`; `students` | **Read** |
| `GET /api/classes?school_code=&id=` | **`classes`** | **Read** |
| `GET /api/students?...&status=active` | **`students`** | **Read** |
| `GET /api/examinations/marks?exam_id=&student_id=` | **`student_subject_marks`**; **`exam_subject_mappings`**; `accepted_schools` | **Read** |
| `GET /api/examinations/marks/status?...` | **`student_subject_marks`** | **Read** lock flags |
| `POST /api/examinations/marks` | **`student_subject_marks`**; **`exam_subject_mappings`**; **`student_exam_summary`**; **`marks_entry_audit`**; `accepted_schools` | **Upsert** marks; audit |

---

## 6. Non-scholastic marks (`/teacher/dashboard/non-scholastic-marks`)

| API | Tables | Fetched / written |
|-----|--------|-------------------|
| `GET /api/classes/teacher?...&array=true` | `classes`; `students` | **Read** |
| `GET /api/term-structures?school_code=` | `accepted_schools`; **`exam_term_structures`** | **Read** |
| `GET /api/exam-terms/for-class?...` | **`classes`**; **`exam_terms`** | **Read** |
| `GET /api/non-scholastic-marks?...` | **`classes`**; **`students`**; **`class_subjects`** (→ **`subjects`**); **`non_scholastic_marks`** | **Read** |
| `POST /api/non-scholastic-marks` | **`non_scholastic_marks`** (upsert) | **Write** |

---

## 7. Examinations list (`/teacher/dashboard/examinations`)

| API | Tables | Fetched / written |
|-----|--------|-------------------|
| `GET /api/examinations/v2/teacher?...` | Same as §5 | **Read** |

---

## 8. My class (`/teacher/dashboard/my-class`)

| API | Tables | Fetched / written |
|-----|--------|-------------------|
| `GET /api/classes/teacher?...&array=true` | `classes`; `students` | **Read** |
| `GET /api/students?...&status=active` | **`students`** | **Read** |

---

## 9. Classes (`/teacher/dashboard/classes`)

| API | Tables | Fetched / written |
|-----|--------|-------------------|
| `GET /api/classes?school_code=` | `accepted_schools`; **`classes`**; `students` (counts); `staff` (class teacher names) | **Read** |
| `GET /api/students?class=&section=&academic_year=` | **`students`** | **Read** (per-class list / count) |

---

## 10. Student management (`/teacher/dashboard/students`)

| API | Tables | Fetched / written |
|-----|--------|-------------------|
| `GET /api/students?school_code=` | `accepted_schools`; **`academic_years`**; **`students`** | **Read** directory (permission middleware may require staff headers) |
| `GET /api/student/fees?...` (detail) | **`students`**; **`student_fees`** | **Read** |
| `GET /api/student/transport?...` (detail) | **`students`**; **`transport_routes`**; **`transport_stops`** | **Read** |

---

## 11. Academic calendar (`/teacher/dashboard/calendar`)

| API | Tables | Fetched / written |
|-----|--------|-------------------|
| `GET /api/calendar/academic?school_code=&academic_year=` | **`events`**; **`academic_calendar`**; **`exam_schedules`** + **`examinations`** (optional merge) | **Read** |

---

## 12. Digital diary (`/teacher/dashboard/homework`)

| API | Tables / bucket | Fetched / written |
|-----|------------------|-------------------|
| `GET /api/classes/academic-years?school_code=` | **`classes`**; **`students`** (derive years) | **Read** |
| `GET /api/diary?...` | **`diaries`**; **`diary_targets`**; **`diary_attachments`**; **`diary_reads`** | **Read** |
| `GET /api/diary/stats?...` | **`diaries`** | **Read** |
| `GET /api/diary/:id` | **`diaries`** | **Read** |
| `POST /api/diary` / `PUT /api/diary/:id` / `DELETE /api/diary/:id` | **`diaries`**; **`diary_targets`**; **`diary_attachments`**; `accepted_schools` | **Write** |
| `POST /api/diary/upload` | Storage **`diary-attachments`** | **Upload** file |

---

## 13. Copy checking (`/teacher/dashboard/copy-checking`)

| API | Tables | Fetched / written |
|-----|--------|-------------------|
| `GET /api/classes/teacher?...` | `classes`; `students` | **Read** |
| `GET /api/timetable/slots?...` | **`timetable_slots`**; … | **Read** |

---

## 14. Apply for leave (`/teacher/dashboard/apply-leave`)

| API | Tables | Fetched / written |
|-----|--------|-------------------|
| `GET /api/leave/types?school_code=` | **`leave_types`**; `accepted_schools` (admin writes) | **Read** |
| `POST /api/leave/requests` | **`staff_leave_requests`**; **`staff`**; **`leave_types`** | **Insert** |

---

## 15. My leaves (`/teacher/dashboard/my-leaves`)

| API | Tables | Fetched / written |
|-----|--------|-------------------|
| `GET /api/leave/types?school_code=` | **`leave_types`** | **Read** |
| `GET /api/leave/requests?school_code=&staff_id=` | **`staff_leave_requests`** | **Read** |
| `POST /api/leave/requests/:id/withdraw` | **`staff_leave_requests`** | **Update** status |

---

## 16. Student leave approvals (`/teacher/dashboard/student-leave-approvals`)

| API | Tables | Fetched / written |
|-----|--------|-------------------|
| `GET /api/leave/student-requests/class-teacher?...` | **`classes`**; **`students`**; **`student_leave_requests`**; **`leave_types`** | **Read** |
| `PATCH /api/leave/student-requests/:id/class-teacher-approval` | **`student_leave_requests`**; **`students`**; **`classes`** | **Update** approve/reject |

---

## 17. Institute info (`/teacher/dashboard/institute-info`)

| API | Tables | Fetched / written |
|-----|--------|-------------------|
| `GET /api/schools/accepted` | **`accepted_schools`** | **Read**; client picks row by `school_code` |

---

## 18. Library (`/teacher/dashboard/library`)

| API | Tables | Fetched / written |
|-----|--------|-------------------|
| `GET /api/library/books?school_code=` | **`library_books`**; **`library_sections`**; **`library_material_types`**; **`library_book_copies`** | **Read** catalogue + copy status |

---

## 19. Certificate management (`/teacher/dashboard/certificates`)

| API | Tables / bucket | Fetched / written |
|-----|------------------|-------------------|
| `GET /api/classes/teacher?...` | `classes`; `students` | **Read** |
| `GET /api/students?...` | **`students`** | **Read** |
| `GET /api/certificates/simple?school_code=` | **`simple_certificates`**; **`students`** | **Read** |
| `POST /api/certificates/simple/upload` | **`accepted_schools`**; **`students`**; storage **`certificates`**; **`simple_certificates`** | **Upload** + **insert** row |

---

## 20. Gallery (`/teacher/dashboard/gallery`)

| API | Tables / bucket | Fetched / written |
|-----|------------------|-------------------|
| `GET /api/gallery?school_code=&category=` | **`gallery`**; **`staff`** (uploader); `accepted_schools`; storage **`school-media`** | **Read** |

---

## 21. Staff information (`/teacher/dashboard/staff-management/directory`)

| API | Tables | Fetched / written |
|-----|--------|-------------------|
| `GET /api/staff?school_code=` | **`staff`**; optional **`timetable_subjects`** / joins per route | **Read** directory |

---

## 22. Communication (`/teacher/dashboard/communication`)

| API | Tables | Fetched / written |
|-----|--------|-------------------|
| `GET /api/communication/notices?...` | `accepted_schools`; **`notices`** | **Read** |

---

## 23. Settings (`/teacher/dashboard/settings`)

| API | Tables / bucket | Fetched / written |
|-----|------------------|-------------------|
| `GET /api/staff/:id` | **`staff`** | **Read** profile |
| `PATCH /api/staff/:id` | **`staff`** | **Update** profile |
| `GET /api/staff/photos/self` (or per-id photo route) | **`staff`**; storage **`staff-photos`** | **Read** / **upload** photo |

---

## 24. Change password (`/teacher/dashboard/change-password`)

| API | Tables | Fetched / written |
|-----|--------|-------------------|
| `POST /api/staff/change-password` | **`staff`**; **`staff_login`** | **Verify** + **update** password |

---

## Admin: class teacher & timetable (data model)

| Assignment | Table / object | Field / row |
|------------|----------------|-------------|
| Class teacher | **`classes`** | `class_teacher_id` (staff UUID), `class_teacher_staff_id` (employee id) |
| Subject on timetable | **`timetable_slots`** | `teacher_id` / `teacher_ids`, `class_id`, `subject_id`, `school_code` |
| Subject directory (optional) | **`staff_subjects`** | `staff_id`, `subject_id`, `school_code` |

---

*Generated from `app/teacher/dashboard/*`, `app/teacher/layout.tsx`, and `app/api/*` route handlers. Permission-based screens reuse additional admin APIs not listed here.*
