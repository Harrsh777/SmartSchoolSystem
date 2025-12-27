-- Timetable Schema for Smart School ERP
-- This schema supports period groups, periods, class assignments, and timetable slots

-- 1. Timetable Period Groups Table
-- Stores period group configurations (e.g., "2024-2025 Academic Year")
CREATE TABLE IF NOT EXISTS public.timetable_period_groups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  school_code text NOT NULL,
  group_name text NOT NULL,
  is_active boolean DEFAULT true,
  class_start_time time NOT NULL,
  number_of_periods integer NOT NULL,
  timezone text DEFAULT 'Asia/Kolkata',
  selected_days text[] NOT NULL DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']::text[],
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Timetable Periods Table
-- Stores individual periods within a period group (e.g., Period 1, Break, Period 2)
CREATE TABLE IF NOT EXISTS public.timetable_periods (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid NOT NULL REFERENCES public.timetable_period_groups(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  school_code text NOT NULL,
  period_name text NOT NULL,
  period_duration_minutes integer NOT NULL,
  period_start_time time NOT NULL,
  period_end_time time NOT NULL,
  period_order integer NOT NULL,
  is_break boolean DEFAULT false,
  break_name text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT unique_group_period_order UNIQUE (group_id, period_order)
);

-- 3. Timetable Group Classes Table
-- Links classes to period groups (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.timetable_group_classes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid NOT NULL REFERENCES public.timetable_period_groups(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  school_code text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT unique_group_class UNIQUE (group_id, class_id)
);

-- 4. Timetable Slots Table
-- Stores actual timetable entries (subject assignments to specific day/period/class)
CREATE TABLE IF NOT EXISTS public.timetable_slots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  school_code text NOT NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  day text NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  period_order integer,
  period integer, -- Legacy field for backward compatibility
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  teacher_ids text[], -- Array of teacher IDs for multiple teachers
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT check_period_or_order CHECK (period_order IS NOT NULL OR period IS NOT NULL)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_timetable_period_groups_school_code ON public.timetable_period_groups(school_code);
CREATE INDEX IF NOT EXISTS idx_timetable_period_groups_active ON public.timetable_period_groups(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_timetable_periods_group_id ON public.timetable_periods(group_id);
CREATE INDEX IF NOT EXISTS idx_timetable_periods_school_code ON public.timetable_periods(school_code);
CREATE INDEX IF NOT EXISTS idx_timetable_periods_order ON public.timetable_periods(group_id, period_order);

CREATE INDEX IF NOT EXISTS idx_timetable_group_classes_group_id ON public.timetable_group_classes(group_id);
CREATE INDEX IF NOT EXISTS idx_timetable_group_classes_class_id ON public.timetable_group_classes(class_id);
CREATE INDEX IF NOT EXISTS idx_timetable_group_classes_school_code ON public.timetable_group_classes(school_code);

CREATE INDEX IF NOT EXISTS idx_timetable_slots_school_code ON public.timetable_slots(school_code);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_class_id ON public.timetable_slots(class_id) WHERE class_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_timetable_slots_teacher_id ON public.timetable_slots(teacher_id) WHERE teacher_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_timetable_slots_day_period ON public.timetable_slots(day, period_order);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_subject_id ON public.timetable_slots(subject_id) WHERE subject_id IS NOT NULL;

-- Partial unique indexes for timetable slots
-- Ensures unique class slots (when class_id is not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_class_slot ON public.timetable_slots(school_code, class_id, day, period_order) 
  WHERE class_id IS NOT NULL;

-- Ensures unique teacher slots (when class_id is null and teacher_id is not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_teacher_slot ON public.timetable_slots(school_code, teacher_id, day, period_order) 
  WHERE class_id IS NULL AND teacher_id IS NOT NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE public.timetable_period_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_group_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to manage period groups for their school" ON public.timetable_period_groups;
DROP POLICY IF EXISTS "Allow authenticated users to manage periods for their school" ON public.timetable_periods;
DROP POLICY IF EXISTS "Allow authenticated users to manage class assignments for their school" ON public.timetable_group_classes;
DROP POLICY IF EXISTS "Allow authenticated users to manage timetable slots for their school" ON public.timetable_slots;

-- RLS Policies for timetable_period_groups
CREATE POLICY "Allow authenticated users to manage period groups for their school" ON public.timetable_period_groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.accepted_schools
      WHERE accepted_schools.id = timetable_period_groups.school_id
    )
  );

-- RLS Policies for timetable_periods
CREATE POLICY "Allow authenticated users to manage periods for their school" ON public.timetable_periods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.accepted_schools
      WHERE accepted_schools.id = timetable_periods.school_id
    )
  );

-- RLS Policies for timetable_group_classes
CREATE POLICY "Allow authenticated users to manage class assignments for their school" ON public.timetable_group_classes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.accepted_schools
      WHERE accepted_schools.id = timetable_group_classes.school_id
    )
  );

-- RLS Policies for timetable_slots
CREATE POLICY "Allow authenticated users to manage timetable slots for their school" ON public.timetable_slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.accepted_schools
      WHERE accepted_schools.id = timetable_slots.school_id
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_timetable_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update updated_at column
-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_timetable_period_groups_updated_at ON public.timetable_period_groups;
DROP TRIGGER IF EXISTS update_timetable_periods_updated_at ON public.timetable_periods;
DROP TRIGGER IF EXISTS update_timetable_slots_updated_at ON public.timetable_slots;

CREATE TRIGGER update_timetable_period_groups_updated_at
  BEFORE UPDATE ON public.timetable_period_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_timetable_updated_at();

CREATE TRIGGER update_timetable_periods_updated_at
  BEFORE UPDATE ON public.timetable_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_timetable_updated_at();

CREATE TRIGGER update_timetable_slots_updated_at
  BEFORE UPDATE ON public.timetable_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_timetable_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.timetable_period_groups IS 'Stores period group configurations for timetables';
COMMENT ON TABLE public.timetable_periods IS 'Stores individual periods within a period group';
COMMENT ON TABLE public.timetable_group_classes IS 'Links classes to period groups';
COMMENT ON TABLE public.timetable_slots IS 'Stores actual timetable entries with subject and teacher assignments';

COMMENT ON COLUMN public.timetable_slots.period_order IS 'Order of period within the period group (new system)';
COMMENT ON COLUMN public.timetable_slots.period IS 'Legacy period number (1-8) for backward compatibility';
COMMENT ON COLUMN public.timetable_slots.teacher_ids IS 'Array of teacher IDs for slots with multiple teachers';

