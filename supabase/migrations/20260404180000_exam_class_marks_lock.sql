-- Locks marks entry for a specific examination + class-section (classes.id).
-- When a row exists, teachers cannot POST marks for that exam_id + class_id (enforced in API).

CREATE TABLE IF NOT EXISTS exam_class_marks_lock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_code text NOT NULL,
  exam_id uuid NOT NULL,
  class_id uuid NOT NULL,
  locked_at timestamptz NOT NULL DEFAULT now(),
  locked_by text
);

CREATE UNIQUE INDEX IF NOT EXISTS exam_class_marks_lock_unique
  ON exam_class_marks_lock (school_code, exam_id, class_id);

CREATE INDEX IF NOT EXISTS exam_class_marks_lock_lookup
  ON exam_class_marks_lock (school_code, exam_id, class_id);

COMMENT ON TABLE exam_class_marks_lock IS 'School admin–controlled lock: no marks writes for exam_id+class_id while row exists';
