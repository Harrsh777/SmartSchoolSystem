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
 * GET /api/rbac/staff/[staffId]/permissions
 * Get all permissions for a staff member
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
        role_id,
        role:roles (
          id,
          role_permissions (
            permission:permissions (
              key
            )
          )
        )
      `)
      .eq('staff_id', staffId);

    if (error) {
      console.error('Error fetching staff permissions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch permissions', details: error.message },
        { status: 500 }
      );
    }

    // Extract unique permission keys
    const permissionKeys = new Set<string>();
    (data || []).forEach((staffRole) => {
      const role = staffRole.role as { role_permissions?: Array<{ permission: { key: string } }> };
      if (role?.role_permissions) {
        role.role_permissions.forEach((rp) => {
          if (rp.permission?.key) {
            permissionKeys.add(rp.permission.key);
          }
        });
      }
    });

    return NextResponse.json({ data: Array.from(permissionKeys) }, { status: 200 });
  } catch (error) {
    console.error('Error fetching staff permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions', details: (error as Error).message },
      { status: 500 }
    );
  }
}

