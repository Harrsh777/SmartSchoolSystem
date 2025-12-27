/**
 * API Permission Checking Helper
 * For use in Next.js API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { hasPermission } from './rbac';
import { supabase } from './supabase';

export interface PermissionCheckResult {
  allowed: boolean;
  error?: string;
  staffId?: string;
}

/**
 * Check if a staff member has a specific permission
 * @param request - Next.js request object
 * @param permissionKey - Permission key to check
 * @param schoolCode - School code (optional, will try to extract from request)
 * @returns PermissionCheckResult
 */
export async function checkPermission(
  request: NextRequest,
  permissionKey: string,
  schoolCode?: string
): Promise<PermissionCheckResult> {
  try {
    // Get school code from query params or body
    let finalSchoolCode = schoolCode;
    if (!finalSchoolCode) {
      const searchParams = request.nextUrl.searchParams;
      finalSchoolCode = searchParams.get('school_code') || undefined;
    }

    if (!finalSchoolCode) {
      // Try to get from body
      try {
        const body = await request.clone().json();
        finalSchoolCode = body.school_code;
      } catch {
        // Body might not be JSON or might be empty
      }
    }

    if (!finalSchoolCode) {
      return {
        allowed: false,
        error: 'School code is required',
      };
    }

    // Get staff_id from headers (set by frontend after login)
    const staffId = request.headers.get('x-staff-id');
    const staffIdParam = request.headers.get('x-staff-id-param'); // Alternative header

    if (!staffId && !staffIdParam) {
      // For now, allow if no staff_id is provided (backward compatibility)
      // In production, you might want to require authentication
      return {
        allowed: true, // Allow for backward compatibility
      };
    }

    const finalStaffId = staffId || staffIdParam;

    // Get staff UUID from staff_id
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .eq('school_code', finalSchoolCode)
      .eq('staff_id', finalStaffId)
      .single();

    if (staffError || !staffData) {
      return {
        allowed: false,
        error: 'Staff not found',
      };
    }

    // Check if staff has permission
    const hasAccess = await hasPermission(staffData.id, permissionKey);

    return {
      allowed: hasAccess,
      staffId: staffData.id,
      error: hasAccess ? undefined : 'Insufficient permissions',
    };
  } catch (error) {
    console.error('Error checking permission:', error);
    return {
      allowed: false,
      error: 'Error checking permissions',
    };
  }
}

/**
 * Middleware function to protect an API route
 * Returns NextResponse with 403 if permission check fails
 */
export async function requirePermission(
  request: NextRequest,
  permissionKey: string,
  schoolCode?: string
): Promise<NextResponse | null> {
  const check = await checkPermission(request, permissionKey, schoolCode);

  if (!check.allowed) {
    return NextResponse.json(
      { error: check.error || 'Unauthorized', message: 'You do not have permission to perform this action' },
      { status: 403 }
    );
  }

  return null; // Permission granted
}

/**
 * Check if staff is admin/principal
 * Admin/Principal has full access
 */
export async function isAdminOrPrincipal(
  request: NextRequest,
  schoolCode?: string
): Promise<boolean> {
  try {
    let finalSchoolCode = schoolCode;
    if (!finalSchoolCode) {
      const searchParams = request.nextUrl.searchParams;
      finalSchoolCode = searchParams.get('school_code') || undefined;
    }

    if (!finalSchoolCode) {
      return false;
    }

    const staffId = request.headers.get('x-staff-id') || request.headers.get('x-staff-id-param');

    if (!staffId) {
      return false;
    }

    const { data: staffData } = await supabase
      .from('staff')
      .select('role, designation')
      .eq('school_code', finalSchoolCode)
      .eq('staff_id', staffId)
      .single();

    if (!staffData) {
      return false;
    }

    const role = staffData.role?.toLowerCase() || '';
    const designation = staffData.designation?.toLowerCase() || '';

    return (
      role === 'principal' ||
      role === 'admin' ||
      designation === 'principal' ||
      designation === 'admin'
    );
  } catch {
    return false;
  }
}

