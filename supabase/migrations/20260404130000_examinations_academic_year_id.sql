-- examinations.insert expects academic_year_id (see app/api/examinations/v2/create, marks APIs)
ALTER TABLE examinations
ADD COLUMN IF NOT EXISTS academic_year_id uuid;

CREATE INDEX IF NOT EXISTS idx_examinations_academic_year_id
  ON examinations (academic_year_id);

COMMENT ON COLUMN examinations.academic_year_id IS 'FK to academic_years.id for the school year; optional FK omitted for flexible deploy order';
