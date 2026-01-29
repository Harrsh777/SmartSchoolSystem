# School ERP — Mobile App Guide

This document explains how to start the mobile app for the same School ERP system, using the **same Supabase tables and same API/workflow** as the web app. It covers theory, tech stack, and step-by-step setup.

---

## 1. Goal

- **One backend**: Same Next.js API (`/api/*`) and same Supabase project (same tables, RLS, storage).
- **Same workflows**: Login (school admin, teacher, student, accountant), dashboard, students, staff, classes, timetable, examinations, marks, fees, attendance, leave, communication, etc.
- **Mobile-native UX**: Same data and flows, but UI adapted for mobile (navigation, touch, offline-friendly where needed).

---

## 2. Recommended Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Framework** | **React Native + Expo** | Same language (TypeScript/JavaScript) as your Next.js app; one codebase for iOS and Android; fast iteration with Expo; easy to share types and API client logic with web. |
| **Language** | **TypeScript** | Same as web; share types (e.g. Student, Staff, Exam) between web and mobile if you use a monorepo or shared package. |
| **Backend** | **Same Next.js API** (your existing `school` app) | Reuse all routes under `/api/*`; no duplicate business logic. |
| **Database / Auth** | **Same Supabase project** | Same `accepted_schools`, `staff`, `students`, `staff_login`, `student_login`, `examinations`, `classes`, etc. Optionally use Supabase client in the app for real-time (e.g. live notices) or direct reads if you add RLS and anon key. |
| **State / Server state** | **TanStack Query (React Query)** | Caching, refetch, loading/error states for API calls; fits REST + same endpoints. |
| **Navigation** | **Expo Router** (file-based) or **React Navigation** | Stack + tab navigation for dashboard, students, exams, etc. |
| **Forms / Validation** | **React Hook Form + Zod** | Same validation approach as web; reuse Zod schemas if shared. |
| **Secure storage** | **expo-secure-store** | Store session token (and optionally role/school_code) after login; never use AsyncStorage for tokens in production. |
| **UI components** | **NativeWind (Tailwind for RN)** or **Tamagui** or **React Native Paper** | Consistent styling; NativeWind keeps Tailwind mental model from web. |

**Why not Flutter?**  
Flutter is a strong option for UI and performance, but your backend and team are already in the React/TypeScript ecosystem. React Native + Expo lets you reuse types, API contracts, and possibly shared validation/API client code, and one language across web and mobile.

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Mobile App (Expo / React Native)             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │ SecureStore │  │ API client   │  │ Same screens/workflows   │ │
│  │ (session    │  │ (baseURL =   │  │ Login, Dashboard,       │ │
│  │  token)     │  │  your API)   │  │ Students, Exams, etc.  │ │
│  └──────┬──────┘  └──────┬───────┘  └─────────────────────────┘ │
└─────────┼────────────────┼──────────────────────────────────────┘
          │                │
          │                │  HTTPS + Authorization: Bearer <token>
          │                │  (or X-Session-Token: <token>)
          ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│              Next.js API (same as web)                            │
│  /api/auth/teacher/login  /api/auth/student/login  /api/...     │
│  Auth: cookie (web) OR session token in header (mobile)          │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│              Supabase (same project as web)                       │
│  accepted_schools, staff, students, staff_login, student_login,  │
│  examinations, classes, timetable_slots, marks, fees, ...        │
└─────────────────────────────────────────────────────────────────┘
```

- **Mobile** calls the **same base URL** as the web app (e.g. `https://your-domain.com` or `http://localhost:3000` in dev).
- **Auth**: Web uses HttpOnly cookies (`session_id`, `auth_session`). Mobile cannot rely on cookies the same way for API calls, so:
  - **Option A (recommended)**: Login API returns a **session token** in the JSON body when the request is from the mobile client (e.g. header `X-Client: mobile`). Mobile stores this token in **SecureStore** and sends it on every request as `Authorization: Bearer <token>` or `X-Session-Token: <token>`. Your API’s `getSessionFromRequest` should accept **either** the cookie **or** this header so one backend serves both web and mobile.
  - **Option B**: Use Supabase Auth (email/password or magic link) for mobile and use Supabase’s JWT for API auth; then your API would need to validate Supabase JWT instead of (or in addition to) the session table. This is a bigger change; Option A reuses your existing session table and login logic.
- **Data**: All mutable data goes through your **Next.js API** (same workflow as web). Optionally, the app can use the **Supabase client** with the anon key for read-only or real-time features (e.g. live notices) if you expose and secure them via RLS.

---

## 4. How to Start — Step by Step

### Step 1: Create the mobile project

```bash
npx create-expo-app@latest school-erp-mobile --template tabs
cd school-erp-mobile
```

- Use **TypeScript** when prompted.
- If you prefer a blank app: `npx create-expo-app@latest school-erp-mobile --template blank-typescript`.

### Step 2: Install core dependencies

```bash
npx expo install expo-secure-store @tanstack/react-query axios
npm install zod react-hook-form @hookform/resolvers
```

- **expo-secure-store**: Store session token after login.
- **@tanstack/react-query**: Server state and caching for API calls.
- **axios**: HTTP client (or use `fetch`); same base URL as web.
- **zod + react-hook-form + @hookform/resolvers**: Forms and validation (align with web).

Optional: **NativeWind** for Tailwind-style styling:

```bash
npm install nativewind tailwindcss
npx tailwindcss init
```

### Step 3: Environment and API base URL

