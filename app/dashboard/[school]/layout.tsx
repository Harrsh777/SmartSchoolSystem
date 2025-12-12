'use client';

import { use } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getSchoolBySlug, createSchoolSlug } from '@/lib/demoData';

export default function SchoolDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ school: string }>;
}) {
  const { school: schoolSlug } = use(params);
  
  // Get school data or use fallback
  const school = getSchoolBySlug(schoolSlug);
  const schoolName = school?.name || schoolSlug.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ') + ' School';

  return (
    <DashboardLayout schoolName={schoolName}>
      {children}
    </DashboardLayout>
  );
}

