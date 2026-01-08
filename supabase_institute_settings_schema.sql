-- ============================================
-- INSTITUTE SETTINGS SCHEMA
-- Smart School ERP - Supabase + Next.js
-- ============================================

-- 1. INSTITUTE WORKING DAYS TABLE
-- Stores working days and their time schedules
CREATE TABLE IF NOT EXISTS public.institute_working_days (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  school_code text NOT NULL,
  day_name text NOT NULL, -- 'Monday', 'Tuesday', etc.
  start_time time,
  end_time time,
  is_working_day boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(school_id, day_name)
);

-- 2. INSTITUTE HOUSES TABLE
-- Stores school houses (e.g., Red House, Blue House, etc.)
CREATE TABLE IF NOT EXISTS public.institute_houses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  school_code text NOT NULL,
  house_name text NOT NULL,
  house_color text, -- Hex color code for the house
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_working_days_school ON public.institute_working_days(school_id, school_code);
CREATE INDEX IF NOT EXISTS idx_houses_school ON public.institute_houses(school_id, school_code);

-- Enable RLS
ALTER TABLE public.institute_working_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institute_houses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for working days
CREATE POLICY "Users can view working days for their school"
  ON public.institute_working_days FOR SELECT
  USING (true);

CREATE POLICY "Users can insert working days for their school"
  ON public.institute_working_days FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update working days for their school"
  ON public.institute_working_days FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete working days for their school"
  ON public.institute_working_days FOR DELETE
  USING (true);

-- RLS Policies for houses
CREATE POLICY "Users can view houses for their school"
  ON public.institute_houses FOR SELECT
  USING (true);

CREATE POLICY "Users can insert houses for their school"
  ON public.institute_houses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update houses for their school"
  ON public.institute_houses FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete houses for their school"
  ON public.institute_houses FOR DELETE
  USING (true);

