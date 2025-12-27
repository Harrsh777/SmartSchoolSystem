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

    // Combine staff with their roles
    const staffWithRoles = staffData.map((staff) => ({
      id: staff.id,
      staff_id: staff.staff_id,
      full_name: staff.full_name,
      email: staff.email,
      designation: staff.designation,
      school_code: staff.school_code,
      roles: rolesMap.get(staff.id) || [],
    }));

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

