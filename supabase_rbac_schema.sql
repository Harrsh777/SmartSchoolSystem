-- ============================================
-- ROLE-BASED ACCESS CONTROL (RBAC) SCHEMA
-- Smart School ERP - Supabase + Next.js
-- ============================================

-- 1. ROLES TABLE
-- Stores role definitions (e.g., "Fee Manager", "Exam Controller")
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. PERMISSIONS TABLE
-- Stores permission keys (e.g., "manage_students", "manage_fees")
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  module text, -- e.g., "Students", "Fees", "Exams"
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. ROLE_PERMISSIONS TABLE (Many-to-Many)
-- Links roles to permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT unique_role_permission UNIQUE (role_id, permission_id)
);

-- 4. STAFF_ROLES TABLE (Many-to-Many)
-- Links staff members to roles
CREATE TABLE IF NOT EXISTS public.staff_roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.staff(id), -- Who assigned this role
  assigned_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT unique_staff_role UNIQUE (staff_id, role_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(name);
CREATE INDEX IF NOT EXISTS idx_permissions_key ON public.permissions(key);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON public.permissions(module);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_staff_roles_staff_id ON public.staff_roles(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_roles_role_id ON public.staff_roles(role_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "Allow authenticated users to read roles" ON public.roles;
DROP POLICY IF EXISTS "Allow Principal/Admin to manage roles" ON public.roles;
DROP POLICY IF EXISTS "Allow authenticated users to read permissions" ON public.permissions;
DROP POLICY IF EXISTS "Allow Principal/Admin to manage permissions" ON public.permissions;
DROP POLICY IF EXISTS "Allow authenticated users to read role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Allow Principal/Admin to manage role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Allow staff to read their own roles" ON public.staff_roles;
DROP POLICY IF EXISTS "Allow authenticated users to read all staff_roles" ON public.staff_roles;
DROP POLICY IF EXISTS "Allow Principal/Admin to manage staff_roles" ON public.staff_roles;

-- ROLES: All authenticated users can read roles
CREATE POLICY "Allow authenticated users to read roles" ON public.roles
  FOR SELECT TO authenticated USING (true);

-- ROLES: Only Principal/Admin can create/update/delete roles
-- Note: This assumes you have a way to identify Principal/Admin
-- You may need to adjust this based on your auth system
CREATE POLICY "Allow Principal/Admin to manage roles" ON public.roles
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id::text = auth.uid()::text
      AND (staff.role = 'Principal' OR staff.role = 'Admin' OR staff.designation = 'Principal' OR staff.designation = 'Admin')
    )
  );

-- PERMISSIONS: All authenticated users can read permissions
CREATE POLICY "Allow authenticated users to read permissions" ON public.permissions
  FOR SELECT TO authenticated USING (true);

-- PERMISSIONS: Only Principal/Admin can manage permissions
CREATE POLICY "Allow Principal/Admin to manage permissions" ON public.permissions
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id::text = auth.uid()::text
      AND (staff.role = 'Principal' OR staff.role = 'Admin' OR staff.designation = 'Principal' OR staff.designation = 'Admin')
    )
  );

-- ROLE_PERMISSIONS: All authenticated users can read
CREATE POLICY "Allow authenticated users to read role_permissions" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);

-- ROLE_PERMISSIONS: Only Principal/Admin can manage
CREATE POLICY "Allow Principal/Admin to manage role_permissions" ON public.role_permissions
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id::text = auth.uid()::text
      AND (staff.role = 'Principal' OR staff.role = 'Admin' OR staff.designation = 'Principal' OR staff.designation = 'Admin')
    )
  );

-- STAFF_ROLES: Staff can read their own roles
CREATE POLICY "Allow staff to read their own roles" ON public.staff_roles
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id = staff_roles.staff_id
      AND staff.id::text = auth.uid()::text
    )
  );

-- STAFF_ROLES: All authenticated users can read (for admin to see all)
CREATE POLICY "Allow authenticated users to read all staff_roles" ON public.staff_roles
  FOR SELECT TO authenticated USING (true);

-- STAFF_ROLES: Only Principal/Admin can assign roles
CREATE POLICY "Allow Principal/Admin to manage staff_roles" ON public.staff_roles
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
CREATE OR REPLACE FUNCTION public.update_rbac_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for roles table
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_roles_updated_at ON public.roles;

CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_rbac_updated_at();

