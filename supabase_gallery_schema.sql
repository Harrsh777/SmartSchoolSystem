-- Gallery Schema for Smart School ERP
-- Stores gallery images uploaded by principal/admin

CREATE TABLE IF NOT EXISTS public.gallery (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL REFERENCES public.accepted_schools(id) ON DELETE CASCADE,
  school_code text NOT NULL,
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  category text DEFAULT 'General',
  uploaded_by uuid REFERENCES public.staff(id),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gallery_school_code ON public.gallery(school_code);
CREATE INDEX IF NOT EXISTS idx_gallery_category ON public.gallery(category);
CREATE INDEX IF NOT EXISTS idx_gallery_created_at ON public.gallery(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_active ON public.gallery(is_active) WHERE is_active = true;

-- Enable Row Level Security (RLS)
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow authenticated users to view gallery for their school
CREATE POLICY "Allow authenticated users to view gallery for their school" ON public.gallery
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.accepted_schools
      WHERE accepted_schools.id = gallery.school_id
    )
  );

-- Allow Principal/Admin to manage gallery
CREATE POLICY "Allow Principal/Admin to manage gallery" ON public.gallery
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id = auth.uid()::text
      AND (staff.role = 'Principal' OR staff.role = 'Admin' OR staff.designation = 'Principal' OR staff.designation = 'Admin')
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_gallery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER update_gallery_updated_at
  BEFORE UPDATE ON public.gallery
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gallery_updated_at();

-- Comments
COMMENT ON TABLE public.gallery IS 'Stores gallery images uploaded by principal/admin';
COMMENT ON COLUMN public.gallery.category IS 'Category of the image (e.g., Events, Sports, Academics, General)';

