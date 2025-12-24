'use client';

import { use, useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import type { AcceptedSchool } from '@/lib/supabase';

export default function SchoolDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [schoolName, setSchoolName] = useState('School Dashboard');
  
  useEffect(() => {
    // Get school name from sessionStorage
    const storedSchool = sessionStorage.getItem('school');
    if (storedSchool) {
      const schoolData: AcceptedSchool = JSON.parse(storedSchool);
      if (schoolData.school_code === schoolCode) {
        setSchoolName(schoolData.school_name);
        return;
      }
    }

    // If not in sessionStorage, fetch from API
    fetch(`/api/schools/accepted`)
      .then(res => res.json())
      .then(result => {
        if (result.data) {
          const schoolData = result.data.find((s: AcceptedSchool) => s.school_code === schoolCode);
          if (schoolData) {
            setSchoolName(schoolData.school_name);
            sessionStorage.setItem('school', JSON.stringify(schoolData));
          }
        }
      })
      .catch(err => console.error('Error fetching school:', err));
  }, [schoolCode]);

  return (
    <DashboardLayout schoolName={schoolName}>
      {children}
    </DashboardLayout>
  );
}

