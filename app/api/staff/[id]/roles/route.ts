import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// GET /api/staff/[id]/roles - Get all roles assigned to a staff member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceRoleClient();

    const { data: staffRoles, error } = await supabase
      .from('staff_roles')
      .select(`
        *,
        roles!inner(
          id,
          role_name,
          role_description,
          is_system_role
        )
      `)
      .eq('staff_id', id)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('Error fetching staff roles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch staff roles', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: staffRoles }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/staff/[id]/roles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/staff/[id]/roles - Assign roles to staff
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { role_ids, assigned_by } = body;

    if (!Array.isArray(role_ids)) {
      return NextResponse.json(
        { error: 'role_ids must be an array' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Verify staff exists and get school_code
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, school_code')
      .eq('id', id)
      .single();

    if (staffError || !staff) {
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      );
    }

    // Verify all roles exist and belong to the same school
    if (role_ids.length > 0) {
      const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('id, school_code, is_active')
        .in('id', role_ids);

      if (rolesError) {
        return NextResponse.json(
          { error: 'Failed to verify roles', details: rolesError.message },
          { status: 500 }
        );
      }

      if (roles.length !== role_ids.length) {
        return NextResponse.json(
          { error: 'One or more roles not found' },
          { status: 404 }
        );
      }

      // Check if all roles belong to the same school
      const invalidRoles = roles.filter(r => r.school_code !== staff.school_code);
      if (invalidRoles.length > 0) {
        return NextResponse.json(
          { error: 'One or more roles do not belong to this school' },
          { status: 400 }
        );
      }

      // Check if any role is inactive
      const inactiveRoles = roles.filter(r => !r.is_active);
      if (inactiveRoles.length > 0) {
        return NextResponse.json(
          { error: 'One or more roles are inactive' },
          { status: 400 }
        );
      }
    }

    // Deactivate all existing role assignments
    const { error: deactivateError } = await supabase
      .from('staff_roles')
      .update({ is_active: false })
      .eq('staff_id', id);

    if (deactivateError) {
      console.error('Error deactivating existing roles:', deactivateError);
      return NextResponse.json(
        { error: 'Failed to update role assignments', details: deactivateError.message },
        { status: 500 }
      );
    }

    // Insert new role assignments
    if (role_ids.length > 0) {
      const assignments = role_ids.map((roleId: string) => ({
        staff_id: id,
        role_id: roleId,
        school_code: staff.school_code,
        assigned_by: assigned_by || null,
        is_active: true,
      }));

      const { data: newAssignments, error: insertError } = await supabase
        .from('staff_roles')
        .upsert(assignments, {
          onConflict: 'staff_id,role_id',
        })
        .select();

      if (insertError) {
        console.error('Error assigning roles:', insertError);
        return NextResponse.json(
          { error: 'Failed to assign roles', details: insertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { data: newAssignments, message: 'Roles assigned successfully' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: 'All roles removed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST /api/staff/[id]/roles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
