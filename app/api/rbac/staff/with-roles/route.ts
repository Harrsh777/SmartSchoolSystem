import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role client to bypass RLS for admin operations
const getServiceRoleClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

/**
 * GET /api/rbac/staff/with-roles
 * Get all staff with their assigned roles
 * Query params: school_code (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required', details: 'Please provide school_code as a query parameter' },
        { status: 400 }
      );
    }

    // Use service role client to bypass RLS
    let supabase;
    try {
      supabase = getServiceRoleClient();
    } catch (envError) {
      console.error('Environment configuration error:', envError);
      return NextResponse.json(
        { 
          error: 'Server configuration error', 
          details: (envError as Error).message
        },
        { status: 500 }
      );
    }

    // Normalize school code to uppercase for consistency
    const normalizedSchoolCode = schoolCode.toUpperCase();

    // Fetch staff first
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select(`
        id,
        staff_id,
        full_name,
        email,
        designation,
        school_code
      `)
      .eq('school_code', normalizedSchoolCode)
      .order('full_name', { ascending: true });

    if (staffError) {
      console.error('Error fetching staff:', staffError);
      return NextResponse.json(
        { error: 'Failed to fetch staff', details: staffError.message },
        { status: 500 }
      );
    }

    if (!staffData || staffData.length === 0) {
      console.log(`No staff found for school ${normalizedSchoolCode}`);
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Fetch staff roles for all staff members
    const staffIds = staffData.map(s => s.id);
    const { data: staffRolesData, error: rolesError } = await supabase
      .from('staff_roles')
      .select(`
        staff_id,
        role:roles (
          id,
          name,
          description
        )
      `)
      .in('staff_id', staffIds);

    if (rolesError) {
      console.error('Error fetching staff roles:', rolesError);
      // Continue even if roles fetch fails - staff will just have empty roles array
    }

    // Fetch assigned categories from staff_permissions table
    const { data: permissionsData, error: permError } = await supabase
      .from('staff_permissions')
      .select(`
        staff_id,
        category:permission_categories (
          id,
          name,
          description
        )
      `)
      .in('staff_id', staffIds);

    if (permError) {
      console.error('Error fetching staff permissions/categories:', permError);
    }

    // Create a map of staff_id to roles
    const rolesMap = new Map<string, Array<{ id: string; name: string; description: string | null }>>();
    if (staffRolesData) {
      staffRolesData.forEach((sr: { staff_id: string; role: { id: string; name: string; description: string | null } | Array<{ id: string; name: string; description: string | null }> | null }) => {
        if (!sr.role) return;
        const role = Array.isArray(sr.role) ? sr.role[0] : sr.role;
        if (role && role.id && role.name) {
          if (!rolesMap.has(sr.staff_id)) {
            rolesMap.set(sr.staff_id, []);
          }
          rolesMap.get(sr.staff_id)!.push({
            id: role.id,
            name: role.name,
            description: role.description,
          });
        }
      });
    }

    // Create a map of staff_id to assigned categories (using Map with category.id as key to avoid duplicates)
    const categoriesMap = new Map<string, Map<string, { id: string; name: string; description: string | null }>>();
    if (permissionsData) {
      permissionsData.forEach((sp: { 
        staff_id: string; 
        category: { id: string; name: string; description: string | null } | Array<{ id: string; name: string; description: string | null }> | null 
      }) => {
        if (!sp.category) return;
        const category = Array.isArray(sp.category) ? sp.category[0] : sp.category;
        if (category && category.id && category.name) {
          if (!categoriesMap.has(sp.staff_id)) {
            categoriesMap.set(sp.staff_id, new Map());
          }
          // Use category.id as key to ensure uniqueness
          categoriesMap.get(sp.staff_id)!.set(category.id, {
            id: category.id,
            name: category.name,
            description: category.description,
          });
        }
      });
    }

    // Combine staff with their roles and categories
    const staffWithRoles = staffData.map((staff) => {
      const assignedRoles = rolesMap.get(staff.id) || [];
      const categoryMap = categoriesMap.get(staff.id);
      const assignedCategories = categoryMap ? Array.from(categoryMap.values()) : [];
      
      // Categories are already in the correct format, just combine with roles
      const allRoles = [...assignedRoles, ...assignedCategories];

      return {
        id: staff.id,
        staff_id: staff.staff_id,
        full_name: staff.full_name,
        email: staff.email,
        designation: staff.designation,
        school_code: staff.school_code,
        roles: allRoles,
      };
    });

    console.log(`Fetched ${staffWithRoles.length} staff members for school ${normalizedSchoolCode}`);

    return NextResponse.json({ data: staffWithRoles }, { status: 200 });
  } catch (error) {
    console.error('Error fetching staff with roles:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

