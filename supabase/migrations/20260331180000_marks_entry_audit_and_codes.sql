-- Marks entry: special codes (absent / N.A. / exempt), draft status, audit trail

DO $$
BEGIN
  ALTER TABLE student_subject_marks ADD COLUMN marks_entry_code text;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE student_subject_marks ADD COLUMN status text DEFAULT 'draft';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

COMMENT ON COLUMN student_subject_marks.marks_entry_code IS 'Optional: AB (absent), NA (not applicable), EXEMPT — when set, numeric marks_obtained is ignored.';

COMMENT ON COLUMN student_subject_marks.status IS 'draft | submitted — submitted rows should not be edited by teachers.';

CREATE TABLE IF NOT EXISTS marks_entry_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_code text NOT NULL,
  exam_id uuid NOT NULL,
  student_id uuid NOT NULL,
  subject_id uuid,
  class_id uuid,
  actor_staff_id uuid,
  action text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marks_entry_audit_exam_student_idx
  ON marks_entry_audit (exam_id, student_id);

CREATE INDEX IF NOT EXISTS marks_entry_audit_created_idx
  ON marks_entry_audit (created_at DESC);
