'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function StaffManagementPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to directory page
    router.replace('/teacher/dashboard/staff-management/directory');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to staff directory...</p>
      </div>
    </div>
  );
}
