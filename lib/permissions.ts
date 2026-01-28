/**
 * Permission utility functions for checking staff permissions
 */

export interface PermissionResult {
  view_access: boolean;
  edit_access: boolean;
  has_access: boolean;
  source: 'role' | 'staff' | 'none';
}

/**
 * Check if a staff member has a specific permission
 */
export async function checkPermission(
  staffId: string,
  subModuleKey: string,
  categoryKey: string,
  accessType: 'view' | 'edit' = 'view'
): Promise<PermissionResult> {
  try {
    const response = await fetch(
      `/api/permissions/check?staff_id=${staffId}&sub_module=${subModuleKey}&category=${categoryKey}&access_type=${accessType}`
    );

    if (!response.ok) {
      console.error('Error checking permission:', response.statusText);
      return {
        view_access: false,
        edit_access: false,
        has_access: false,
        source: 'none',
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error checking permission:', error);
    return {
      view_access: false,
      edit_access: false,
      has_access: false,
      source: 'none',
    };
  }
}

/**
 * Get all permissions for a staff member
 */
export async function getStaffPermissions(staffId: string) {
  try {
    const response = await fetch(`/api/staff/${staffId}/permissions`);

    if (!response.ok) {
      console.error('Error fetching staff permissions:', response.statusText);
      return [];
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching staff permissions:', error);
    return [];
  }
}

/**
 * Get menu items for a staff member based on their permissions
 */
export async function getStaffMenuItems(staffId: string) {
  try {
    const response = await fetch(`/api/staff/${staffId}/menu`);

    if (!response.ok) {
      console.error('Error fetching staff menu:', response.statusText);
      return [];
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching staff menu:', error);
    return [];
  }
}

/**
 * Get all modules with sub-modules and categories
 */
export async function getModules() {
  try {
    const response = await fetch('/api/modules');

    if (!response.ok) {
      console.error('Error fetching modules:', response.statusText);
      return [];
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching modules:', error);
    return [];
  }
}
