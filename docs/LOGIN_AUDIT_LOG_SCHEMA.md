# Login Audit Log – Supabase Schema

Run this in the Supabase SQL editor to create the table. Data is **append-only** (never overwrite).

```sql
CREATE TABLE IF NOT EXISTS login_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  login_type TEXT,
  ip_address TEXT,
  user_agent TEXT,
  login_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_audit_login_at ON login_audit_log(login_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_audit_role ON login_audit_log(role);
CREATE INDEX IF NOT EXISTS idx_login_audit_status ON login_audit_log(status);
CREATE INDEX IF NOT EXISTS idx_login_audit_ip ON login_audit_log(ip_address);
```

- **user_id**: Who logged in (optional on failed attempts).
- **name**: Human-readable identifier (school_code, staff_id, admission_no, or "Unknown").
- **role**: School Admin / Teacher / Student / Accountant / UNKNOWN.
- **login_type**: Optional discriminator (school | teacher | student | accountant).
- **ip_address**: From `x-forwarded-for` or request IP.
- **user_agent**: Browser/device string.
- **login_at**: Time of attempt (defaults to now).
- **status**: `success` or `failed`.

**RLS:** If Row Level Security is enabled on this table, ensure the backend uses the **service role** key (it bypasses RLS). If you use another key, add a policy that allows `INSERT` and `SELECT` for your API role.

---

### Option A — Client-triggered logging (works with Supabase Auth or custom API)

Because login may be handled by **Supabase Auth** (or your custom API), the app records each attempt by having the **frontend call a server API** after login:

1. User submits login (Supabase Auth `signInWithPassword` or your custom `/api/auth/*`).
2. Frontend receives success or failure.
3. Frontend calls **`POST /api/auth/log-login`** with body: `{ userId?, name, role, loginType, status }`.
4. The server writes one row to `login_audit_log` (IP and User-Agent come from the request).

All four login pages (admin, staff, student, accountant) already call `/api/auth/log-login` after the login response, so every attempt is logged whether you use Supabase Auth or the existing custom API.

---

### Production (e.g. www.educorerp.in) — login audit not logging

If audit works on **localhost** but not on **production**, do this:

1. **Set environment variables on the production host**  
   The server must have:
   - `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL  
   - `SUPABASE_SERVICE_ROLE_KEY` — service role key (not the anon key)  

   Add them in your host’s dashboard (e.g. Vercel → Project → Settings → Environment Variables) for **Production**, then redeploy.

2. **Confirm the table exists in the same project**  
   Production must use the **same** Supabase project as local (same URL). The `login_audit_log` table must exist there (run the schema SQL once in that project if needed).

3. **Test the API on production**  
   Open:
   ```text
   https://www.educorerp.in/api/auth/log-login?test=1
   ```
   - If you see `{"ok":true,"id":"...","message":"Row inserted..."}` → env and table are fine; check that the latest code is deployed and that login pages call `log-login`.
   - If you see `"Supabase client failed"` or `"SUPABASE_SERVICE_ROLE_KEY is not set"` → add the variables above and redeploy.
   - If you see a different error (e.g. `code`, `details`) → fix that (e.g. RLS, wrong table, or wrong project).

4. **Redeploy after changes**  
   After adding env vars or new code, redeploy so the running app uses them.
