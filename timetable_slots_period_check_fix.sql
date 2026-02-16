-- Fix: Allow timetable_slots to have period 9 and above (constraint was 1–8).
-- Run this in your Supabase SQL editor if you get:
--   "timetable_slots_period_check" violates check constraint
-- when saving a slot for period 9 or higher.

-- Drop the existing check constraint
ALTER TABLE timetable_slots DROP CONSTRAINT IF EXISTS timetable_slots_period_check;

-- Re-add: allow period_order 1–20 (API sends both period_order and period)
ALTER TABLE timetable_slots ADD CONSTRAINT timetable_slots_period_check
  CHECK (period_order IS NULL OR (period_order >= 1 AND period_order <= 20));
