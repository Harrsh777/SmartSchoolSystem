-- Per-installment misc / discount lines (edited from Student-wise Fee → installment detail)
CREATE TABLE IF NOT EXISTS student_fee_line_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_code TEXT NOT NULL,
  student_fee_id UUID NOT NULL REFERENCES student_fees(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('misc', 'discount')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_student_fee_line_adj_fee
  ON student_fee_line_adjustments (student_fee_id);

COMMENT ON TABLE student_fee_line_adjustments IS 'Manual misc (positive amount) or discount (negative amount) per student_fees installment row.';
COMMENT ON COLUMN student_fee_line_adjustments.amount IS 'Misc: store positive. Discount: store negative.';
