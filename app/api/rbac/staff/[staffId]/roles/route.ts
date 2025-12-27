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
 * GET /api/rbac/staff/[staffId]/roles
 * Get all roles for a staff member
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const { staffId } = await params;
    
    // Use service role client to bypass RLS
    const supabase = getServiceRoleClient();

    const { data, error } = await supabase
      .from('staff_roles')
      .select(`
        role:roles (
          id,
          name,
          description
        )
      `)
      .eq('staff_id', staffId);

    if (error) {
      console.error('Error fetching staff roles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch roles', details: error.message },
        { status: 500 }
      );
    }

    const roles = (data || [])
      .map((sr) => sr.role)
      .filter((role): role is { id: string; name: string; description: string | null } => role !== null && role !== undefined);

    return NextResponse.json({ data: roles }, { status: 200 });
  } catch (error) {
    console.error('Error fetching staff roles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rbac/staff/[staffId]/roles
 * Assign roles to a staff member
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const { staffId } = await params;
    const body = await request.json();
    const { role_ids, assigned_by } = body;

    if (!Array.isArray(role_ids)) {
      return NextResponse.json({ error: 'role_ids must be an array' }, { status: 400 });
    }

    // Use service role client to bypass RLS
    const supabase = getServiceRoleClient();

    // Remove existing role assignments
    await supabase.from('staff_roles').delete().eq('staff_id', staffId);

    // Insert new role assignments
    if (role_ids.length > 0) {
      const staffRoles = role_ids.map((roleId: string) => ({
        staff_id: staffId,
        role_id: roleId,
        assigned_by: assigned_by || null,
      }));

      const { data, error: insertError } = await supabase
        .from('staff_roles')
        .insert(staffRoles)
        .select();

      if (insertError) {
        console.error('Error assigning roles:', insertError);
        return NextResponse.json(
          { error: 'Failed to assign roles', details: insertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ data }, { status: 201 });
    }

    return NextResponse.json(
      { message: 'Roles updated successfully', data: [] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error assigning roles:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

