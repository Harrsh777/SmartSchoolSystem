-- ============================================
-- STAFF PERMISSIONS SCHEMA (Module/Sub-module based)
-- Smart School ERP - Supabase + Next.js
-- ============================================

-- 1. MODULES TABLE
-- Stores module definitions (e.g., "Home", "School Info", "Staff Management")
CREATE TABLE IF NOT EXISTS public.modules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  display_order integer DEFAULT 0,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. SUB_MODULES TABLE
-- Stores sub-module definitions (e.g., "Dashboard", "Basic School Info", "Staff Directory")
CREATE TABLE IF NOT EXISTS public.sub_modules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer DEFAULT 0,
  description text,
  supports_view_access boolean DEFAULT true,
  supports_edit_access boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. PERMISSION_CATEGORIES TABLE
-- Stores permission categories (e.g., "Default", "Custom")
CREATE TABLE IF NOT EXISTS public.permission_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(name)
);

-- 4. STAFF_PERMISSIONS TABLE
-- Direct staff permissions with view/edit access for sub-modules
CREATE TABLE IF NOT EXISTS public.staff_permissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  sub_module_id uuid NOT NULL REFERENCES public.sub_modules(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.permission_categories(id) ON DELETE CASCADE,
  view_access boolean DEFAULT false,
  edit_access boolean DEFAULT false,
  assigned_by uuid REFERENCES public.staff(id),
  assigned_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT unique_staff_submodule_category UNIQUE (staff_id, sub_module_id, category_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_modules_display_order ON public.modules(display_order);
CREATE INDEX IF NOT EXISTS idx_sub_modules_module_id ON public.sub_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_sub_modules_display_order ON public.sub_modules(display_order);
CREATE INDEX IF NOT EXISTS idx_staff_permissions_staff_id ON public.staff_permissions(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_permissions_sub_module_id ON public.staff_permissions(sub_module_id);
CREATE INDEX IF NOT EXISTS idx_staff_permissions_category_id ON public.staff_permissions(category_id);
CREATE INDEX IF NOT EXISTS idx_staff_permissions_view_access ON public.staff_permissions(view_access);
CREATE INDEX IF NOT EXISTS idx_staff_permissions_edit_access ON public.staff_permissions(edit_access);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read modules" ON public.modules;
DROP POLICY IF EXISTS "Allow Principal/Admin to manage modules" ON public.modules;
DROP POLICY IF EXISTS "Allow authenticated users to read sub_modules" ON public.sub_modules;
DROP POLICY IF EXISTS "Allow Principal/Admin to manage sub_modules" ON public.sub_modules;
DROP POLICY IF EXISTS "Allow authenticated users to read permission_categories" ON public.permission_categories;
DROP POLICY IF EXISTS "Allow Principal/Admin to manage permission_categories" ON public.permission_categories;
DROP POLICY IF EXISTS "Allow staff to read their own permissions" ON public.staff_permissions;
DROP POLICY IF EXISTS "Allow authenticated users to read all staff_permissions" ON public.staff_permissions;
DROP POLICY IF EXISTS "Allow Principal/Admin to manage staff_permissions" ON public.staff_permissions;

-- MODULES: All authenticated users can read
CREATE POLICY "Allow authenticated users to read modules" ON public.modules
  FOR SELECT TO authenticated USING (true);

-- MODULES: Only Principal/Admin can manage
CREATE POLICY "Allow Principal/Admin to manage modules" ON public.modules
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id::text = auth.uid()::text
      AND (staff.role = 'Principal' OR staff.role = 'Admin' OR staff.designation = 'Principal' OR staff.designation = 'Admin')
    )
  );

-- SUB_MODULES: All authenticated users can read
CREATE POLICY "Allow authenticated users to read sub_modules" ON public.sub_modules
  FOR SELECT TO authenticated USING (true);

-- SUB_MODULES: Only Principal/Admin can manage
CREATE POLICY "Allow Principal/Admin to manage sub_modules" ON public.sub_modules
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id::text = auth.uid()::text
      AND (staff.role = 'Principal' OR staff.role = 'Admin' OR staff.designation = 'Principal' OR staff.designation = 'Admin')
    )
  );

-- PERMISSION_CATEGORIES: All authenticated users can read
CREATE POLICY "Allow authenticated users to read permission_categories" ON public.permission_categories
  FOR SELECT TO authenticated USING (true);

-- PERMISSION_CATEGORIES: Only Principal/Admin can manage
CREATE POLICY "Allow Principal/Admin to manage permission_categories" ON public.permission_categories
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id::text = auth.uid()::text
      AND (staff.role = 'Principal' OR staff.role = 'Admin' OR staff.designation = 'Principal' OR staff.designation = 'Admin')
    )
  );

-- STAFF_PERMISSIONS: Staff can read their own permissions
CREATE POLICY "Allow staff to read their own permissions" ON public.staff_permissions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id = staff_permissions.staff_id
      AND staff.id::text = auth.uid()::text
    )
  );

-- STAFF_PERMISSIONS: All authenticated users can read (for admin to see all)
CREATE POLICY "Allow authenticated users to read all staff_permissions" ON public.staff_permissions
  FOR SELECT TO authenticated USING (true);

