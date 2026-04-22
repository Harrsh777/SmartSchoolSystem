-- Run this in Supabase SQL Editor to make copy_checking status compatible
-- with both old (`checked`) and newer (`completed`) app values.

ALTER TABLE public.copy_checking
DROP CONSTRAINT IF EXISTS copy_checking_status_check;

ALTER TABLE public.copy_checking
ADD CONSTRAINT copy_checking_status_check
CHECK (
  status IN ('not_checked', 'checked', 'completed', 'missing', 'late')
);
