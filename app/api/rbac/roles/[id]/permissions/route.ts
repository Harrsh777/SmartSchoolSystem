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
 * POST /api/rbac/roles/[id]/permissions
 * Assign permissions to a role
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { permission_ids } = body;

    if (!Array.isArray(permission_ids)) {
      return NextResponse.json(
        { error: 'permission_ids must be an array' },
        { status: 400 }
      );
    }

    // Use service role client to bypass RLS
    const supabase = getServiceRoleClient();

    // Remove existing permissions
    await supabase.from('role_permissions').delete().eq('role_id', id);

    // Insert new permissions
    if (permission_ids.length > 0) {
      const rolePermissions = permission_ids.map((permissionId: string) => ({
        role_id: id,
        permission_id: permissionId,
      }));

      const { error: insertError } = await supabase
        .from('role_permissions')
        .insert(rolePermissions);

      if (insertError) {
        console.error('Error assigning permissions:', insertError);
        return NextResponse.json(
          { error: 'Failed to assign permissions', details: insertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Permissions assigned successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error assigning permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

