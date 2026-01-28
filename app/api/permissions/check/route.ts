import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// GET /api/permissions/check - Check if staff has specific permission
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const staffId = searchParams.get('staff_id');
    const subModuleKey = searchParams.get('sub_module');
    const categoryKey = searchParams.get('category');
    const accessType = searchParams.get('access_type') || 'view';

    if (!staffId || !subModuleKey || !categoryKey) {
      return NextResponse.json(
        { error: 'staff_id, sub_module, and category are required' },
        { status: 400 }
      );
    }

    if (accessType !== 'view' && accessType !== 'edit') {
      return NextResponse.json(
        { error: 'access_type must be "view" or "edit"' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // First check individual staff permissions (highest priority)
    const { data: staffPermission, error: spError } = await supabase
      .from('staff_permissions')
      .select('view_access, edit_access')
      .eq('staff_id', staffId)
      .eq('sub_modules.sub_module_key', subModuleKey)
      .eq('permission_categories.category_key', categoryKey)
      .single();

    if (!spError && staffPermission) {
      return NextResponse.json({
        view_access: staffPermission.view_access || false,
        edit_access: staffPermission.edit_access || false,
        has_access: accessType === 'view' 
          ? staffPermission.view_access 
          : staffPermission.edit_access,
        source: 'staff',
      }, { status: 200 });
    }

    // If no individual permission, check role permissions
    const { data: staffRoles, error: srError } = await supabase
      .from('staff_roles')
      .select('role_id')
      .eq('staff_id', staffId)
      .eq('is_active', true);

    if (srError || !staffRoles || staffRoles.length === 0) {
      return NextResponse.json({
        view_access: false,
        edit_access: false,
        has_access: false,
        source: 'none',
      }, { status: 200 });
    }

    const roleIds = staffRoles.map(sr => sr.role_id);

    // Check if any role has the required permission
    const { data: rolePermission, error: rpError } = await supabase
      .from('role_permissions')
      .select('view_access, edit_access')
      .in('role_id', roleIds)
      .eq('sub_modules.sub_module_key', subModuleKey)
      .eq('permission_categories.category_key', categoryKey)
      .limit(1)
      .single();

    if (!rpError && rolePermission) {
      return NextResponse.json({
        view_access: rolePermission.view_access || false,
        edit_access: rolePermission.edit_access || false,
        has_access: accessType === 'view' 
          ? rolePermission.view_access 
          : rolePermission.edit_access,
        source: 'role',
      }, { status: 200 });
    }

    // No permission found
    return NextResponse.json({
      view_access: false,
      edit_access: false,
      has_access: false,
      source: 'none',
    }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/permissions/check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
