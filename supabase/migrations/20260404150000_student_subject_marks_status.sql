-- Draft vs submitted marks; required for teacher submit flow and /api/examinations/marks/status

ALTER TABLE student_subject_marks
ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';

ALTER TABLE student_subject_marks
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

COMMENT ON COLUMN student_subject_marks.status IS 'draft | submitted (and optional workflow states)';
COMMENT ON COLUMN student_subject_marks.updated_at IS 'Last update time for the marks row';
