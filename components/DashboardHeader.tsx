'use client';

import { LogOut } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

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
  role,
  roleLabel,
  iconBgColor,
  badgeColor,
  icon,
}: DashboardHeaderProps) {
  const router = useRouter();

  const handleLogout = () => {
    // Clear all session data
    sessionStorage.removeItem('student');
    sessionStorage.removeItem('teacher');
    sessionStorage.removeItem('school');
    sessionStorage.removeItem('role');
    router.push('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 ${iconBgColor} rounded-lg flex items-center justify-center`}>
                {icon}
              </div>
              <span className="text-xl font-bold text-gray-900">EduYan</span>
            </div>
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

