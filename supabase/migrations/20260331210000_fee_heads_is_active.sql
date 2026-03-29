-- Fee heads: applicable toggle (off = listed but not offered for new structures)
ALTER TABLE fee_heads
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN fee_heads.is_active IS 'When false, fee head is kept for history but not offered for new fee structures.';
