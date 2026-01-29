# Cursor Prompt — School ERP Mobile App

Use this as a **Cursor rule** or **project prompt** when building the School ERP mobile app. Paste it into `.cursorrules` in the mobile repo or keep it in the project docs and reference it. The goal is to build a mobile client that uses the **exact same backend (Next.js API + Supabase)** and **same workflows** as the web app.

---

## Project identity

- **App**: School ERP mobile client (iOS and Android).
- **Backend**: Same as the web ERP — a Next.js app exposing REST APIs under `/api/*` and using a single Supabase project (same database tables, same business logic).
- **Principle**: The mobile app is a **client only**. It does not reimplement business logic, validation, or database access. It calls the existing API with the same request/response contracts and uses the same Supabase project for data. UI and navigation are mobile-native; data and workflows are identical to the web.

---

## Tech stack (use these)

- **Framework**: React Native with **Expo** (managed workflow).
- **Language**: **TypeScript** everywhere.
- **Backend / API**: **Same Next.js API** as the web app. Base URL from env (e.g. `EXPO_PUBLIC_API_BASE_URL`). All data operations go through this API; do not duplicate endpoints or logic.
- **Database**: **Same Supabase project** as the web app. Use only for:
  - Optional real-time or direct reads if the backend explicitly supports it (e.g. with anon key + RLS).
  - Prefer calling the Next.js API for all mutations and most reads so workflows stay in one place.
- **Server state / API calls**: **TanStack Query (React Query)** — use for all API requests (loading, error, cache, refetch). Same endpoints and response shapes as the web.
- **Auth storage**: **expo-secure-store** for the session token (and optionally role/school_code). Never store the session token in AsyncStorage in production.
- **HTTP client**: **fetch** or **axios** with a single base URL and a function that attaches the session token (e.g. `Authorization: Bearer <token>`) to every request.
- **Forms / validation**: **React Hook Form** with **Zod** — same validation rules and error handling as the web where applicable.
- **Navigation**: **Expo Router** (file-based) or **React Navigation** (stack + tabs). Match the web’s role-based sections: e.g. Teacher (dashboard, examinations, students, marks, …), Student (dashboard, fees, attendance, …), School Admin (dashboard, students, staff, …), Accountant (dashboard, fees, …).
- **UI / styling**: **NativeWind** (Tailwind for React Native) or **React Native Paper** or **Tamagui**. Prefer one system; keep components simple and accessible.

---

## Backend contract (do not change from the mobile)

- **Base URL**: All API requests go to `EXPO_PUBLIC_API_BASE_URL` (e.g. `https://your-erp.com` or `http://192.168.x.x:3000` in dev). No hardcoded URLs.
- **Auth (mobile)**:
  - **Login**: POST to the same login endpoints as web (e.g. `/api/auth/teacher/login`, `/api/auth/student/login`, `/api/auth/login`, `/api/auth/accountant/login`) with the same JSON body (school_code, staff_id/admission_no, password, etc.). Send header `X-Client: mobile` so the backend can return the session token in the response body.
  - **Session token**: Backend returns `session_token` in the JSON when `X-Client: mobile` is present. Store this in SecureStore. On every subsequent request, send `Authorization: Bearer <session_token>` or `X-Session-Token: <session_token>`.
  - **Session check**: GET `/api/auth/session` with the same header. If 200, use `role`, `school_code`, `user`; if 401, redirect to login and clear stored token.
  - **Logout**: POST `/api/auth/logout` with the same auth header; then clear SecureStore and navigate to login.
- **Request/response**: Use the **exact same** request bodies and query params as the web app. Response shapes (e.g. `{ success, teacher }`, `{ data: [...] }`) must be consumed as the web does. Do not assume different field names or structures unless the backend explicitly documents a mobile-only contract.
- **Errors**: API returns 4xx/5xx with JSON `{ error: string }` or similar. Handle 401 as “session expired” (clear token, go to login); surface other errors to the user in a consistent way.

---

## Roles and modules (same as web)

- **Roles**: School Admin, Teacher, Student, Accountant. Each has a separate login endpoint and a different dashboard/modules.
- **School Admin**: Login with school_code + password. Dashboard, students, staff, classes, timetable, examinations, marks, fees, attendance, leave, communication, certificates, etc.
- **Teacher**: Login with school_code + staff_id + password. Dashboard, examinations (view all date-wise), marks entry, students (view/list), my class, my leaves, tasks, etc.
- **Student**: Login with school_code + admission_no + password. Dashboard, attendance, marks, fees, examinations, leave, communication, etc.
- **Accountant**: Login with school_code + staff_id + password. Dashboard, fees, financial reports, etc.

