'use client';

import { useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';

/**
 * Ensures the `[school]` segment matches the signed-in teacher's school (sessionStorage).
 */
export default function TeacherSchoolScopedLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const paramSchool = String(params.school ?? '').trim();

  useEffect(() => {
    if (!paramSchool) return;
    const upper = paramSchool.toUpperCase();
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem('teacher') : null;
    if (!raw) {
      router.replace('/staff/login');
      return;
    }
    try {
      const t = JSON.parse(raw) as { school_code?: string };
      const sessionSchool = String(t.school_code ?? '')
        .trim()
        .toUpperCase();
      if (sessionSchool && sessionSchool !== upper) {
        const rest = pathname.replace(/^\/teacher\/dashboard\/[^/]+/, '');
        router.replace(`/teacher/dashboard/${sessionSchool}${rest || ''}`);
      }
    } catch {
      router.replace('/staff/login');
    }
  }, [paramSchool, pathname, router]);

  return <>{children}</>;
}
