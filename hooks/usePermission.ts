'use client';

import { useState, useEffect } from 'react';
import { checkPermission, PermissionResult } from '@/lib/permissions';

/**
 * Hook to check staff permissions
 */
export function usePermission(
  staffId: string | null | undefined,
  subModuleKey: string,
  categoryKey: string
) {
  const [hasViewAccess, setHasViewAccess] = useState(false);
  const [hasEditAccess, setHasEditAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permissionResult, setPermissionResult] = useState<PermissionResult | null>(null);

  useEffect(() => {
    async function checkPermissions() {
      if (!staffId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await checkPermission(staffId, subModuleKey, categoryKey, 'view');
        setPermissionResult(result);
        setHasViewAccess(result.view_access || false);
        setHasEditAccess(result.edit_access || false);
      } catch (error) {
        console.error('Error checking permissions:', error);
        setHasViewAccess(false);
        setHasEditAccess(false);
      } finally {
        setLoading(false);
      }
    }

    checkPermissions();
  }, [staffId, subModuleKey, categoryKey]);

  return { hasViewAccess, hasEditAccess, loading, permissionResult };
}
