# Production Readiness Analysis — School ERP

This document summarizes what is left to do to make the project production-ready, which modules may not be fully working, and rough scalability expectations.

---

## 1. Critical issues (must fix before production)

### 1.1 API routes are not protected by auth

- **Middleware** skips all `/api/*` requests (`isApiOrStatic` returns next()). So **no API route is protected at the edge**.
- **No API route** reads or validates the auth cookie (`parseAuthCookie` / `AUTH_COOKIE_NAME` are not used in `app/api`).
- Many routes accept `school_code` (and sometimes `staff_id`) from query/body only. Anyone who knows a school code can call them without logging in.

**Impact:** Unauthenticated access to school data (students, attendance, marks, fees, etc.) if the URL/params are known.

**What to do:**

- Add a shared auth helper used by all dashboard/teacher/student APIs that:
  - Reads the auth cookie (or a signed token) from the request.
  - Validates role and (for school) `school_code`.
  - Returns 401 when missing/invalid.
- Optionally enforce this in middleware for `/api/*` (except public routes like `/api/auth/*`, `/api/demo`, etc.) by validating cookie and returning 401 for invalid/missing auth.
- For each route, enforce that the requested `school_code` (or resource) belongs to the authenticated user/school.

### 1.2 Login credentials API exposes plain passwords without auth

- **Route:** `GET /api/dashboard/login-credentials?school_code=XXX&include_passwords=true`
- **Issue:** No check for auth cookie or role. Anyone can request all student/staff logins and **plain text passwords** for a school.

**What to do:**

- Require auth cookie (school admin/principal) and verify `school_code` matches the authenticated school.
- Prefer not exposing `plain_password` at all; if required for migration/support, restrict to a dedicated admin-only endpoint with strong auth and audit.

### 1.3 Permission checks “fail open”

- **`lib/api-permissions.ts`:** On RPC error or missing staff ID, the function **returns `null` (allow)**. So if permission check fails, access is granted.
- **`lib/permission-middleware.ts`** used by some routes: When **no staff ID** is sent, `requirePermission` returns `{ allowed: false }`, but the **students route** (and possibly others) then **allows the request** when `staffId` is missing (“for admin/principal access”). So “no staff ID” = full access.

**What to do:**

- In `api-permissions.ts`: On any error or missing/invalid auth, **return 403** (fail closed). Do not allow when permission cannot be verified.
- In routes using `permission-middleware`: Do **not** allow requests with no staff ID. Require auth cookie, resolve staff ID from the authenticated session, then check permission.

### 1.4 Session storage is client-side only

- Sessions are stored in **sessionStorage** (and partially cookie for middleware). There is no server-side session store; the server does not validate session content on API calls.
- **Risk:** Session hijacking (e.g. via XSS), and no way to invalidate sessions from the server.

**What to do (medium-term):**

- Prefer server-side sessions (e.g. store session id in httpOnly cookie, resolve session on server) or short-lived JWTs verified on each API call.
- Keep using the auth cookie for role/school at least, and validate it in API routes as in 1.1.

### 1.5 Test DB and debug endpoints

- **`/api/test-db`** exists and can expose DB structure/errors. It should not be reachable in production.

**What to do:**

- In production, return 404 or 403 for `/api/test-db` (e.g. guard by `NODE_ENV` or a feature flag), or remove the route.

---

## 2. High priority (should fix)

### 2.1 Environment and config

