/**
 * Role-Based Access Control (RBAC) Helper Functions
 * Smart School ERP
 */

import { supabase } from './supabase';

export interface Permission {
  key: string;
  name: string;
  module: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions?: Permission[];
}

export interface StaffRole {
  id: string;
  staff_id: string;
  role_id: string;
  role?: Role;
}

/**
 * Get all permissions for a staff member
 * @param staffId - Staff UUID
 * @returns Array of permission keys
 */
export async function getStaffPermissions(staffId: string): Promise<string[]> {
  try {
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
      return [];
    }

    if (!data) return [];

    // Extract unique permission keys
    const permissionKeys = new Set<string>();
    data.forEach((staffRole) => {
      const role = staffRole.role as { role_permissions?: Array<{ permission: { key: string } }> };
      if (role?.role_permissions) {
        role.role_permissions.forEach((rp) => {
          if (rp.permission?.key) {
            permissionKeys.add(rp.permission.key);
          }
        });
      }
    });

    return Array.from(permissionKeys);
  } catch (error) {
    console.error('Error in getStaffPermissions:', error);
    return [];
  }
}

/**
 * Get all permissions for a staff member by school_code and staff_id
 * @param schoolCode - School code
 * @param staffId - Staff ID (not UUID, the staff_id field)
 * @returns Array of permission keys
 */
export async function getStaffPermissionsByStaffId(
  schoolCode: string,
  staffId: string
): Promise<string[]> {
  try {
    // First, get the staff UUID from staff_id
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .eq('school_code', schoolCode)
      .eq('staff_id', staffId)
      .single();

    if (staffError || !staffData) {
      console.error('Staff not found:', staffError);
      return [];
    }

    return await getStaffPermissions(staffData.id);
  } catch (error) {
    console.error('Error in getStaffPermissionsByStaffId:', error);
    return [];
  }
}

/**
 * Check if staff has a specific permission
 * @param staffId - Staff UUID
 * @param permissionKey - Permission key to check
 * @returns Boolean
 */
export async function hasPermission(staffId: string, permissionKey: string): Promise<boolean> {
  const permissions = await getStaffPermissions(staffId);
  return permissions.includes(permissionKey);
}

/**
 * Check if staff has any of the specified permissions
 * @param staffId - Staff UUID
 * @param permissionKeys - Array of permission keys
 * @returns Boolean
 */
export async function hasAnyPermission(
  staffId: string,
  permissionKeys: string[]
): Promise<boolean> {
  const permissions = await getStaffPermissions(staffId);
  return permissionKeys.some((key) => permissions.includes(key));
}

/**
 * Get all roles for a staff member
 * @param staffId - Staff UUID
 * @returns Array of roles
 */
export async function getStaffRoles(staffId: string): Promise<Role[]> {
  try {
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
      return [];
    }

    if (!data) return [];

    return data
      .map((sr) => sr.role as Role)
      .filter((role): role is Role => role !== null && role !== undefined);
  } catch (error) {
    console.error('Error in getStaffRoles:', error);
    return [];
  }
}

/**
 * Get all available roles
 * @returns Array of roles with permissions
 */
export async function getAllRoles(): Promise<Role[]> {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select(`
        id,
        name,
        description,
        role_permissions (
          permission:permissions (
            id,
            key,
            name,
            module
          )
        )
      `)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching roles:', error);
      return [];
    }

    if (!data) return [];

    return data.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: (role.role_permissions as Array<{ permission: Permission }>)
        ?.map((rp) => rp.permission)
        .filter((p): p is Permission => p !== null && p !== undefined),
    }));
  } catch (error) {
    console.error('Error in getAllRoles:', error);
    return [];
  }
}

/**
 * Get all available permissions
 * @returns Array of permissions
 */
export async function getAllPermissions(): Promise<Permission[]> {
  try {
    const { data, error } = await supabase
      .from('permissions')
      .select('id, key, name, description, module')
      .order('module', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching permissions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllPermissions:', error);
    return [];
  }
}

/**
 * Permission to module mapping for UI
 */
export const PERMISSION_MODULE_MAP: Record<string, string> = {
  manage_students: '/students',
  manage_staff: '/staff-management',
  manage_fees: '/fees',
  manage_exams: '/examinations',
  manage_timetable: '/timetable',
  manage_events: '/calendar',
  manage_transport: '/transport',
  manage_library: '/library',
  manage_classes: '/classes',
  manage_communication: '/communication',
  manage_passwords: '/password',
  view_reports: '/reports',
};

/**
 * Check if a route should be visible based on permissions
 * @param path - Route path
 * @param permissions - Array of permission keys
 * @returns Boolean
 */
export function isRouteAllowed(path: string, permissions: string[]): boolean {
  // Always allow home and settings
  if (path === '' || path === '/settings' || path === '/institute-info') {
    return true;
  }

  // Check if any permission grants access to this route
  for (const [permissionKey, routePath] of Object.entries(PERMISSION_MODULE_MAP)) {
    if (permissions.includes(permissionKey) && path.startsWith(routePath)) {
      return true;
    }
  }

  // Role Management and Password Manager are special - check for admin/principal
  // This will be handled separately in the UI
  if (path === '/admin-roles' || path === '/password') {
    return true; // Will be filtered by admin check in UI
  }

  return false;
}

