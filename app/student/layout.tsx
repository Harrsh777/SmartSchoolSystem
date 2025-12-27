'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Home, 
  User, 
  Users, 
  GraduationCap, 
  Calendar, 
  CalendarDays,
  FileText, 
  DollarSign, 
  Bell, 
  Menu, 
  X, 
  LogOut,
  Key,
  Image
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/Button';
import type { Student, AcceptedSchool } from '@/lib/supabase';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import SessionTimeoutModal from '@/components/SessionTimeoutModal';

interface StudentLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { icon: Home, label: 'Home', path: '/student/dashboard' },
  { icon: User, label: 'Personal Info', path: '/student/dashboard/personal' },
  { icon: Users, label: 'Parent Info', path: '/student/dashboard/parent' },
  { icon: GraduationCap, label: 'My Class', path: '/student/dashboard/class' },
  { icon: Calendar, label: 'Attendance', path: '/student/dashboard/attendance' },
  { icon: CalendarDays, label: 'Calendar', path: '/student/dashboard/calendar' },
  { icon: FileText, label: 'Examinations', path: '/student/dashboard/examinations' },
  { icon: DollarSign, label: 'Fees', path: '/student/dashboard/fees' },
  { icon: Bell, label: 'Communication', path: '/student/dashboard/communication' },
  { icon: Image, label: 'Gallery', path: '/student/dashboard/gallery' },
  { icon: Key, label: 'Change Password', path: '/student/dashboard/change-password' },
];

export default function StudentLayout({ children }: StudentLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [student, setStudent] = useState<Student | null>(null);
  const [school, setSchool] = useState<AcceptedSchool | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [loading, setLoading] = useState(true);

  // Session timeout (10 minutes)
  const { showWarning, timeRemaining, handleLogout, resetTimer } = useSessionTimeout({
    timeoutMinutes: 10,
    warningMinutes: 9,
    loginPath: '/login',
  });

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    // Check if student is logged in
    const storedStudent = sessionStorage.getItem('student');
    const role = sessionStorage.getItem('role');

    if (!storedStudent || role !== 'student') {
      router.push('/login');
      return;
    }

    try {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      fetchSchoolName(studentData.school_code);
    } catch (err) {
      console.error('Error parsing student data:', err);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchSchoolName = async (schoolCode: string) => {
    try {
      const response = await fetch(`/api/schools/accepted`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        const schoolData = result.data.find((s: AcceptedSchool) => s.school_code === schoolCode);
        if (schoolData) {
          setSchool(schoolData);
        }
      }
    } catch (err) {
      console.error('Error fetching school:', err);
    }
  };

  const isActive = (path: string) => {
    if (path === '/student/dashboard') {
      return pathname === path || pathname === `${path}/`;
    }
    return pathname.startsWith(path);
  };

  if (loading || !student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (loading || !student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <Link href="/" className="text-xl font-bold text-black">
                Edu<span className="text-gray-600">-Yan</span>
              </Link>
              <div className="hidden sm:block h-6 w-px bg-gray-300" />
              <span className="hidden sm:block text-gray-700 font-medium">
                {school?.school_name || student.school_code}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{student.student_name}</p>
                  <p className="text-xs text-gray-500">Admission: {student.admission_no}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-semibold">
                  {student.student_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                Student
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  sessionStorage.removeItem('student');
                  sessionStorage.removeItem('role');
                  router.push('/login');
                }}
              >
                <LogOut size={18} className="mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <AnimatePresence>
          {(sidebarOpen || isDesktop) && (
            <>
              {/* Mobile Overlay */}
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSidebarOpen(false)}
                  className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                />
              )}

              {/* Sidebar */}
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                className="fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-70 bg-white border-r border-gray-200 z-50 lg:z-auto overflow-y-auto"
                style={{ width: '280px' }}
              >
                <nav className="p-4 space-y-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.label}
                        href={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                          active
                            ? 'bg-black text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon size={20} />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 lg:ml-0">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      {/* Session Timeout Modal */}
      <SessionTimeoutModal
        isOpen={showWarning}
        timeRemaining={timeRemaining}
        onStayLoggedIn={resetTimer}
        onLogout={handleLogout}
      />
    </div>
  );
}