-- ============================================
-- INITIAL DATA (PERMISSIONS)
-- ============================================
-- Insert default permissions (with view and manage/edit options)
INSERT INTO public.permissions (key, name, description, module) VALUES
  -- Students
  ('view_students', 'View Students', 'View access to student management module', 'Students'),
  ('manage_students', 'Manage Students', 'Full access (view and edit) to student management module', 'Students'),
  -- Staff
  ('view_staff', 'View Staff', 'View access to staff management module', 'Staff'),
  ('manage_staff', 'Manage Staff', 'Full access (view and edit) to staff management module', 'Staff'),
  -- Fees
  ('view_fees', 'View Fees', 'View access to fee management module', 'Fees'),
  ('manage_fees', 'Manage Fees', 'Full access (view and edit) to fee management module', 'Fees'),
  -- Examinations
  ('view_exams', 'View Examinations', 'View access to examination management module', 'Examinations'),
  ('manage_exams', 'Manage Examinations', 'Full access (view and edit) to examination management module', 'Examinations'),
  -- Timetable
  ('view_timetable', 'View Timetable', 'View access to timetable management module', 'Timetable'),
  ('manage_timetable', 'Manage Timetable', 'Full access (view and edit) to timetable management module', 'Timetable'),
  -- Events/Calendar
  ('view_events', 'View Events & Calendar', 'View access to event and calendar management module', 'Calendar'),
  ('manage_events', 'Manage Events & Calendar', 'Full access (view and edit) to event and calendar management module', 'Calendar'),
  -- Transport
  ('view_transport', 'View Transport', 'View access to transport management module', 'Transport'),
  ('manage_transport', 'Manage Transport', 'Full access (view and edit) to transport management module', 'Transport'),
  -- Library
  ('view_library', 'View Library', 'View access to library management module', 'Library'),
  ('manage_library', 'Manage Library', 'Full access (view and edit) to library management module', 'Library'),
  -- Classes
  ('view_classes', 'View Classes', 'View access to class management module', 'Classes'),
  ('manage_classes', 'Manage Classes', 'Full access (view and edit) to class management module', 'Classes'),
  -- Communication
  ('view_communication', 'View Communication', 'View access to communication/notices module', 'Communication'),
  ('manage_communication', 'Manage Communication', 'Full access (view and edit) to communication/notices module', 'Communication'),
  -- Passwords
  ('manage_passwords', 'Manage Passwords', 'Full access to password and credential management', 'Credentials'),
  -- Reports
  ('view_reports', 'View Reports', 'Access to view reports and analytics', 'Reports')
ON CONFLICT (key) DO NOTHING;

-- Insert default roles (optional - can be created via UI)
INSERT INTO public.roles (name, description) VALUES
  ('Principal', 'School Principal with full access'),
  ('Fee Manager', 'Manages fee collection and fee-related operations'),
  ('Exam Controller', 'Manages examinations and exam schedules'),
  ('Timetable Manager', 'Manages class and teacher timetables'),
  ('Student Manager', 'Manages student records and information'),
  ('Staff Manager', 'Manages staff records and information'),
  ('Transport Manager', 'Manages transport routes and vehicles'),
  ('Library Manager', 'Manages library books and resources'),
  ('Event Coordinator', 'Manages school events and calendar'),
  ('Communication Manager', 'Manages notices and communications')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- HELPER FUNCTIONS (Optional - for easier queries)
-- ============================================
-- Function to get all permissions for a staff member
CREATE OR REPLACE FUNCTION public.get_staff_permissions(p_staff_id uuid)
RETURNS TABLE (
  permission_key text,
  permission_name text,
  module text
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.key,
    p.name,
    p.module
  FROM public.staff_roles sr
  JOIN public.role_permissions rp ON sr.role_id = rp.role_id
  JOIN public.permissions p ON rp.permission_id = p.id
  WHERE sr.staff_id = p_staff_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE public.roles IS 'Stores role definitions for RBAC system';
COMMENT ON TABLE public.permissions IS 'Stores permission keys that control module access';
COMMENT ON TABLE public.role_permissions IS 'Many-to-many relationship between roles and permissions';
COMMENT ON TABLE public.staff_roles IS 'Many-to-many relationship between staff and roles';

COMMENT ON COLUMN public.permissions.key IS 'Unique permission identifier (e.g., manage_students, manage_fees)';
COMMENT ON COLUMN public.permissions.module IS 'Module name this permission controls (e.g., Students, Fees)';
COMMENT ON COLUMN public.staff_roles.assigned_by IS 'Staff member who assigned this role';