- **Env validation:** No startup validation that required env vars are set (e.g. `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). Missing vars cause runtime errors.
- **Hardcoded fallbacks:** e.g. `NEXT_PUBLIC_APP_URL || 'http://localhost:3000'` in `api/marks/export/route.ts`, and empty string fallback in certificates. In production, base URL should come from env and be validated.

**What to do:**

- Add a small startup module that validates required env and exits with a clear message if something is missing.
- Set `NEXT_PUBLIC_APP_URL` (and any other base URLs) in production env and remove `localhost` fallbacks.

### 2.2 Rate limiting

- There is **no rate limiting** on login or other APIs. Login and sensitive endpoints are open to brute force and abuse.

**What to do:**

- Add rate limiting (e.g. per IP and per user) for `/api/auth/*` and other sensitive routes (middleware or API-level). Consider a dedicated middleware or a provider (e.g. Upstash) if you need a distributed limit.

### 2.3 Parents portal is incomplete

- **`/parents`** page expects `sessionStorage.getItem('student')` and redirects to `/login` if missing.
- There is **no dedicated parent login** that sets this; the main login page is generic. So parents have no supported way to reach the parent dashboard.

**What to do:**

- Either implement a parent login (e.g. parent id + password or OTP, then set student context and auth cookie/token), or remove/disable the parents route until it’s implemented and document it as “coming soon”.

### 2.4 Inconsistent Supabase client usage

- Some API routes create a Supabase client using `process.env.NEXT_PUBLIC_SUPABASE_URL!` directly instead of `@/lib/supabase` or `@/lib/supabase-admin`. This can lead to inconsistent keys (e.g. anon vs service role) and behavior.

**What to do:**

- Use the shared `supabase` (server) or `getServiceRoleClient()` from `supabase-admin` everywhere in API routes, and avoid ad-hoc client creation.

### 2.5 Error handling and logging

- Many routes use generic messages (“Invalid credentials”, “Internal server error”) and `console.error`. No structured logging or error tracking.
- **PRODUCTION_ISSUES.md** already notes 1200+ console statements; in production these can leak information and add noise.

**What to do:**

- Introduce a small logger that in production does not log to console (or only in debug mode) and optionally forwards errors to a service (e.g. Sentry).
- Replace raw `console.*` with this logger where relevant, and keep user-facing messages generic while logging detailed server-side messages only via the logger.

---

## 3. Medium priority (improve robustness and UX)

### 3.1 Input validation

- Many APIs trust `school_code`, `staff_id`, and body fields without schema validation. Invalid data can cause 500s or bad DB state.

**What to do:**

- Add request validation (e.g. Zod) for query and body on sensitive routes; return 400 with clear messages for invalid input.

### 3.2 Staff ID storage inconsistency

- **staff_login.staff_id** is used in two ways: **display code** (e.g. STF002) and **staff UUID**. Teacher login was fixed to support both, but **change-password** still looks up by UUID only. If the row was created with display code, change-password may not find it.

**What to do:**

- Align all flows (teacher login, change-password, reset-password, etc.) to one convention (prefer display code in `staff_login.staff_id`) and migrate or dual-support as needed. Document the chosen convention.

### 3.3 Tests and CI

- **No tests** (no Jest/Playwright config, no `*.test.*` files). Regressions and refactors are not guarded.

**What to do:**

- Add a test suite (e.g. Jest + React Testing Library for unit/components, Playwright for critical E2E flows like login and one dashboard path). Run tests in CI on every PR.

### 3.4 Monitoring and alerts

- No APM, no error tracking, no uptime checks. Production issues will be hard to detect and debug.

**What to do:**

- Integrate error tracking (e.g. Sentry) and optionally APM. Add health checks (e.g. `/api/health`) and basic uptime/alerting.

### 3.5 Database migrations and backups

- No formal migration system or documented backup/restore for Supabase.

**What to do:**

- Use Supabase migrations (or similar) for schema changes. Document and test backup/restore and, if applicable, point-in-time recovery.

---

## 4. Lower priority (polish)

- **TODO/FIXME:** ~43 matches in 19 files; worth triaging and either implementing or documenting.
- **Color scheme / UI:** A few pages (examinations/marks-entry, library, transport) may still need the new color scheme applied for consistency.
- **Bundle size:** No analysis; consider `@next/bundle-analyzer` and code-splitting for heavy pages.
- **i18n:** Not implemented; add only if you need multiple languages.

---

## 5. What’s working (no change needed for “working”)

- **Auth flow (UI):** School admin, teacher, student, accountant login pages and redirects work; middleware protects **page** routes by cookie.
- **Session timer and 401 handling:** Session timeout and API interceptor (e.g. logout on 401 for same-origin API) are implemented.
- **Core modules (when used with valid session):** Dashboard, students, staff, classes, timetable, examinations, marks, fees (v2), leave, attendance, communication, certificates, library, transport, etc. have UI and APIs; issues are mainly **auth and permission** on the API side, not the feature logic itself.
- **Demo request:** Demo page and API save to `demo_requests` and handle booked slots.
- **Supabase:** Shared client with timeout/retry and env checks in `lib/supabase.ts`; service role client used appropriately in many APIs (security issue is who is allowed to call those APIs, not the client itself).
- **Error boundary:** Used in dashboard layout for catching React errors.

---

## 6. Summary checklist

| Area                | Status        | Action |
|---------------------|---------------|--------|
| API auth            | Not enforced  | Add cookie/token validation for all non-public APIs; tie `school_code` to authenticated school. |
| Login credentials API | Critical   | Require auth; do not expose plain passwords without strict control. |
| Permissions         | Fail open     | Fail closed on error; require auth and staff ID from session. |
| Session             | Client-only   | Move to server-side or verify tokens on server. |
| Test DB route       | Exposed       | Disable or restrict in production. |
| Env validation     | Missing       | Validate required env at startup. |
| Rate limiting       | Missing       | Add for login and sensitive APIs. |
| Parents portal      | Incomplete    | Add parent login or hide route. |
| Supabase usage      | Inconsistent  | Use shared lib everywhere. |
| Logging/monitoring  | Ad hoc        | Add logger and error tracking. |
| Input validation    | Partial       | Add Zod (or similar) on sensitive routes. |
| Tests/CI            | None          | Add tests and CI. |
| Migrations/backups  | Undocumented  | Use Supabase migrations; document backups. |

---

## 7. Concurrent users and scalability (rough estimate)

- **Architecture:** Next.js App Router, server-side API routes, single Supabase project (DB + auth). No Redis/caching layer, no horizontal scaling configuration in the repo.
- **Bottlenecks:**  
  - **Supabase:** Connection limits and query performance (no connection pooling or read replicas configured in app).  
  - **Next.js:** Single Node process by default; CPU-bound work (e.g. PDF generation, heavy SSR) can limit throughput.  
  - **No caching:** Every request hits the DB; repeated reads (e.g. menu, school config) are not cached.

**Rough capacity (for planning only):**

- **Without the critical fixes:** Do not expose to real users; “concurrent users” is irrelevant until API auth and credential exposure are fixed.
- **After securing APIs and fixing fail-open:**  
  - **Small school / single tenant:** Tens of concurrent users (e.g. 20–50) on a typical Vercel/Node deployment and Supabase free/pro tier is often acceptable, assuming normal usage (no heavy exports or bulk operations at the same time).  
  - **Multiple schools / 100+ concurrent users:** You will likely need: connection pooling (e.g. Supabase pooler), caching (e.g. Redis or Vercel KV for session and hot data), rate limiting, and optional read replicas. Then hundreds of concurrent users can be feasible with tuning and monitoring.
- **Heavy operations:** Certificate generation, bulk exports, and large report generation can be slow and block the request; consider background jobs (e.g. queue + worker) for large or long-running tasks.

**Recommendation:** First make the app **correct and secure** (auth, permissions, credentials, env). Then add health checks and simple monitoring. If you expect more than ~50 concurrent users or multiple schools, plan for rate limiting, caching, and DB connection/scaling as above.
