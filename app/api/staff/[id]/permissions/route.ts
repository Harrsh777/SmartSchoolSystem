import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// GET /api/staff/[id]/permissions - Get all permissions for a staff (merged from roles + overrides)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceRoleClient();

    // Get all roles for this staff
    const { data: staffRoles, error: rolesError } = await supabase
      .from('staff_roles')
      .select('role_id')
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

    // Get permissions from roles
    let rolePermissions: Array<Record<string, unknown>> = [];
    if (roleIds.length > 0) {
      const { data: rp, error: rpError } = await supabase
        .from('role_permissions')
        .select(`
          *,
          sub_modules!inner(
            id,
            sub_module_name,
            sub_module_key,
            route_path,
            modules!inner(
              id,
              module_name,
              module_key
            )
          ),
          permission_categories!inner(
            id,
            category_name,
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
    const { data: staffPermissions, error: spError } = await supabase
      .from('staff_permissions')
      .select(`
        *,
        sub_modules!inner(
          id,
          sub_module_name,
          sub_module_key,
          route_path,
          modules!inner(
            id,
            module_name,
            module_key
          )
        ),
        permission_categories!inner(
          id,
          category_name,
          category_key,
          category_type
        )
      `)
      .eq('staff_id', id);

    if (spError) {
      console.error('Error fetching staff permissions:', spError);
    }

    // Merge permissions (staff_permissions override role_permissions)
    const permissionsMap = new Map<string, Record<string, unknown>>();

    // First, add role permissions
    rolePermissions.forEach((rp: Record<string, unknown>) => {
      const subModule = rp.sub_modules as { sub_module_key: string };
      const category = rp.permission_categories as { category_key: string };
      const key = `${subModule.sub_module_key}_${category.category_key}`;
      
      if (!permissionsMap.has(key)) {
        permissionsMap.set(key, {
          ...rp,
          source: 'role',
        });
      }
    });

    // Then, override with staff permissions
    (staffPermissions || []).forEach((sp: Record<string, unknown>) => {
      const subModule = sp.sub_modules as { sub_module_key: string };
      const category = sp.permission_categories as { category_key: string };
      const key = `${subModule.sub_module_key}_${category.category_key}`;
      
      permissionsMap.set(key, {
        ...sp,
        source: 'staff',
      });
    });

    const mergedPermissions = Array.from(permissionsMap.values());

    return NextResponse.json({ data: mergedPermissions }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/staff/[id]/permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/staff/[id]/permissions - Set individual permission overrides
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { permissions, assigned_by } = body;

    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'permissions must be an array' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Verify staff exists
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .eq('id', id)
      .single();

    if (staffError || !staff) {
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      );
    }

    // Prepare permission records
    const permissionRecords = permissions.map((perm: {
      sub_module_id: string;
      category_id: string;
      view_access: boolean;
      edit_access: boolean;
    }) => ({
      staff_id: id,
      sub_module_id: perm.sub_module_id,
      category_id: perm.category_id,
      view_access: perm.view_access || false,
      edit_access: perm.edit_access || false,
      assigned_by: assigned_by || null,
    }));

    // Upsert permissions
    if (permissionRecords.length > 0) {
      const { data: newPermissions, error: upsertError } = await supabase
        .from('staff_permissions')
        .upsert(permissionRecords, {
          onConflict: 'staff_id,sub_module_id,category_id',
        })
        .select();

      if (upsertError) {
        console.error('Error upserting permissions:', upsertError);
        return NextResponse.json(
          { error: 'Failed to save permissions', details: upsertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { data: newPermissions, message: 'Permissions updated successfully' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: 'No permissions to update' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST /api/staff/[id]/permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
