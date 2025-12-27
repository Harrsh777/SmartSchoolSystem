'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, Users, UserCheck, Calendar, FileText, Bell, Settings, Menu, X, LogOut, Home, Key, Image } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/Button';
import type { Staff, AcceptedSchool } from '@/lib/supabase';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import SessionTimeoutModal from '@/components/SessionTimeoutModal';

interface TeacherLayoutProps {
  children: React.ReactNode;
}

const baseSidebarItems = [
  { id: 'home', label: 'Home', icon: Home, path: '/teacher/dashboard' },
  { id: 'attendance', label: 'Mark Attendance', icon: Calendar, path: '/teacher/dashboard/attendance' },
  { id: 'my-attendance', label: 'My Attendance', icon: Calendar, path: '/teacher/dashboard/attendance-staff' },
  { id: 'marks', label: 'Marks Entry', icon: FileText, path: '/teacher/dashboard/marks', requiresClassTeacher: true },
  { id: 'classes', label: 'Classes', icon: UserCheck, path: '/teacher/dashboard/classes' },
  { id: 'students', label: 'All Students', icon: GraduationCap, path: '/teacher/dashboard/students' },
  { id: 'staff', label: 'All Staff', icon: Users, path: '/teacher/dashboard/staff' },
  { id: 'examinations', label: 'Examinations', icon: FileText, path: '/teacher/dashboard/examinations' },
  { id: 'communication', label: 'Communication', icon: Bell, path: '/teacher/dashboard/communication' },
  { id: 'gallery', label: 'Gallery', icon: Image, path: '/teacher/dashboard/gallery' },
  { id: 'change-password', label: 'Change Password', icon: Key, path: '/teacher/dashboard/change-password' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/teacher/dashboard/settings' },
];

export default function TeacherLayout({ children }: TeacherLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [teacher, setTeacher] = useState<Staff | null>(null);
  const [school, setSchool] = useState<AcceptedSchool | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isClassTeacher, setIsClassTeacher] = useState(false);

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
    // Check if teacher is logged in
    const storedTeacher = sessionStorage.getItem('teacher');
    const role = sessionStorage.getItem('role');

    if (!storedTeacher || role !== 'teacher') {
      router.push('/login');
      return;
    }

    try {
      const teacherData = JSON.parse(storedTeacher);
      setTeacher(teacherData);
      fetchSchoolName(teacherData.school_code);
      // Pass teacherData to checkIfClassTeacher so it has access to staff_id
      checkIfClassTeacher(teacherData.id, teacherData.school_code, teacherData);
    } catch (err) {
      console.error('Error parsing teacher data:', err);
      router.push('/login');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const checkIfClassTeacher = async (teacherId: string, schoolCode: string, teacherData?: Staff) => {
    try {
      // Pass both teacher_id and staff_id to check both fields
      const queryParams = new URLSearchParams({
        school_code: schoolCode,
        teacher_id: teacherId,
      });
      const staffId = teacherData?.staff_id || teacher?.staff_id;
      if (staffId) {
        queryParams.append('staff_id', staffId);
      }
      
      const response = await fetch(`/api/classes/teacher?${queryParams.toString()}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setIsClassTeacher(true);
      } else {
        setIsClassTeacher(false);
      }
    } catch (err) {
      console.error('Error checking class teacher status:', err);
      setIsClassTeacher(false);
    }
  };

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


  // Filter sidebar items based on class teacher status
  const sidebarItems = baseSidebarItems.filter(item => {
    if (item.requiresClassTeacher) {
      return isClassTeacher;
    }
    return true;
  });

  if (loading || !teacher) {
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
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-400 rounded-lg flex items-center justify-center">
                  <UserCheck className="text-white" size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {school?.school_name || teacher.school_code}
                  </p>
                  <p className="text-xs text-gray-500">Staff Portal</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{teacher.full_name}</p>
                  <p className="text-xs text-gray-500">{teacher.role}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                  {teacher.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
              </div>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                {teacher.role}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  sessionStorage.removeItem('teacher');
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
      </header>

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
                className={`fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-70 bg-white border-r border-gray-200 z-50 lg:z-auto overflow-y-auto ${
                  sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}
                style={{ width: '280px' }}
              >
                <nav className="p-4 space-y-1">
                  {sidebarItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.path || (item.path === '/teacher/dashboard' && pathname === '/teacher/dashboard');
                    
                    return (
                      <Link
                        key={item.id}
                        href={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                          isActive
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

