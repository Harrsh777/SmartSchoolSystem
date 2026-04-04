-- Optional file (PDF/image) linked to a notice for parents/staff
ALTER TABLE notices ADD COLUMN IF NOT EXISTS attachment_url text;
