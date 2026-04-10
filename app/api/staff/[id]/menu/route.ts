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
        .in('role_id', roleIds);

      if (rpError) {
        console.error('Error fetching role permissions:', rpError);
      } else {
        rolePermissions = rp || [];
      }
    }

    // Get individual staff permission overrides
    // First, get raw staff_permissions to debug
    const { data: rawStaffPermissions, error: rawSpError } = await supabase
      .from('staff_permissions')
      .select('*')
      .eq('staff_id', id);

    console.log('=== DEBUG: Raw staff_permissions for staff:', id, '===');
    console.log('Raw permissions count:', rawStaffPermissions?.length || 0);
    if (rawStaffPermissions && rawStaffPermissions.length > 0) {
      console.log('Sample raw permission:', JSON.stringify(rawStaffPermissions[0], null, 2));
    }
    if (rawSpError) {
      console.error('Error fetching raw staff permissions:', rawSpError);
    }

    // Query all staff permissions so view/edit can be aggregated per sub-module
    const { data: staffPermissions, error: spError } = await supabase
      .from('staff_permissions')
      .select(`
        view_access,
        edit_access,
        sub_module_id,
        category_id,
        sub_modules(
          id,
          sub_module_name,
          sub_module_key,
          route_path,
          display_order,
          is_active,
          modules(
            id,
            module_name,
            module_key,
            display_order,
            is_active
          )
        ),
        permission_categories(
          id,
          category_key,
          category_type
        )
      `)
      .eq('staff_id', id);

    console.log('Staff permissions with joins found:', staffPermissions?.length || 0, 'for staff:', id);
    if (staffPermissions && staffPermissions.length > 0) {
      console.log('Sample joined permission:', JSON.stringify(staffPermissions[0], null, 2));
    }

    if (spError) {
      console.error('Error fetching staff permissions:', spError);
    }

    // FALLBACK: If joins returned fewer results than raw permissions, fetch sub_modules separately
    let enrichedStaffPermissions = staffPermissions || [];
    if (rawStaffPermissions && rawStaffPermissions.length > 0 && 
        (!staffPermissions || staffPermissions.length < rawStaffPermissions.length)) {
      console.log('Using fallback: fetching sub_modules separately for', rawStaffPermissions.length, 'permissions');
      
      // Get unique sub_module_ids from raw permissions
      const subModuleIds = [...new Set(rawStaffPermissions.map((p: { sub_module_id: string }) => p.sub_module_id))];
      
      // Fetch sub_modules with their modules
      const { data: subModulesData, error: smError } = await supabase
        .from('sub_modules')
        .select(`
          id,
          sub_module_name,
          sub_module_key,
          route_path,
          display_order,
          is_active,
          modules(
            id,
            module_name,
            module_key,
            display_order,
            is_active
          )
        `)
        .in('id', subModuleIds);

      if (smError) {
        console.error('Error fetching sub_modules for fallback:', smError);
      } else {
        // Create a map of sub_module_id to sub_module data
        const subModulesMap = new Map<string, Record<string, unknown>>();
        (subModulesData || []).forEach((sm: Record<string, unknown>) => {
          subModulesMap.set(sm.id as string, sm);
        });

        // Enrich raw permissions with sub_module data
        enrichedStaffPermissions = rawStaffPermissions
          .map((p: Record<string, unknown>) => ({
            ...p,
            sub_modules: subModulesMap.get(p.sub_module_id as string) || null,
          }))
          .filter((p: Record<string, unknown>) => p.sub_modules !== null) as unknown as typeof enrichedStaffPermissions;

        console.log('Enriched permissions count:', enrichedStaffPermissions.length);
        if (enrichedStaffPermissions.length > 0) {
          console.log('Sample enriched permission:', JSON.stringify(enrichedStaffPermissions[0], null, 2));
        }
      }
    }

    // Use enrichedStaffPermissions for the rest of the processing
    const finalStaffPermissions = enrichedStaffPermissions;

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
    
    // First, aggregate role permissions by sub-module
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
      const permissionCategory = rp.permission_categories as {
        category_key?: string;
      } | null;
      const key = subModule.sub_module_key;
      const categoryKey = permissionCategory?.category_key || '';
      const roleViewAccess = Boolean(rp.view_access) || (categoryKey === 'edit' && Boolean(rp.edit_access));
      const roleEditAccess = Boolean(rp.edit_access) && categoryKey === 'edit';

      const existing = permissionsMap.get(key);
      permissionsMap.set(key, {
        module_name: subModule.modules.module_name,
        module_key: subModule.modules.module_key,
        module_display_order: subModule.modules.display_order,
        sub_module_name: subModule.sub_module_name,
        sub_module_key: subModule.sub_module_key,
        route_path: subModule.route_path,
        sub_module_display_order: subModule.display_order,
        has_view_access: Boolean(existing?.has_view_access) || roleViewAccess,
        has_edit_access: Boolean(existing?.has_edit_access) || roleEditAccess,
        source: 'role',
      });
    });

    // Then, override with staff permissions (highest precedence)
    (finalStaffPermissions || []).forEach((sp: Record<string, unknown>) => {
      const subModuleRaw = sp.sub_modules;
      // Handle both array and object formats
      const subModule = Array.isArray(subModuleRaw) ? subModuleRaw[0] : subModuleRaw as {
        sub_module_key: string;
        sub_module_name: string;
        route_path: string;
        display_order: number;
        modules: {
          module_name: string;
          module_key: string;
          display_order: number;
        } | Array<{
          module_name: string;
          module_key: string;
          display_order: number;
        }>;
      };
      const permissionCategory = sp.permission_categories as {
        category_key?: string;
      } | null;
      
      if (!subModule || !subModule.sub_module_key) return;
      
      const key = subModule.sub_module_key;
      const categoryKey = permissionCategory?.category_key || '';
      
      // Handle modules being either object or array
      const moduleData = Array.isArray(subModule.modules) ? subModule.modules[0] : subModule.modules;
      if (!moduleData) return;
      
      const staffViewAccess = Boolean(sp.view_access) || (categoryKey === 'edit' && Boolean(sp.edit_access));
      const staffEditAccess = Boolean(sp.edit_access) && categoryKey === 'edit';
      const existing = permissionsMap.get(key);

      permissionsMap.set(key, {
        module_name: moduleData.module_name,
        module_key: moduleData.module_key,
        module_display_order: moduleData.display_order,
        sub_module_name: subModule.sub_module_name,
        sub_module_key: subModule.sub_module_key,
        route_path: subModule.route_path,
        sub_module_display_order: subModule.display_order,
        has_view_access: Boolean(existing?.has_view_access) || staffViewAccess,
        has_edit_access: Boolean(existing?.has_edit_access) || staffEditAccess,
        source: 'staff',
      });
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
      
      if (!perm.has_view_access) {
        return;
      }

      modRecord.sub_modules.push({
        name: perm.sub_module_name,
        key: perm.sub_module_key,
        route: perm.route_path,
        has_view_access: perm.has_view_access,
        has_edit_access: perm.has_edit_access,
      });
    });

    // Convert to array and sort
    const menuItems = Array.from(modulesMap.values())
      .map(module => ({
        ...module,
        sub_modules: module.sub_modules
          .filter(sm => sm.has_view_access)
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter(module => module.sub_modules.length > 0)
      .sort((a, b) => a.display_order - b.display_order)
      ;

    // Final debug log
    console.log('=== MENU API FINAL RESULT for staff:', id, '===');
    console.log('Total modules returned:', menuItems.length);
    menuItems.forEach(module => {
      console.log(`  Module: ${module.module_name} (${module.module_key}) - ${module.sub_modules.length} sub-modules`);
      module.sub_modules.forEach(sm => {
        console.log(`    - ${sm.name} (view: ${sm.has_view_access}, edit: ${sm.has_edit_access})`);
      });
    });

    return NextResponse.json({ data: menuItems }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/staff/[id]/menu:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
