import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// GET /api/staff/[id]/permissions - Get all permissions for a staff member
// Returns format: { sub_module_id, category_id, view_access, edit_access }
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceRoleClient();

    // Get staff permissions directly - this is the simple, direct approach
    const { data: staffPermissions, error: spError } = await supabase
      .from('staff_permissions')
      .select('sub_module_id, category_id, view_access, edit_access')
      .eq('staff_id', id);

    if (spError) {
      console.error('Error fetching staff permissions:', spError);
      return NextResponse.json(
        { error: 'Failed to fetch permissions', details: spError.message },
        { status: 500 }
      );
    }

    console.log('GET /api/staff/[id]/permissions - Found', staffPermissions?.length || 0, 'permissions for staff:', id);

    // Return the permissions in the format expected by the UI
    return NextResponse.json({ data: staffPermissions || [] }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/staff/[id]/permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/staff/[id]/permissions - Set staff permissions directly
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { permissions, assigned_by } = body;

    console.log('POST /api/staff/[id]/permissions - Staff:', id);
    console.log('Received permissions count:', permissions?.length || 0);

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
      console.error('Staff not found:', id, staffError);
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      );
    }

    // First, delete all existing permissions for this staff
    const { error: deleteError } = await supabase
      .from('staff_permissions')
      .delete()
      .eq('staff_id', id);

    if (deleteError) {
      console.error('Error deleting existing permissions:', deleteError);
      return NextResponse.json(
        { error: 'Failed to clear existing permissions', details: deleteError.message },
        { status: 500 }
      );
    }

    // Filter to only include permissions that have view_access or edit_access enabled
    const permissionsToSave = permissions.filter((perm: {
      sub_module_id: string;
      category_id: string;
      view_access: boolean;
      edit_access: boolean;
    }) => perm.view_access || perm.edit_access);

    console.log('Permissions to save (with access):', permissionsToSave.length);

    // Prepare permission records
    const permissionRecords = permissionsToSave.map((perm: {
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

    // Insert new permissions
    if (permissionRecords.length > 0) {
      console.log('Sample permission record:', JSON.stringify(permissionRecords[0], null, 2));

      const { data: newPermissions, error: insertError } = await supabase
        .from('staff_permissions')
        .insert(permissionRecords)
        .select();

      if (insertError) {
        console.error('Error inserting permissions:', insertError);
        return NextResponse.json(
          { error: 'Failed to save permissions', details: insertError.message },
          { status: 500 }
        );
      }

      console.log('Successfully saved', newPermissions?.length || 0, 'permissions');

      return NextResponse.json(
        { data: newPermissions, message: 'Permissions updated successfully' },
        { status: 200 }
      );
    }

    console.log('No permissions to save');
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
