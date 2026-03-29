'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { LogOut } from 'lucide-react';
import Button from '@/components/ui/Button';

interface DashboardHeaderProps {
  schoolCode: string;
  role: 'student' | 'teacher' | 'principal';
  roleLabel: string;
  iconBgColor: string;
  badgeColor: string;
  icon: React.ReactNode;
}

export default function DashboardHeader({
  schoolCode,
  // role kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  role,
  roleLabel,
  iconBgColor,
  badgeColor,
  icon,
}: DashboardHeaderProps) {
  const [schoolLogoUrl, setSchoolLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolCode) return;
    fetch(`/api/schools/info?school_code=${encodeURIComponent(schoolCode)}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.data?.logo_url) setSchoolLogoUrl(result.data.logo_url);
        else setSchoolLogoUrl(null);
      })
      .catch(() => setSchoolLogoUrl(null));
  }, [schoolCode]);

  const handleLogout = () => {
    void (async () => {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).catch(() => null);
      let next = '/login';
      if (res?.ok) {
        const j = (await res.json().catch(() => ({}))) as { redirectTo?: string };
        if (typeof j.redirectTo === 'string' && j.redirectTo.length > 0) next = j.redirectTo;
      }
      if (role === 'principal') {
        sessionStorage.removeItem('school');
        sessionStorage.removeItem('admin_authenticated');
      } else if (role === 'teacher') {
        sessionStorage.removeItem('teacher');
        sessionStorage.removeItem('teacher_authenticated');
      } else if (role === 'student') {
        sessionStorage.removeItem('student');
      }
      sessionStorage.removeItem('role');
      window.location.assign(next);
    })();
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link
              href={schoolCode ? `/dashboard/${schoolCode}` : '/'}
              className="flex items-center justify-center h-10 min-w-[2.5rem] max-w-[168px] rounded-lg border border-gray-200 px-2 py-1 hover:opacity-90 transition-opacity"
              aria-label="Go to school dashboard home"
              title="School dashboard home"
            >
              {schoolLogoUrl ? (
                <NextImage
                  src={schoolLogoUrl}
                  alt="School logo"
                  width={152}
                  height={32}
                  className="h-8 w-auto max-w-[152px] object-contain object-left"
                  priority
                />
              ) : (
                <div className={`w-8 h-8 ${iconBgColor} rounded-lg flex items-center justify-center`}>
                  {icon}
                </div>
              )}
            </Link>
            <div className="h-6 w-px bg-gray-300" />
            <div>
              <p className="text-sm font-medium text-gray-900">{schoolCode}</p>
              <p className="text-xs text-gray-500">{roleLabel} Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 ${badgeColor} rounded-full text-sm font-medium`}>
              {roleLabel}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut size={18} className="mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

