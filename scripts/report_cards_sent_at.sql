-- Add sent_at to report_cards so admin can "Send" report cards to students.
-- Once sent, they appear in the student's Report Card module.
ALTER TABLE public.report_cards ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_report_cards_sent_at ON public.report_cards(student_id, sent_at) WHERE sent_at IS NOT NULL;
