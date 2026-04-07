-- Transport: periodic (monthly/quarterly) stop fees, assignment versioning, billing obligations.
-- Run in Supabase SQL editor or via CLI. Idempotent where possible.

ALTER TABLE transport_stops
  ADD COLUMN IF NOT EXISTS monthly_pickup_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_drop_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quarterly_pickup_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quarterly_drop_fee numeric NOT NULL DEFAULT 0;

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS transport_billing_frequency text NOT NULL DEFAULT 'MONTHLY';

COMMENT ON COLUMN transport_stops.monthly_pickup_fee IS 'Per-month billing for pickup leg (₹). 0 = fall back to pickup_fare for monthly billing.';
COMMENT ON COLUMN transport_stops.quarterly_pickup_fee IS 'Per-quarter billing for pickup leg (₹). 0 = fall back to 3× monthly or 3× pickup_fare.';
COMMENT ON COLUMN students.transport_billing_frequency IS 'MONTHLY or QUARTERLY — collection period for separate transport fees.';

CREATE TABLE IF NOT EXISTS transport_assignment_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_code text NOT NULL,
  student_id uuid NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  route_id uuid,
  transport_pickup_stop_id uuid,
  transport_dropoff_stop_id uuid,
  transport_custom_fare numeric,
  transport_fee numeric NOT NULL DEFAULT 0,
  billing_frequency text NOT NULL DEFAULT 'MONTHLY',
  effective_from date NOT NULL,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tav_school_student ON transport_assignment_versions (school_code, student_id);
CREATE INDEX IF NOT EXISTS idx_tav_student_effective ON transport_assignment_versions (student_id, effective_from DESC);

CREATE TABLE IF NOT EXISTS transport_billing_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_code text NOT NULL,
  student_id uuid NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  period_start date NOT NULL,
  billing_frequency text NOT NULL,
  amount_due numeric NOT NULL,
  assignment_version_id uuid REFERENCES transport_assignment_versions (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transport_billing_obligations_period_unique UNIQUE (school_code, student_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_tbo_school_period ON transport_billing_obligations (school_code, period_start);
