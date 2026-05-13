'use client';

import { Loader2 } from 'lucide-react';
import { useRedirectToTeacherSchoolPath } from '@/lib/teacher-portal/use-redirect-to-teacher-school-path';

export default function LegacyTeacherVisitorManagementRedirect() {
  useRedirectToTeacherSchoolPath('visitor-management');
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
