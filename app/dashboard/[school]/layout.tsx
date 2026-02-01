'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { TranslationProvider } from '@/contexts/TranslationContext';
import type { AcceptedSchool } from '@/lib/supabase';
import { setupApiInterceptor, removeApiInterceptor, setLogoutHandler } from '@/lib/api-interceptor';

export default function SchoolDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [schoolName, setSchoolName] = useState('School Dashboard');

  // Logout handler for 401 responses only (no inactivity timeout)
  useEffect(() => {
    const logout = () => {
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      sessionStorage.clear();
      router.push('/login');
    };
    setLogoutHandler(logout);
    setupApiInterceptor();
    return () => {
      removeApiInterceptor();
    };
  }, [router]);

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
    <TranslationProvider>
      <DashboardLayout schoolName={schoolName}>
        {children}
      </DashboardLayout>
    </TranslationProvider>
  );
}

