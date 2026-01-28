import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

interface PermissionCheckResult {
  allowed: boolean;
  staffId?: string;
  error?: string;
}

/**
 * Check if a staff member has permission to access a resource
 * @param staffId - Staff member ID
 * @param subModuleKey - Sub-module key (e.g., 'fee_collection')
 * @param categoryKey - Permission category key (e.g., 'view')
 * @param requiredAccess - Required access type ('view' or 'edit')
 * @returns Permission check result
 */
export async function checkStaffPermission(
  staffId: string,
  subModuleKey: string,
  categoryKey: string,
  requiredAccess: 'view' | 'edit'
): Promise<PermissionCheckResult> {
  try {
    const supabase = getServiceRoleClient();

    // Check individual staff permissions first (highest priority)
    const { data: staffPermission } = await supabase
      .from('staff_permissions')
      .select(`
        view_access,
        edit_access,
        sub_modules!inner(sub_module_key),
        permission_categories!inner(category_key)
      `)
      .eq('staff_id', staffId)
      .eq('sub_modules.sub_module_key', subModuleKey)
      .eq('permission_categories.category_key', categoryKey)
      .single();

    if (staffPermission) {
      const hasAccess = requiredAccess === 'view' 
        ? staffPermission.view_access 
        : staffPermission.edit_access;
      
      return {
        allowed: hasAccess,
        staffId,
      };
    }

    // Check role permissions (get all roles for this staff)
    const { data: staffRoles } = await supabase
      .from('staff_roles')
      .select('role_id')
      .eq('staff_id', staffId)
      .eq('is_active', true);

    if (!staffRoles || staffRoles.length === 0) {
      return {
        allowed: false,
        staffId,
        error: 'No roles assigned',
      };
    }

    const roleIds = staffRoles.map(sr => sr.role_id);

    // Check if any role has the required permission
    const { data: rolePermissions } = await supabase
      .from('role_permissions')
      .select(`
        view_access,
        edit_access,
        sub_modules!inner(sub_module_key),
        permission_categories!inner(category_key)
      `)
      .in('role_id', roleIds)
      .eq('sub_modules.sub_module_key', subModuleKey)
      .eq('permission_categories.category_key', categoryKey);

    if (rolePermissions && rolePermissions.length > 0) {
      // Check if any role has the required access
      const hasAccess = rolePermissions.some(rp => {
        if (requiredAccess === 'view') {
          return rp.view_access === true;
        } else {
          return rp.edit_access === true;
        }
      });

      return {
        allowed: hasAccess,
        staffId,
      };
    }

    // No permission found
    return {
      allowed: false,
      staffId,
      error: 'Permission not granted',
    };
  } catch (error) {
    console.error('Error checking permission:', error);
    return {
      allowed: false,
      staffId,
      error: 'Error checking permission',
    };
  }
}

/**
 * Middleware to check permission for API routes
 * @param request - Next.js request object
 * @param subModuleKey - Sub-module key
 * @param categoryKey - Permission category key
 * @param requiredAccess - Required access type
 * @returns Permission check result or null if staff ID not found
 */
export async function requirePermission(
  request: NextRequest,
  subModuleKey: string,
  categoryKey: string,
  requiredAccess: 'view' | 'edit'
): Promise<PermissionCheckResult | null> {
  // Try to get staff ID from various sources
  let staffId: string | null = null;

  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    try {
      // Token extraction removed - not used
      // const token = authHeader.replace('Bearer ', '');
      // In a real implementation, you'd decode the JWT token
      // For now, we'll check sessionStorage via a custom header
    } catch {
      // Ignore
    }
  }

  // Check custom header
  const staffIdHeader = request.headers.get('x-staff-id');
  if (staffIdHeader) {
    staffId = staffIdHeader;
  }

  // Check query parameters
  const searchParams = request.nextUrl.searchParams;
  if (!staffId) {
    staffId = searchParams.get('staff_id');
  }

  // If still no staff ID, try to get from request body (for POST/PUT requests)
  if (!staffId) {
    try {
      const body = await request.clone().json();
      staffId = body.staff_id || body.enteredBy || null;
    } catch {
      // Request body might not be JSON or might be empty
    }
  }

  if (!staffId) {
    return {
      allowed: false,
      error: 'Staff ID not found in request',
    };
  }

  return await checkStaffPermission(staffId, subModuleKey, categoryKey, requiredAccess);
}

/**
 * Helper to create a permission-protected API route handler
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const permission = await requirePermission(request, 'fee_management', 'view', 'view');
 *   if (!permission || !permission.allowed) {
 *     return NextResponse.json({ error: 'Access denied' }, { status: 403 });
 *   }
 *   // Proceed with request...
 * }
 * ```
 */
export function withPermission(
  subModuleKey: string,
  categoryKey: string,
  requiredAccess: 'view' | 'edit'
) {
  return async (request: NextRequest) => {
    const permission = await requirePermission(request, subModuleKey, categoryKey, requiredAccess);
    if (!permission || !permission.allowed) {
      return NextResponse.json(
        { error: 'Access denied. You do not have permission to access this resource.' },
        { status: 403 }
      );
    }
    return permission;
  };
}
