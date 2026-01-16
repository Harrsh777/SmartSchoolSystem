import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getServiceRoleClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

/**
 * GET /api/rbac/staff-permissions/[staffId]
 * Get detailed permissions for a specific staff member
 * Query params: category_id (optional, defaults to Default category)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const { staffId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('category_id');

    const supabase = getServiceRoleClient();

    // Get staff info by UUID only
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, staff_id, full_name, email, designation, photo_url')
      .eq('id', staffId)
      .single();

    if (staffError || !staffData) {
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      );
    }

    // Get category (default to "Default" if not provided)
    let category;
    if (categoryId) {
      const { data } = await supabase
        .from('permission_categories')
        .select('*')
        .eq('id', categoryId)
        .single();
      category = data;
    } else {
      const { data } = await supabase
        .from('permission_categories')
        .select('*')
        .eq('name', 'Default')
        .single();
      category = data;
    }

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Get all categories for dropdown
    const { data: allCategories } = await supabase
      .from('permission_categories')
      .select('*')
      .order('name');

    // Get permissions using the helper function - use staff UUID
    const { data: permissionsData, error: permError } = await supabase
      .rpc('get_staff_permissions_by_category', {
        p_staff_id: staffData.id,
        p_category_id: category.id,
      });

    if (permError) {
      console.error('Error fetching permissions:', permError);
      return NextResponse.json(
        { error: 'Failed to fetch permissions', details: permError.message },
        { status: 500 }
      );
    }

    interface PermissionData {
      module_id: string;
      module_name: string;
      sub_module_id: string;
      sub_module_name: string;
      view_access: boolean;
      edit_access: boolean;
      supports_view_access: boolean;
      supports_edit_access: boolean;
    }

    // Group by module
    const modulesMap = new Map<string, {
      id: string;
      name: string;
      sub_modules: Array<{
        id: string;
        name: string;
        view_access: boolean;
        edit_access: boolean;
        supports_view_access: boolean;
        supports_edit_access: boolean;
      }>;
    }>();
    permissionsData?.forEach((perm: PermissionData) => {
      if (!modulesMap.has(perm.module_id)) {
        modulesMap.set(perm.module_id, {
          id: perm.module_id,
          name: perm.module_name,
          sub_modules: [],
        });
      }
      const moduleData = modulesMap.get(perm.module_id);
      if (moduleData) {
        moduleData.sub_modules.push({
          id: perm.sub_module_id,
          name: perm.sub_module_name,
          view_access: perm.view_access,
          edit_access: perm.edit_access,
          supports_view_access: perm.supports_view_access,
          supports_edit_access: perm.supports_edit_access,
        });
      }
    });

    const modules = Array.from(modulesMap.values());

    return NextResponse.json({
      data: {
        staff: staffData,
        category: category,
        categories: allCategories || [],
        modules: modules,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching staff permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rbac/staff-permissions/[staffId]
 * Update permissions for a specific staff member
 * Body: { category_id, permissions: [{ sub_module_id, view_access, edit_access }] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const { staffId } = await params;
    const body = await request.json();
    const { category_id, permissions, assigned_by } = body;

    if (!category_id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'Permissions must be an array' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Verify staff exists by UUID only
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .eq('id', staffId)
      .single();

    if (staffError || !staffData) {
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      );
    }

    // Verify category exists
    const { data: categoryData, error: categoryError } = await supabase
      .from('permission_categories')
      .select('id')
      .eq('id', category_id)
      .single();

    if (categoryError || !categoryData) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Delete existing permissions for this staff and category
    const { error: deleteError } = await supabase
      .from('staff_permissions')
      .delete()
      .eq('staff_id', staffData.id)
      .eq('category_id', category_id);

    if (deleteError) {
      console.error('Error deleting existing permissions:', deleteError);
      return NextResponse.json(
        { error: 'Failed to update permissions', details: deleteError.message },
        { status: 500 }
      );
    }

    interface PermissionInput {
      sub_module_id: string;
      view_access: boolean;
      edit_access: boolean;
    }

    // Insert new permissions
    const permissionsToInsert = permissions
      .filter((p: PermissionInput) => p.view_access || p.edit_access)
      .map((p: PermissionInput) => ({
        staff_id: staffData.id,
        sub_module_id: p.sub_module_id,
        category_id: category_id,
        view_access: p.view_access || false,
        edit_access: p.edit_access || false,
        assigned_by: assigned_by || null,
        assigned_at: new Date().toISOString(),
      }));

    if (permissionsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('staff_permissions')
        .insert(permissionsToInsert);

      if (insertError) {
        console.error('Error inserting permissions:', insertError);
        return NextResponse.json(
          { error: 'Failed to save permissions', details: insertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      message: 'Permissions updated successfully',
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating staff permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

