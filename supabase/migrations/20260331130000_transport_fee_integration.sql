-- Transport ↔ Fees: synthetic fee_structure + student_fees rows with snapshot (not tuition structure).

ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS fee_source text NOT NULL DEFAULT 'structure';
ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS transport_snapshot jsonb;

COMMENT ON COLUMN fee_structures.is_system IS 'System-managed structures (e.g. Transport) hidden from normal structure CRUD.';
COMMENT ON COLUMN student_fees.fee_source IS 'structure = normal installment; transport = synced from Route Students mapping.';
COMMENT ON COLUMN student_fees.transport_snapshot IS 'Frozen breakdown at last sync: pickup/drop names, leg fares, custom flag, amount.';

CREATE INDEX IF NOT EXISTS idx_student_fees_fee_source_transport
  ON student_fees (school_code, student_id)
  WHERE fee_source = 'transport';

CREATE UNIQUE INDEX IF NOT EXISTS uniq_student_fees_transport_per_student
  ON student_fees (school_code, student_id)
  WHERE fee_source = 'transport';