When adding a screen, use the **same API route** the web uses for that feature (e.g. teacher examinations → GET `/api/examinations/v2/teacher?school_code=...`). Do not invent new endpoints; if the web passes query params or body, the mobile should do the same.

---

## File and folder structure (suggested)

- **`app/`** (Expo Router) or **`src/screens/`**: One folder per role or feature area (e.g. `auth/`, `teacher/`, `student/`, `admin/`, `accountant/`). Inside: login screen, dashboard, list/detail screens matching web modules.
- **`api/`** or **`services/api.ts`**: Single API client — base URL from env, attach auth header from SecureStore, thin wrappers per endpoint (e.g. `getSession()`, `teacherLogin(body)`, `getExaminations(schoolCode)`). Use TanStack Query hooks in components, not raw fetch in every screen.
- **`hooks/`**: e.g. `useSession()`, `useAuth()`, `useLogout()` — read token, call GET `/api/auth/session`, expose user/role/school_code and loading/error.
- **`store/`** or **`context/`**: Optional minimal global state (e.g. current user, role, school_code) populated from session API; avoid duplicating server state that React Query already holds.
- **`components/`**: Reusable UI (buttons, cards, inputs, list items). Prefer functional components and TypeScript.
- **`constants/`**: e.g. API base URL key, storage keys, role names.
- **`types/`**: Shared types (Teacher, Student, Exam, etc.). Align with web/API response shapes; consider sharing types with the web repo if using a monorepo.

---

## Rules for AI / developers

1. **Never duplicate business logic.** Validation, permissions, and data rules live in the Next.js API and Supabase. The app only calls the API and displays results.
2. **Same API, same contract.** For every feature, find the web’s API route and use it with the same method, path, query, and body. Response types in TypeScript should match the API response.
3. **Auth first.** Every authenticated request must send the session token in the header. Unauthenticated requests only for login and public pages (e.g. demo).
4. **SecureStore for secrets.** Session token must be stored in SecureStore. Do not log it or put it in AsyncStorage for production.
5. **React Query for server state.** Use `useQuery` for GETs and `useMutation` for POST/PUT/DELETE. Same cache keys and refetch strategy as needed (e.g. refetch on focus for lists).
6. **One API client.** Centralize base URL and auth header attachment. All endpoints go through this client so changing base URL or auth format is done in one place.
7. **Role-based navigation.** After login, route by role (teacher → teacher stack, student → student stack, etc.). Match the web’s section structure.
8. **Errors and loading.** Every API call should have loading and error handling. Use React Query’s `isLoading`, `isError`, `error`; show user-friendly messages and retry where appropriate.
9. **Accessibility and performance.** Use accessible labels, avoid huge lists without virtualization; keep forms and lists responsive.
10. **No backend changes unless agreed.** If the API is missing something, prefer extending the existing Next.js API (e.g. optional `X-Client: mobile` and returning `session_token`) rather than inventing a new backend or Supabase-only flow. Document any required backend change in a short “Backend” section in the PR or doc.

---

## Example: Teacher login and examinations (pseudocode)

- **Login**:  
  `POST ${API_BASE}/api/auth/teacher/login`  
  Body: `{ school_code, staff_id, password }`  
  Header: `X-Client: mobile`  
  On success: save `response.session_token` in SecureStore; save role/school_code if returned; navigate to Teacher dashboard.

- **Session**:  
  `GET ${API_BASE}/api/auth/session`  
  Header: `Authorization: Bearer ${token}`  
  Use response for current user and role.

- **Examinations list**:  
  `GET ${API_BASE}/api/examinations/v2/teacher?school_code=${schoolCode}`  
  Header: `Authorization: Bearer ${token}`  
  Use TanStack Query; display list; same data shape as web (exam_name, start_date, end_date, subject_mappings, etc.).

- **Logout**:  
  `POST ${API_BASE}/api/auth/logout`  
  Header: `Authorization: Bearer ${token}`  
  Clear SecureStore; navigate to login.

---

## Summary

- **What**: Mobile client for the existing School ERP (same API, same Supabase, same workflows).
- **Stack**: React Native, Expo, TypeScript, TanStack Query, SecureStore, same API base URL, token in header.
- **How**: One API client, same endpoints and contracts as web, role-based screens, no duplicate business logic.
- **Auth**: Login → store session_token (SecureStore) → send token on every request → logout clears token and calls API logout.

Use this prompt when generating or reviewing code for the mobile app so that it stays aligned with the web backend and Supabase.
