-- Fix: Allow timetable_slots to have period 8 and above (constraint was often 1–7 or 1–8).
-- Run this in your Supabase SQL editor if you get:
--   "timetable_slots_period_check" violates check constraint
-- when saving a slot for period 8 or higher (e.g. drag-and-drop to 8th period).

-- Drop the existing check constraint (name may check period_order and/or period column)
ALTER TABLE timetable_slots DROP CONSTRAINT IF EXISTS timetable_slots_period_check;

-- Re-add: allow period_order 1–20. API sends both period_order and period (as string).
ALTER TABLE timetable_slots ADD CONSTRAINT timetable_slots_period_check
  CHECK (period_order IS NULL OR (period_order >= 1 AND period_order <= 20));
