-- Existing DBs may have created_by → staff(id) FK that blocks inserts (type mismatch, etc.).
-- New installs use 20260329140000 (created_by UUID without FK).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE student_fee_line_adjustments
  DROP CONSTRAINT IF EXISTS student_fee_line_adjustments_created_by_fkey;

ALTER TABLE student_fee_line_adjustments
  ADD COLUMN IF NOT EXISTS created_by UUID;

CREATE INDEX IF NOT EXISTS idx_student_fee_line_adj_fee
  ON student_fee_line_adjustments (student_fee_id);

COMMENT ON COLUMN student_fee_line_adjustments.created_by IS 'Optional staff UUID; FK dropped for schema compatibility across projects.';
