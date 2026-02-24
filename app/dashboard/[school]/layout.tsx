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
  const [sessionChecked, setSessionChecked] = useState(false);

  // Logout handler for 401 responses only – clear only admin session so teacher tab is unaffected
  useEffect(() => {
    const logout = () => {
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      sessionStorage.removeItem('school');
      sessionStorage.removeItem('admin_authenticated');
      router.push('/login');
    };
    setLogoutHandler(logout);
    setupApiInterceptor();
    return () => {
      removeApiInterceptor();
    };
  }, [router]);

  // Require admin session; if sessionStorage is empty (e.g. new tab), rehydrate from server so multiple tabs work
  useEffect(() => {
    const storedSchool = sessionStorage.getItem('school');
    if (storedSchool) {
      setSessionChecked(true);
      return;
    }
    let cancelled = false;
    fetch('/api/auth/session', { credentials: 'include' })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          return res.json().then((data) => {
            if (data.role === 'school' && data.user) {
              sessionStorage.setItem('school', JSON.stringify(data.user));
              sessionStorage.setItem('admin_authenticated', '1');
              setSessionChecked(true);
            } else {
              router.push('/login');
            }
          });
        } else {
          router.push('/login');
        }
      })
      .catch(() => {
        if (!cancelled) router.push('/login');
      });
    return () => { cancelled = true; };
  }, [router]);

  // Get school name from sessionStorage or API (must run every render for Rules of Hooks)
  useEffect(() => {
    const storedSchool = sessionStorage.getItem('school');
    if (storedSchool) {
      const schoolData: AcceptedSchool = JSON.parse(storedSchool);
      if (schoolData.school_code === schoolCode) {
        setSchoolName(schoolData.school_name);
        return;
      }
    }

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

  if (!sessionChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#2F6FED] border-t-transparent" />
      </div>
    );
  }

  return (
    <TranslationProvider>
      <DashboardLayout schoolName={schoolName}>
        {children}
      </DashboardLayout>
    </TranslationProvider>
  );
}

