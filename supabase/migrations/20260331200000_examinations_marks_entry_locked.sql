-- Lock marks entry / bulk upload for an examination (admin-controlled).
ALTER TABLE examinations
  ADD COLUMN IF NOT EXISTS marks_entry_locked boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN examinations.marks_entry_locked IS 'When true, teachers cannot enter or bulk-upload marks for this exam.';
