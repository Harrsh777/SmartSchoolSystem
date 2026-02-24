# Security & Action Audit – Supabase Tables

Use this in **Supabase → SQL Editor** to create both tables so **Login Activity** and **Critical/Medium Actions** work in the Security & Action Audit dashboard.

---

## 1. Login Activity – `login_audit_log`

Stores each login attempt (success/failed). Used by **POST /api/auth/log-login** and **GET /api/admin/login-audit**.

```sql
-- Login audit: one row per login attempt
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

| Column      | Type        | Description |
|------------|-------------|-------------|
| id         | UUID        | Primary key |
| user_id    | TEXT        | Who logged in (optional on failed) |
| name       | TEXT        | Human-readable (staff_id, admission_no, etc.) |
| role       | TEXT        | School Admin / Teacher / Student / Accountant |
| login_type | TEXT        | Optional: school \| teacher \| student \| accountant |
| ip_address | TEXT        | From request |
| user_agent | TEXT        | Browser/device |
| login_at   | TIMESTAMPTZ | Time of attempt (default now()) |
| status     | TEXT        | `success` or `failed` |
| created_at | TIMESTAMPTZ | Row created at |

---

## 2. Critical / Medium Actions – `audit_logs`

State-changing actions only (no navigation or read-only). Used by **lib/audit-logger.ts** and **GET /api/admin/audit-logs**.

```sql
-- Action audit: critical and medium actions only
DROP TABLE IF EXISTS audit_logs;

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  user_name TEXT NOT NULL,
  role TEXT NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'MEDIUM')),
  ip_address TEXT,
  device_summary TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id) WHERE entity_id IS NOT NULL;
```

**If you already have `audit_logs` and want to keep data**, use this safe version instead (adds missing columns only):

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  user_name TEXT NOT NULL,
  role TEXT NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'MEDIUM')),
  ip_address TEXT,
  device_summary TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS severity TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS device_summary TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id) WHERE entity_id IS NOT NULL;
```

| Column         | Type        | Description |
|----------------|-------------|-------------|
| id             | UUID        | Primary key |
| user_id        | TEXT        | Who performed the action (e.g. staff id) |
| user_name      | TEXT        | Display name |
| role           | TEXT        | School Admin / Teacher / Accountant / etc. |
| action_type    | TEXT        | e.g. FEE_PAID, MARKS_UPDATED, PASSWORD_CHANGED |
| entity_type    | TEXT        | e.g. PAYMENT, EXAM, STUDENT |
| entity_id      | TEXT        | Target record ID (optional) |
| severity       | TEXT        | `CRITICAL` or `MEDIUM` |
| ip_address     | TEXT        | From request |
| device_summary | TEXT        | Parsed OS • Browser |
| metadata       | JSONB       | Extra data (no PII) |
| created_at     | TIMESTAMPTZ | When the action occurred |

---

## 3. One-shot script (both tables)

Run this once in Supabase SQL Editor to create both tables with the correct schema:

```sql
-- ========== 1. Login audit ==========
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

-- ========== 2. Action audit (drops existing if wrong schema) ==========
DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  user_name TEXT NOT NULL,
  role TEXT NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'MEDIUM')),
  ip_address TEXT,
  device_summary TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id) WHERE entity_id IS NOT NULL;
```

**Note:** The script above uses `DROP TABLE IF EXISTS audit_logs` so the action-audit table matches what the dashboard expects. If you have existing rows you need to keep, use the “safe” version for `audit_logs` (CREATE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS) and do **not** run the DROP.

---

## 4. RLS

Backend uses the **service role** key for INSERT/SELECT, so RLS is bypassed. If you use the anon key for these tables, add policies that allow your API role to INSERT and SELECT.
