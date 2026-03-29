-- Fee adjustment rules (lazy evaluation at view / collect payment)
-- Run in Supabase SQL editor or via CLI: supabase db push
--
-- Architecture:
--   student_fees.base_amount     = frozen at generation (original)
--   student_fees.adjustment_amount = legacy manual adjustments (fee_adjustments approve flow)
--   fee_adjustment_rules         = scoped rules (class / student), stacked by stack_order
-- Effective adjustment for unpaid rows:
--   adjustment_amount + sum(rule deltas computed at read time)
-- Fully PAID rows: use only adjustment_amount (rules do not retroactively change closed periods)

CREATE TABLE IF NOT EXISTS fee_adjustment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES accepted_schools(id) ON DELETE CASCADE,
  school_code TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('class', 'student')),
  class_name TEXT,
  section TEXT,
  apply_to_all_students_in_class BOOLEAN NOT NULL DEFAULT true,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('discount', 'fine', 'misc')),
  value_type TEXT NOT NULL CHECK (value_type IN ('fixed', 'percent')),
  value_numeric NUMERIC(14, 4) NOT NULL,
  apply_on TEXT NOT NULL DEFAULT 'total' CHECK (apply_on IN ('total', 'fee_head')),
  fee_head_id UUID REFERENCES fee_heads(id) ON DELETE SET NULL,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  academic_year TEXT,
  reason TEXT,
  stack_order INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fee_adj_rules_scope_class CHECK (
    scope <> 'class' OR class_name IS NOT NULL
  ),
  CONSTRAINT fee_adj_rules_scope_student CHECK (
    scope <> 'student' OR student_id IS NOT NULL
  ),
  CONSTRAINT fee_adj_rules_fee_head CHECK (
    apply_on <> 'fee_head' OR fee_head_id IS NOT NULL
  ),
  CONSTRAINT fee_adj_rules_dates CHECK (valid_to >= valid_from)
);

CREATE TABLE IF NOT EXISTS fee_adjustment_rule_targets (
  rule_id UUID NOT NULL REFERENCES fee_adjustment_rules(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  PRIMARY KEY (rule_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_fee_adjustment_rules_school_active
  ON fee_adjustment_rules (school_code)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_fee_adjustment_rules_valid_range
  ON fee_adjustment_rules (school_code, valid_from, valid_to);

CREATE INDEX IF NOT EXISTS idx_fee_adjustment_rule_targets_student
  ON fee_adjustment_rule_targets (student_id);

COMMENT ON TABLE fee_adjustment_rules IS 'Scoped fee adjustments (discount/fine/misc); deltas computed when viewing or collecting payment (stacked by stack_order).';
COMMENT ON COLUMN fee_adjustment_rules.apply_to_all_students_in_class IS 'If false, only students listed in fee_adjustment_rule_targets receive the class-scoped rule.';
