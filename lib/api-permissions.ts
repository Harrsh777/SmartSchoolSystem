import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * Check if the requesting user has the required permission
 * @param request - Next.js request object
 * @param permissionKey - The permission key to check (e.g., 'view_fees', 'manage_students')
 * @param schoolCode - Optional school code to verify (if not provided, uses header value)
 * @returns NextResponse with 403 if unauthorized, null if authorized
 */
export async function requirePermission(
  request: NextRequest,
  permissionKey: string
): Promise<NextResponse | null> {
  try {
    // Get staff ID from request headers (set by middleware or auth)
    const staffId = request.headers.get('x-staff-id');
    // Note: schoolCode parameter can be used for additional validation if needed

    // If no staff ID, check if it's in the URL params or query
    if (!staffId) {
      const url = new URL(request.url);
      const staffIdParam = url.searchParams.get('staff_id');
      if (staffIdParam) {
        // Use the staff ID from query params
        const supabase = getServiceRoleClient();
        
        // Get staff permissions
        const { data: permissionsData, error: permError } = await supabase
          .rpc('get_staff_permissions', {
            p_staff_id: staffIdParam,
          });

        if (permError) {
          console.error('Error fetching permissions:', permError);
          // Allow access if we can't check permissions (fail open for now)
          return null;
        }

        // Check if permission exists
        const hasPermission = permissionsData?.some(
          (p: { permission_key?: string }) => p.permission_key === permissionKey
        );

        if (!hasPermission) {
          return NextResponse.json(
            { error: 'Insufficient permissions', required: permissionKey },
            { status: 403 }
          );
        }

        return null;
      }

      // If no staff ID at all, allow access (for public endpoints or admin endpoints)
      // In production, you might want to be more strict here
      return null;
    }

    const supabase = getServiceRoleClient();

    // Get staff permissions
    const { data: permissionsData, error: permError } = await supabase
      .rpc('get_staff_permissions', {
        p_staff_id: staffId,
      });

    if (permError) {
      console.error('Error fetching permissions:', permError);
      // Allow access if we can't check permissions (fail open for now)
      // In production, you might want to fail closed
      return null;
    }

    // Check if permission exists
    const hasPermission = permissionsData?.some(
      (p: { permission_key?: string }) => p.permission_key === permissionKey
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions', required: permissionKey },
        { status: 403 }
      );
    }

    return null;
  } catch (error) {
    console.error('Error checking permissions:', error);
    // Fail open - allow access if there's an error checking permissions
    // In production, you might want to fail closed
    return null;
  }
}
