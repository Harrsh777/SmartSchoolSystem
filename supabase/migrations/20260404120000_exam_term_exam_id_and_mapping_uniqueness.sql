-- Link each real examination to its term template (exam_term_exams) and prevent
-- duplicate class-section coverage for the same term + template within a school.

ALTER TABLE examinations
ADD COLUMN IF NOT EXISTS exam_term_exam_id uuid REFERENCES exam_term_exams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_examinations_school_term_template
ON examinations (school_code, term_id, exam_term_exam_id)
WHERE term_id IS NOT NULL AND exam_term_exam_id IS NOT NULL;

ALTER TABLE exam_class_mappings
ADD COLUMN IF NOT EXISTS term_id uuid REFERENCES exam_terms(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS exam_term_exam_id uuid REFERENCES exam_term_exams(id) ON DELETE SET NULL;

-- Backfill term_id on mappings from parent examination
UPDATE exam_class_mappings m
SET term_id = e.term_id
FROM examinations e
WHERE m.exam_id = e.id
  AND m.term_id IS NULL
  AND e.term_id IS NOT NULL;

-- Backfill examination.exam_term_exam_id from template name within the same term (legacy rows)
UPDATE examinations e
SET exam_term_exam_id = ete.id
FROM exam_term_exams ete
INNER JOIN exam_terms et ON et.id = ete.term_id
INNER JOIN exam_term_structures ets ON ets.id = et.structure_id
WHERE e.term_id = et.id
  AND ets.school_code = e.school_code
  AND TRIM(BOTH FROM COALESCE(e.exam_name, '')) = TRIM(BOTH FROM COALESCE(ete.exam_name, ''))
  AND e.exam_term_exam_id IS NULL;

-- Copy template id onto mappings from parent examination
UPDATE exam_class_mappings m
SET term_id = COALESCE(m.term_id, e.term_id),
    exam_term_exam_id = COALESCE(m.exam_term_exam_id, e.exam_term_exam_id)
FROM examinations e
WHERE m.exam_id = e.id
  AND (m.exam_term_exam_id IS NULL OR m.term_id IS NULL);

-- One class-section per school + term + template examination definition
CREATE UNIQUE INDEX IF NOT EXISTS exam_class_mappings_term_template_section_uniq
ON exam_class_mappings (school_code, term_id, exam_term_exam_id, class_id)
WHERE term_id IS NOT NULL AND exam_term_exam_id IS NOT NULL;
