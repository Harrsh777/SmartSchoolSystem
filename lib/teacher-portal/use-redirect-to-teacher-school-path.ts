'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirects `/teacher/dashboard/<legacy>` → `/teacher/dashboard/<school>/<relativePath>`.
 * Shared modules live under the school-scoped teacher route tree.
 */
export function useRedirectToTeacherSchoolPath(relativePath: string) {
  const router = useRouter();
  useEffect(() => {
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem('teacher') : null;
    if (!raw) {
      router.replace('/staff/login');
      return;
    }
    let school = '';
    try {
      school = String((JSON.parse(raw) as { school_code?: string }).school_code || '').trim();
    } catch {
      router.replace('/staff/login');
      return;
    }
    if (!school) {
      router.replace('/teacher/dashboard');
      return;
    }
    const rel = relativePath.replace(/^\/+/, '');
    router.replace(`/teacher/dashboard/${encodeURIComponent(school)}/${rel}`);
  }, [router, relativePath]);
}
