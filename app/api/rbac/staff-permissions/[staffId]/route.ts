import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseFetchOptions } from '@/lib/supabase-fetch';

const getServiceRoleClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    getSupabaseFetchOptions()
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
      const { data, error } = await supabase
        .from('permission_categories')
        .select('*')
        .eq('id', categoryId)
        .single();
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching category by ID:', error);
      }
      category = data;
    } else {
      // Try to find "Default" category by category_name (migrated column)
      const { data: defaultCategory, error: defaultError } = await supabase
        .from('permission_categories')
        .select('*')
        .eq('category_name', 'Default')
        .eq('is_active', true)
        .single();
      
      if (defaultError && defaultError.code !== 'PGRST116') {
        console.error('Error fetching Default category:', defaultError);
      }
      
      // If Default doesn't exist, try to get the first active category
      if (!defaultCategory) {
        const { data: firstCategory, error: firstError } = await supabase
          .from('permission_categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .limit(1)
          .single();
        
        if (firstError && firstError.code !== 'PGRST116') {
          console.error('Error fetching first category:', firstError);
        }
        category = firstCategory;
      } else {
        category = defaultCategory;
      }
    }

    if (!category) {
      // Return empty permissions structure if no category found
      return NextResponse.json({
        data: {
          staff: null,
          category: null,
          categories: [],
          modules: [],
        },
      }, { status: 200 });
    }

    // Get all categories for dropdown
    const { data: allCategories } = await supabase
      .from('permission_categories')
      .select('*')
      .eq('is_active', true)
      .order('category_name');

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

    // Try RPC function first, fallback to direct query if it fails
    let permissionsData: PermissionData[] | null = null;

    // Try RPC function first
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_staff_permissions_by_category', {
        p_staff_id: staffData.id,
        p_category_id: category.id,
      });

    if (rpcError || !rpcData) {
      console.warn('RPC function failed or returned no data, using direct query:', rpcError?.message);
      
      // Fallback: Query directly from staff_permissions table
      const { data: directData, error: directError } = await supabase
        .from('staff_permissions')
        .select(`
          view_access,
          edit_access,
          sub_module:sub_modules (
            id,
            sub_module_name,
            sub_module_key,
            route_path,
            supports_view_access,
            supports_edit_access,
            module:modules (
              id,
              module_name,
              module_key
            )
          )
        `)
        .eq('staff_id', staffData.id)
        .eq('category_id', category.id);

      if (directError) {
        console.error('Error fetching permissions directly:', directError);
        // Return empty structure instead of error to allow UI to continue
        return NextResponse.json({
          data: {
            staff: staffData,
            category: category,
            categories: allCategories || [],
            modules: [],
          },
        }, { status: 200 });
      }

      // Transform direct query data to match RPC format
      permissionsData = (directData || []).map((perm: Record<string, unknown>): PermissionData => {
        const subModuleRaw = perm.sub_module;
        const subModule = Array.isArray(subModuleRaw) ? subModuleRaw[0] : (subModuleRaw as Record<string, unknown>);
        const moduleRaw = subModule?.module;
        const moduleData = moduleRaw ? (Array.isArray(moduleRaw) ? moduleRaw[0] : (moduleRaw as Record<string, unknown>)) : null;
        
        return {
          module_id: (moduleData?.id as string) || '',
          module_name: (moduleData?.module_name as string) || '',
          sub_module_id: (subModule?.id as string) || '',
          sub_module_name: (subModule?.sub_module_name as string) || '',
          view_access: (perm.view_access as boolean) || false,
          edit_access: (perm.edit_access as boolean) || false,
          supports_view_access: (subModule?.supports_view_access as boolean) ?? true,
          supports_edit_access: (subModule?.supports_edit_access as boolean) ?? true,
        };
      }).filter((p: PermissionData) => p.module_id && p.sub_module_id) as PermissionData[]; // Filter out invalid entries
    } else {
      permissionsData = rpcData as PermissionData[] | null;
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
      if (!perm.module_id || !perm.sub_module_id) return; // Skip invalid entries
      
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

    // Log for debugging
    console.log('Fetched permissions for staff:', {
      staffId: staffData.id,
      categoryId: category.id,
      categoryName: category.name,
      modulesCount: modules.length,
      totalSubModules: modules.reduce((sum, m) => sum + m.sub_modules.length, 0),
      permissionsWithAccess: modules.reduce((sum, m) => 
        sum + m.sub_modules.filter(sm => sm.view_access || sm.edit_access).length, 0
      ),
    });

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

