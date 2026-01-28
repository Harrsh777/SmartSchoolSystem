import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// GET /api/staff/[id]/menu - Get menu items based on staff permissions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceRoleClient();

    // Get staff info to check role and assignments
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, staff_id, role, designation, school_code')
      .eq('id', id)
      .single();

    if (staffError || !staffData) {
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      );
    }

    // Check if staff is a class teacher
    // Check both class_teacher_id (UUID) and class_teacher_staff_id (text)
    let isClassTeacher = false;
    if (staffData.school_code) {
      const { data: assignedClasses } = await supabase
        .from('classes')
        .select('id')
        .eq('school_code', staffData.school_code)
        .or(`class_teacher_id.eq.${id},class_teacher_staff_id.eq.${staffData.staff_id || ''}`)
        .limit(1);

      isClassTeacher = Boolean(assignedClasses && assignedClasses.length > 0);
    }

    // Check if staff has assigned subjects
    const { data: assignedSubjects } = await supabase
      .from('staff_subjects')
      .select('id')
      .eq('staff_id', id)
      .limit(1);

    const hasAssignedSubjects = assignedSubjects && assignedSubjects.length > 0;

    // Check if staff has Vice Principal or Principal role
    const roleName = (staffData.role || '').toLowerCase();
    const designation = (staffData.designation || '').toLowerCase();
    let isVicePrincipal = roleName.includes('vice principal') || designation.includes('vice principal');
    let isPrincipal = roleName.includes('principal') || designation.includes('principal') || roleName.includes('admin');

    // Get all roles for this staff
    const { data: staffRoles, error: rolesError } = await supabase
      .from('staff_roles')
      .select('role_id, roles!inner(role_name)')
      .eq('staff_id', id)
      .eq('is_active', true);

    if (rolesError) {
      console.error('Error fetching staff roles:', rolesError);
      return NextResponse.json(
        { error: 'Failed to fetch staff roles', details: rolesError.message },
        { status: 500 }
      );
    }

    const roleIds = staffRoles?.map(sr => sr.role_id) || [];
    
    // Check role names for Vice Principal/Principal
    const roleNames = staffRoles?.map(sr => {
      const roles = sr.roles as { role_name: string } | { role_name: string }[] | null | undefined;
      if (Array.isArray(roles)) {
        return roles.map(r => (r.role_name || '').toLowerCase()).join(' ');
      }
      return (roles?.role_name || '').toLowerCase();
    }) || [];
    if (!isVicePrincipal) {
      isVicePrincipal = roleNames.some(rn => rn.includes('vice principal'));
    }
    if (!isPrincipal) {
      isPrincipal = roleNames.some(rn => rn.includes('principal') || rn.includes('admin'));
    }

    // Get permissions from roles
    let rolePermissions: Array<Record<string, unknown>> = [];
    if (roleIds.length > 0) {
      const { data: rp, error: rpError } = await supabase
        .from('role_permissions')
        .select(`
          view_access,
          edit_access,
          sub_modules!inner(
            id,
            sub_module_name,
            sub_module_key,
            route_path,
            display_order,
            modules!inner(
              id,
              module_name,
              module_key,
              display_order
            )
          ),
          permission_categories!inner(
            category_key,
            category_type
          )
        `)
        .in('role_id', roleIds)
        .eq('view_access', true)
        .eq('permission_categories.category_type', 'view');

      if (rpError) {
        console.error('Error fetching role permissions:', rpError);
      } else {
        rolePermissions = rp || [];
      }
    }

    // Get individual staff permission overrides
    const { data: staffPermissions, error: spError } = await supabase
      .from('staff_permissions')
      .select(`
        view_access,
        edit_access,
        sub_modules!inner(
          id,
          sub_module_name,
          sub_module_key,
          route_path,
          display_order,
          modules!inner(
            id,
            module_name,
            module_key,
            display_order
          )
        ),
        permission_categories!inner(
          category_key,
          category_type
        )
      `)
      .eq('staff_id', id)
      .eq('permission_categories.category_type', 'view');

    if (spError) {
      console.error('Error fetching staff permissions:', spError);
    }

    // Base default sub-modules for ALL staff (Normal Teachers minimum)
    const BASE_DEFAULT_SUB_MODULE_KEYS = [
      'attendance_staff',          // My Attendance (Staff Attendance)
      'staff_leave',               // Apply for Leave (Staff Leave)
      'student_directory',         // Student Management (view only)
      'gallery_main',              // Gallery (view only)
      'staff_directory',          // Staff Information (view only)
    ];

    // Additional modules for Class Teachers
    const CLASS_TEACHER_SUB_MODULE_KEYS = [
      'mark_attendance',           // Mark Attendance (for assigned class)
      'marks_entry',               // Marks Entry (for assigned class)
      'classes_overview',          // Classes (full access to assigned class)
    ];

    // Additional modules for Subject Teachers (when subjects are assigned)
    const SUBJECT_TEACHER_SUB_MODULE_KEYS = [
      'marks_entry',               // Marks Entry (for assigned subjects)
      // Note: These are added via role permissions, not defaults
      // 'examinations',            // Examinations (for assigned subjects)
      // 'digital_diary',           // Digital Diary (for assigned subjects)
      // 'copy_checking',           // Copy Checking (for assigned subjects)
      // 'reports',                 // Reports (subject-wise)
    ];

    // Determine default modules based on role and assignments
    let DEFAULT_SUB_MODULE_KEYS = [...BASE_DEFAULT_SUB_MODULE_KEYS];

    // If staff is a class teacher, add class teacher modules
    if (isClassTeacher) {
      DEFAULT_SUB_MODULE_KEYS = [...DEFAULT_SUB_MODULE_KEYS, ...CLASS_TEACHER_SUB_MODULE_KEYS];
    }

    // If staff has assigned subjects (but not class teacher), add subject teacher modules
    // Note: Mark attendance is NOT added here - only class teachers can mark attendance
    if (hasAssignedSubjects && !isClassTeacher) {
      DEFAULT_SUB_MODULE_KEYS = [...DEFAULT_SUB_MODULE_KEYS, ...SUBJECT_TEACHER_SUB_MODULE_KEYS];
    }

    // Vice Principal and Principal get NO default modules (must be assigned via Roles & Management)
    if (isVicePrincipal || isPrincipal) {
      DEFAULT_SUB_MODULE_KEYS = [];
    }

    // Fetch default sub-modules that should always be visible
    const { data: defaultSubModules, error: defaultError } = await supabase
      .from('sub_modules')
      .select(`
        id,
        sub_module_name,
        sub_module_key,
        route_path,
        display_order,
        modules!inner(
          id,
          module_name,
          module_key,
          display_order
        )
      `)
      .in('sub_module_key', DEFAULT_SUB_MODULE_KEYS)
      .eq('is_active', true);

    if (defaultError) {
      console.error('Error fetching default sub-modules:', defaultError);
    }

    // Merge permissions (staff_permissions override role_permissions)
    const permissionsMap = new Map<string, {
      module_name: string;
      module_key: string;
      module_display_order: number;
      sub_module_name: string;
      sub_module_key: string;
      route_path: string;
      sub_module_display_order: number;
      has_view_access: boolean;
      has_edit_access: boolean;
      source: string;
    }>();

    // First, add default sub-modules (always visible to all staff)
    ((defaultSubModules || []) as Record<string, unknown>[]).forEach((subModule: Record<string, unknown>) => {
      const modules = subModule.modules as Array<{
        module_name: string;
        module_key: string;
        display_order: number;
      }> | null | undefined;
      const moduleData = modules && modules.length > 0 ? modules[0] : null;
      
      if (!moduleData) return; // Skip if no module data
      
      const key = String(subModule.sub_module_key || '');
      if (!permissionsMap.has(key)) {
        permissionsMap.set(key, {
          module_name: moduleData.module_name,
          module_key: moduleData.module_key,
          module_display_order: moduleData.display_order,
          sub_module_name: String(subModule.sub_module_name || ''),
          sub_module_key: key,
          route_path: String(subModule.route_path || ''),
          sub_module_display_order: Number(subModule.display_order || 0),
          has_view_access: true, // Always visible
          has_edit_access: false, // Default to view only, can be overridden by permissions
          source: 'default',
        });
      }
    });

    // Then, add role permissions (these can override defaults or add new ones)
    rolePermissions.forEach((rp: Record<string, unknown>) => {
      const subModule = rp.sub_modules as {
        sub_module_key: string;
        sub_module_name: string;
        route_path: string;
        display_order: number;
        modules: {
          module_name: string;
          module_key: string;
          display_order: number;
        };
      };
      const key = subModule.sub_module_key;
      const isDefaultModule = DEFAULT_SUB_MODULE_KEYS.includes(key);
      const viewAccess = (rp.view_access as boolean) || false;
      
      // For default modules, always keep view_access true (they're always visible)
      // For other modules, use the permission value
      // Always set/override with role permissions (even for defaults, to allow edit access)
      permissionsMap.set(key, {
        module_name: subModule.modules.module_name,
        module_key: subModule.modules.module_key,
        module_display_order: subModule.modules.display_order,
        sub_module_name: subModule.sub_module_name,
        sub_module_key: subModule.sub_module_key,
        route_path: subModule.route_path,
        sub_module_display_order: subModule.display_order,
        has_view_access: isDefaultModule ? true : viewAccess, // Default modules always visible
        has_edit_access: (rp.edit_access as boolean) || false,
        source: 'role',
      });
    });

    // Then, override with staff permissions
    (staffPermissions || []).forEach((sp: Record<string, unknown>) => {
      const subModule = sp.sub_modules as {
        sub_module_key: string;
        sub_module_name: string;
        route_path: string;
        display_order: number;
        modules: {
          module_name: string;
          module_key: string;
          display_order: number;
        };
      };
      const key = subModule.sub_module_key;
      
      // Only override if view_access is true (if false, it removes access)
      // BUT: Don't remove default modules even if view_access is false
      const viewAccess = (sp.view_access as boolean) || false;
      const isDefaultModule = DEFAULT_SUB_MODULE_KEYS.includes(key);
      
      if (viewAccess) {
        permissionsMap.set(key, {
          module_name: subModule.modules.module_name,
          module_key: subModule.modules.module_key,
          module_display_order: subModule.modules.display_order,
          sub_module_name: subModule.sub_module_name,
          sub_module_key: subModule.sub_module_key,
          route_path: subModule.route_path,
          sub_module_display_order: subModule.display_order,
          has_view_access: viewAccess,
          has_edit_access: (sp.edit_access as boolean) || false,
          source: 'staff',
        });
      } else if (!isDefaultModule) {
        // Remove access if view_access is false, but only for non-default modules
        permissionsMap.delete(key);
      }
      // If it's a default module and view_access is false, keep it visible (default behavior)
    });

    // Group by module
    const modulesMap = new Map<string, {
      module_name: string;
      module_key: string;
      display_order: number;
      sub_modules: Array<{
        name: string;
        key: string;
        route: string;
        has_view_access: boolean;
        has_edit_access: boolean;
      }>;
    }>();

    permissionsMap.forEach((perm) => {
      if (!modulesMap.has(perm.module_key)) {
        modulesMap.set(perm.module_key, {
          module_name: perm.module_name,
          module_key: perm.module_key,
          display_order: perm.module_display_order,
          sub_modules: [],
        });
      }

      const modRecord = modulesMap.get(perm.module_key)!;
      
      // Transform route path for teacher dashboard
      // If route_path is an admin dashboard path, convert it to teacher dashboard path
      let transformedRoute = perm.route_path;
      
      // If route starts with /dashboard/[school]/, convert to /teacher/dashboard/
      if (transformedRoute.startsWith('/dashboard/')) {
        // Extract the path after /dashboard/[school]/
        const pathMatch = transformedRoute.match(/^\/dashboard\/\[school\](\/.+)?$/);
        if (pathMatch) {
          const subPath = pathMatch[1] || '';
          transformedRoute = `/teacher/dashboard${subPath}`;
        } else {
          // Handle /dashboard/[school]/path format
          const pathAfterSchool = transformedRoute.replace(/^\/dashboard\/\[school\]/, '');
          transformedRoute = `/teacher/dashboard${pathAfterSchool || ''}`;
        }
      } else if (transformedRoute.startsWith('/') && !transformedRoute.startsWith('/teacher/')) {
        // If it's a root path like /institute-info, convert to /teacher/dashboard/institute-info
        transformedRoute = `/teacher/dashboard${transformedRoute}`;
      }
      
      modRecord.sub_modules.push({
        name: perm.sub_module_name,
        key: perm.sub_module_key,
        route: transformedRoute,
        has_view_access: perm.has_view_access,
        has_edit_access: perm.has_edit_access,
      });
    });

    // Convert to array and sort
    const menuItems = Array.from(modulesMap.values())
      .sort((a, b) => a.display_order - b.display_order)
      .map(module => ({
        ...module,
        sub_modules: module.sub_modules.sort((a, b) => a.name.localeCompare(b.name)),
      }));

    return NextResponse.json({ data: menuItems }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/staff/[id]/menu:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
