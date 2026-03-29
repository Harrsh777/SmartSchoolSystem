-- Idempotent: creates class_fee_line_adjustments if an older migration was not applied.
-- After applying, reload PostgREST schema (Supabase Dashboard → Settings → API → Reload schema, or restart).

CREATE TABLE IF NOT EXISTS class_fee_line_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_code TEXT NOT NULL,
  class_name TEXT NOT NULL,
  section TEXT NOT NULL,
  academic_year TEXT,
  fee_structure_id UUID NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
  due_month TEXT NOT NULL,
  label TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('misc', 'discount')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_class_fee_line_adj_lookup
  ON class_fee_line_adjustments (school_code, class_name, section);

CREATE INDEX IF NOT EXISTS idx_class_fee_line_adj_structure_due
  ON class_fee_line_adjustments (fee_structure_id, due_month);

COMMENT ON TABLE class_fee_line_adjustments IS 'Applies misc/discount to all students in class-section for a given structure installment.';