-- STAFF_PERMISSIONS: Only Principal/Admin can manage
CREATE POLICY "Allow Principal/Admin to manage staff_permissions" ON public.staff_permissions
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id::text = auth.uid()::text
      AND (staff.role = 'Principal' OR staff.role = 'Admin' OR staff.designation = 'Principal' OR staff.designation = 'Admin')
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_staff_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_modules_updated_at ON public.modules;
CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_staff_permissions_updated_at();

DROP TRIGGER IF EXISTS update_sub_modules_updated_at ON public.sub_modules;
CREATE TRIGGER update_sub_modules_updated_at
  BEFORE UPDATE ON public.sub_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_staff_permissions_updated_at();

DROP TRIGGER IF EXISTS update_staff_permissions_updated_at ON public.staff_permissions;
CREATE TRIGGER update_staff_permissions_updated_at
  BEFORE UPDATE ON public.staff_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_staff_permissions_updated_at();

-- ============================================
-- INITIAL DATA
-- ============================================
-- Insert default category
INSERT INTO public.permission_categories (name, description) VALUES
  ('Default', 'Default permission category')
ON CONFLICT (name) DO NOTHING;

-- Insert modules (based on the images provided)
INSERT INTO public.modules (name, display_order, description) VALUES
  ('Home', 1, 'Home module'),
  ('School Info', 2, 'School information module'),
  ('Admin Role Management', 3, 'Admin role management module'),
  ('Password Management', 4, 'Password management module'),
  ('Storage Used', 5, 'Storage usage module'),
  ('Staff Management', 6, 'Staff management module'),
  ('Student Personal Details', 33, 'Student personal details module'),
  ('Accounts management', 34, 'Accounts management module'),
  ('Task Management', 35, 'Task management module')
ON CONFLICT DO NOTHING;

-- Insert sub-modules (based on the images provided)
-- Note: We'll use a subquery to get module IDs
INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Dashboard', 1, true, false
FROM public.modules m WHERE m.name = 'Home'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Basic School Info', 1, true, true
FROM public.modules m WHERE m.name = 'School Info'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Implementation Process', 2, true, true
FROM public.modules m WHERE m.name = 'School Info'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Staff Access Control', 1, true, true
FROM public.modules m WHERE m.name = 'Admin Role Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Reset Password', 1, false, true
FROM public.modules m WHERE m.name = 'Password Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Module-wise GBs used', 1, true, false
FROM public.modules m WHERE m.name = 'Storage Used'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Staff Directory', 1, false, true
FROM public.modules m WHERE m.name = 'Staff Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Add Staff', 2, false, true
FROM public.modules m WHERE m.name = 'Staff Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Bulk Staff import', 3, false, true
FROM public.modules m WHERE m.name = 'Staff Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Bulk Photo Upload', 4, false, true
FROM public.modules m WHERE m.name = 'Staff Management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Student Personal Details', 1, true, true
FROM public.modules m WHERE m.name = 'Student Personal Details'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Student Personal Details(Admission)', 2, true, true
FROM public.modules m WHERE m.name = 'Student Personal Details'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Day Book', 1, true, true
FROM public.modules m WHERE m.name = 'Accounts management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Journal & ledger', 2, true, true
FROM public.modules m WHERE m.name = 'Accounts management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'P & L', 3, true, true
FROM public.modules m WHERE m.name = 'Accounts management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Balance Sheet', 4, true, true
FROM public.modules m WHERE m.name = 'Accounts management'
ON CONFLICT DO NOTHING;

INSERT INTO public.sub_modules (module_id, name, display_order, supports_view_access, supports_edit_access)
SELECT m.id, 'Task Management', 1, true, true
FROM public.modules m WHERE m.name = 'Task Management'
ON CONFLICT DO NOTHING;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================
-- Function to get all permissions for a staff member in a category
CREATE OR REPLACE FUNCTION public.get_staff_permissions_by_category(
  p_staff_id uuid,
  p_category_id uuid
)
RETURNS TABLE (
  module_id uuid,
  module_name text,
  sub_module_id uuid,
  sub_module_name text,
  view_access boolean,
  edit_access boolean,
  supports_view_access boolean,
  supports_edit_access boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as module_id,
    m.name as module_name,
    sm.id as sub_module_id,
    sm.name as sub_module_name,
    COALESCE(sp.view_access, false) as view_access,
    COALESCE(sp.edit_access, false) as edit_access,
    sm.supports_view_access,
    sm.supports_edit_access
  FROM public.modules m
  JOIN public.sub_modules sm ON sm.module_id = m.id
  LEFT JOIN public.staff_permissions sp ON sp.sub_module_id = sm.id 
    AND sp.staff_id = p_staff_id 
    AND sp.category_id = p_category_id
  ORDER BY m.display_order, sm.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE public.modules IS 'Stores module definitions for permission system';
COMMENT ON TABLE public.sub_modules IS 'Stores sub-module definitions under modules';
COMMENT ON TABLE public.permission_categories IS 'Stores permission categories (e.g., Default, Custom)';
COMMENT ON TABLE public.staff_permissions IS 'Direct staff permissions with view/edit access for sub-modules';

COMMENT ON COLUMN public.staff_permissions.view_access IS 'Whether staff has view access to this sub-module';
COMMENT ON COLUMN public.staff_permissions.edit_access IS 'Whether staff has edit access to this sub-module';
COMMENT ON COLUMN public.staff_permissions.assigned_by IS 'Staff member who assigned this permission';

