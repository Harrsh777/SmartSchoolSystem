'use client';

import { ReactNode } from 'react';
import { usePermission } from '@/hooks/usePermission';
import { Loader2, ShieldX } from 'lucide-react';

interface ProtectedComponentProps {
  staffId: string | null | undefined;
  subModuleKey: string;
  categoryKey: string;
  requiredAccess: 'view' | 'edit';
  children: ReactNode;
  fallback?: ReactNode;
}

export default function ProtectedComponent({
  staffId,
  subModuleKey,
  categoryKey,
  requiredAccess,
  children,
  fallback,
}: ProtectedComponentProps) {
  const { hasViewAccess, hasEditAccess, loading } = usePermission(
    staffId,
    subModuleKey,
    categoryKey
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#2F6FED]" />
      </div>
    );
  }

  const hasAccess = requiredAccess === 'view' ? hasViewAccess : hasEditAccess;

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg">
        <ShieldX className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Access Denied</h3>
        <p className="text-sm text-gray-500 text-center max-w-md">
          You don&apos;t have permission to access this resource. Please contact your administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
