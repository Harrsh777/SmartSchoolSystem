-- Soft-delete fee structures while keeping student_fees FK intact (collect payment / history).
ALTER TABLE fee_structures
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN fee_structures.deleted_at IS 'When set, structure is hidden from management; student_fees rows remain for collection history.';

CREATE INDEX IF NOT EXISTS idx_fee_structures_school_not_deleted
  ON fee_structures (school_code)
  WHERE deleted_at IS NULL;
