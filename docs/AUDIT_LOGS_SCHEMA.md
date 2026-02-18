# Security & Action Audit Log – Supabase Schema

**Separate from `login_audit_log`.** This table stores only **critical and medium** state-changing actions (create/update/delete, approvals, financial, config, role/password changes). Never navigation or read-only views.

Run in Supabase SQL Editor.

**If you get "column user_id does not exist"** the table may already exist with a different structure. Use the **full script below** (it drops the table first so the correct schema is created).

```sql
-- Drop existing table so we create the correct schema (removes any old audit_logs data)
DROP TABLE IF EXISTS audit_logs;

-- Security & Action Audit (state-changing actions only)
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

**Optional: create only if not exists (no drop)**  
If you prefer to keep existing data and only ensure the table exists with the right columns, run this instead (adds missing columns if the table already exists):

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

-- Add columns if table existed with old schema (safe to run multiple times)
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

## Columns

| Column          | Type      | Description |
|-----------------|-----------|-------------|
| user_id         | TEXT      | Who performed the action (optional for system). |
| user_name       | TEXT      | Human-readable name. |
| role            | TEXT      | School Admin / Teacher / Student / Accountant / Super Admin. |
| action_type     | TEXT      | e.g. MARKS_UPDATED, FEE_PAID, LEAVE_APPROVED. |
| entity_type     | TEXT      | e.g. EXAM, FEE, STUDENT, CLASS. |
| entity_id       | TEXT      | Target record ID (nullable). |
| severity        | TEXT      | CRITICAL or MEDIUM. |
| ip_address      | TEXT      | From request headers. |
| device_summary  | TEXT      | Parsed OS • Browser • Device. |
| metadata        | JSONB     | Small, structured extra data (no PII dump). |
| created_at      | TIMESTAMPTZ | When the action occurred. |

## Retention (policy, not enforced in DB)

- Finance & admin actions: 2–3 years.
- Others: 6–12 months.

Use Supabase cron or external job to delete older rows if needed.

## RLS

Backend must use **service role** for INSERT and SELECT. If using anon key, add policies for your API role.