Create `.env` (and `.env.example` without secrets):

```env
EXPO_PUBLIC_API_BASE_URL=https://your-erp-domain.com
# For local dev (use your machine IP for device/emulator):
# EXPO_PUBLIC_API_BASE_URL=http://192.168.1.x:3000
```

- All API calls use `EXPO_PUBLIC_API_BASE_URL` (e.g. `GET ${API_BASE}/api/auth/session`).
- Never put secrets in the app; only the session token (obtained after login) is stored in SecureStore.

### Step 4: Auth flow for mobile

1. **Login screen**: Same inputs as web (e.g. school code, staff ID, password for teacher).  
   POST to the **same** login endpoint (e.g. `/api/auth/teacher/login`) with a header like `X-Client: mobile`.
2. **Backend change (one-time)**: For requests with `X-Client: mobile`, the login API returns the **session_token** in the JSON response (in addition to teacher/school/student object). Your API already creates a row in `public.sessions`; you just expose that token to the mobile client. Also, add in `getSessionFromRequest`: if `Authorization: Bearer <token>` or `X-Session-Token: <token>` is present, use that token to call `getSession(token)` instead of reading the cookie.
3. **Mobile**: On successful login, store `session_token` in **SecureStore** (e.g. key `session_token`). Store role/school_code in memory or SecureStore for convenience; the source of truth is GET `/api/auth/session` using that token.
4. **Subsequent requests**: Attach header `Authorization: Bearer <session_token>` (or `X-Session-Token: <session_token>`) to every API request.
5. **Logout**: POST to `/api/auth/logout` with the same token in the header; clear SecureStore and redirect to login.

### Step 5: Implement one role end-to-end (e.g. Teacher)

1. **Login**: Teacher login screen → POST `/api/auth/teacher/login` with `X-Client: mobile` → save token → navigate to Teacher dashboard.
2. **Session check**: On app launch, read token from SecureStore; if present, GET `/api/auth/session` with that token. If 200, go to dashboard; if 401, go to login.
3. **Dashboard**: Same data as web (e.g. stats, quick links). Use React Query to fetch from your existing API (you may add a small dashboard summary endpoint or use existing ones).
4. **One list screen**: e.g. Examinations — GET `/api/examinations/v2/teacher?school_code=XXX` (school_code from session). Display list; same workflow as web.
5. **One detail/action**: e.g. Marks entry or view exam details; call the same APIs as web.

Once one role works, replicate the same pattern for Student, School Admin, and Accountant.

### Step 6: Map web modules to mobile screens

Use the same API routes and same workflows; only the UI is mobile-native. Example mapping:

| Web section | Mobile | API / flow |
|-------------|--------|------------|
| Staff login | Teacher/Accountant login screen | POST `/api/auth/teacher/login` or `/api/auth/accountant/login` |
| Student login | Student login screen | POST `/api/auth/student/login` |
| Admin login | School admin login | POST `/api/auth/login` |
| Teacher dashboard | Teacher tab/stack | GET `/api/auth/session`, then dashboard APIs |
| Examinations (teacher) | Examinations screen | GET `/api/examinations/v2/teacher?school_code=...` |
| Student dashboard | Student tabs | GET `/api/student/stats`, etc. |
| Students list (teacher) | Students screen | Same API as web (e.g. students list by school/class) |
| Marks, fees, attendance, leave, communication | Same features | Same `/api/*` routes |

### Step 7: Supabase (optional)

- **Same tables**: No change; backend (Next.js) already uses them.
- **Direct Supabase from mobile**: Only if you need real-time or offline; use Supabase client with **anon** key and RLS so each user sees only their data. Prefer doing most writes through your API so business rules stay in one place.

---

## 5. Backend Adjustments for Mobile (Summary)

Two small changes in your **existing Next.js API** so the same backend serves mobile:

1. **Login responses**  
   When the request has header `X-Client: mobile` (or `X-Requested-With: mobile`), include **`session_token`** in the JSON response (you already create the session and have the token; just add it to the body for mobile). Web continues to rely on the Set-Cookie response; do not expose `session_token` in the body for web if you want to keep cookie-only there.

2. **Session resolution in API routes**  
   In `getSessionFromRequest` (or equivalent), resolve the session by:
   - First: session from cookie (for web).
   - Else: `Authorization: Bearer <token>` or header `X-Session-Token: <token>` (for mobile).  
   Then call `getSession(token)` and return the same session data. This way one backend works for both web (cookie) and mobile (header).

3. **CORS**  
   If the app runs on a different origin (e.g. Expo Go or a different subdomain), allow that origin in your Next.js API/CORS config for the relevant methods and headers (e.g. `Authorization`). For production, use your real API domain and HTTPS.

---

## 6. What to Build First (Priority)

1. **Project + env + API client** (base URL, attach token from SecureStore).
2. **Auth**: Login (one role, e.g. teacher) + token storage + session check + logout.
3. **Teacher dashboard** (or Student): One main screen after login using existing API.
4. **One list + one detail** (e.g. Examinations list → exam detail or marks).
5. **Other roles** (student, school admin, accountant) and remaining modules reusing the same API and patterns.

---

## 7. Cursor Prompt for the Mobile App

A detailed Cursor prompt is in **`MOBILE_APP_CURSOR_PROMPT.md`**. Use it in the mobile app repo (or as a Cursor rule) so the AI keeps the same API, same Supabase, and same workflows as the web ERP.
