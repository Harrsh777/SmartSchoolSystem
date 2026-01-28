import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// GET /api/roles/[id] - Get a specific role
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceRoleClient();

    const { data: role, error } = await supabase
      .from('roles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Role not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch role', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: role }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/roles/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/roles/[id] - Update a role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { role_name, role_description, is_active } = body;

    const supabase = getServiceRoleClient();

    // Check if role exists
    const { data: existingRole, error: fetchError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingRole) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Check if system role is being modified
    if (existingRole.is_system_role && (role_name || is_active === false)) {
      return NextResponse.json(
        { error: 'Cannot modify system roles' },
        { status: 403 }
      );
    }

    // Check if new role name conflicts with existing role
    if (role_name && role_name !== existingRole.role_name) {
      const { data: conflictingRole } = await supabase
        .from('roles')
        .select('id')
        .eq('school_code', existingRole.school_code)
        .eq('role_name', role_name)
        .neq('id', id)
        .single();

      if (conflictingRole) {
        return NextResponse.json(
          { error: 'Role with this name already exists for this school' },
          { status: 409 }
        );
      }
    }

    // Update role
    // Handle both 'name' (old schema) and 'role_name' (new schema) columns
    const updateData: Record<string, unknown> = {};
    if (role_name !== undefined) {
      updateData.role_name = role_name;
      // Also update 'name' column if it exists (for backward compatibility)
      updateData.name = role_name;
    }
    if (role_description !== undefined) updateData.role_description = role_description;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedRole, error: updateError } = await supabase
      .from('roles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating role:', updateError);
      return NextResponse.json(
        { error: 'Failed to update role', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedRole }, { status: 200 });
  } catch (error) {
    console.error('Error in PUT /api/roles/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/roles/[id] - Delete a role
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceRoleClient();

    // Check if role exists
    const { data: existingRole, error: fetchError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingRole) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of system roles
    if (existingRole.is_system_role) {
      return NextResponse.json(
        { error: 'Cannot delete system roles' },
        { status: 403 }
      );
    }

    // Check if role is assigned to any staff
    const { data: staffRoles } = await supabase
      .from('staff_roles')
      .select('id')
      .eq('role_id', id)
      .eq('is_active', true)
      .limit(1);

    if (staffRoles && staffRoles.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete role. It is assigned to staff members. Deactivate it instead.' },
        { status: 409 }
      );
    }

    // Delete role
    const { error: deleteError } = await supabase
      .from('roles')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting role:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete role', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Role deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/roles/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
