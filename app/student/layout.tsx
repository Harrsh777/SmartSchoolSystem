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
  Image,
  CalendarX
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
  { icon: CalendarX, label: 'Apply for Leave', path: '/student/dashboard/apply-leave' },
  { icon: Calendar, label: 'My Leaves', path: '/student/dashboard/my-leaves' },
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

  // Session timeout (15 minutes)
  const { showWarning, timeRemaining, handleLogout, resetTimer } = useSessionTimeout({
    timeoutMinutes: 15,
    warningMinutes: 14,
    loginPath: '/login',
  });

  // Format time remaining as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
      <div className="flex items-center justify-center min-h-screen bg-[#ECEDED]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#ECEDED]">
      {/* Top Navigation - Matching Principal Dashboard */}
      <nav className="bg-[#FFFFFF]/80 backdrop-blur-lg border-b border-[#E1E1DB] sticky top-0 z-40 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-xl hover:bg-[#DBEAFE] transition-all"
              >
                {sidebarOpen ? <X size={24} className="text-[#1e3a8a]" /> : <Menu size={24} className="text-[#1e3a8a]" />}
              </button>
              <Link href="/" className="text-xl font-bold text-[#1e3a8a]">
                Edu<span className="text-[#5A7A9A]">-Yan</span>
              </Link>
              <div className="hidden sm:block h-6 w-px bg-[#E1E1DB]" />
              <span className="hidden sm:block text-[#1e3a8a] font-semibold">
                {school?.school_name || student.school_code}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              {/* Session Timer */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all ${
                timeRemaining <= 60 
                  ? 'bg-red-50 border-red-300 text-red-700' 
                  : timeRemaining <= 300
                  ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                  : 'bg-blue-50 border-blue-300 text-blue-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  timeRemaining <= 60 
                    ? 'bg-red-500 animate-pulse' 
                    : timeRemaining <= 300
                    ? 'bg-yellow-500'
                    : 'bg-blue-500'
                }`} />
                <span className="font-mono font-bold text-sm">
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-[#1e3a8a]">{student.student_name}</p>
                  <p className="text-xs text-[#5A7A9A]">Admission: {student.admission_no}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center text-white font-semibold">
                  {(student.student_name?.split(' ').map(n => n?.[0]).join('') || '').substring(0, 2)}
                </div>
              </div>
              <span className="px-3 py-1 bg-[#DBEAFE] text-[#1e3a8a] rounded-full text-sm font-medium border border-[#E1E1DB]">
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
                className="border-[#E1E1DB] hover:bg-[#DBEAFE]"
              >
                <LogOut size={18} className="mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar - Matching Principal Dashboard */}
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

              {/* Sidebar - Modern, Clean, Professional */}
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                className="fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-70 bg-[#1e3a8a] border-r border-[#2c4a6b] z-50 lg:z-auto overflow-y-auto overflow-x-visible shadow-2xl"
                style={{ width: '280px', background: 'linear-gradient(180deg, #1e3a8a 0%, #0f1b2e 100%)' }}
              >
                <nav className="p-5 space-y-1.5 overflow-visible">
                  {/* Header Section */}
                  <div className="mb-6 px-4 py-3.5 bg-[#2c4a6b] rounded-2xl border border-[#2c4a6b] backdrop-blur-sm">
                    <h3 className="text-[#FFFFFF] font-bold text-base uppercase tracking-widest">
                      Student Portal
                    </h3>
                    <p className="text-[#B8D4E8] text-xs mt-1">Dashboard Menu</p>
                  </div>
                  
                  {/* Menu Items */}
                  {menuItems.map((item, index) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    
                    return (
                      <div key={item.label} className="relative sidebar-menu-item">
                        <div className="flex items-center gap-1">
                          <Link
                            href={item.path}
                            onClick={() => setSidebarOpen(false)}
                            className={`group flex-1 flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-300 ${
                              active
                                ? 'bg-[#60A5FA] text-[#FFFFFF] shadow-xl shadow-[#60A5FA]/20 scale-[1.02]'
                                : 'text-[#B8D4E8] hover:text-[#FFFFFF] hover:bg-[#2c4a6b]'
                            }`}
                          >
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2 ${
                              active 
                                ? 'bg-[#3B82F6] text-[#FFFFFF]' 
                                : 'bg-[#2c4a6b] text-[#B8D4E8] group-hover:bg-[#3d5a7f] group-hover:text-[#FFFFFF]'
                            }`}>
                              {index + 1}
                            </span>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                              active 
                                ? 'bg-[#3B82F6] shadow-lg' 
                                : 'bg-transparent group-hover:bg-[#2c4a6b] group-hover:scale-110 group-hover:shadow-md'
                            }`}>
                              <Icon size={20} className={active ? 'text-[#FFFFFF]' : 'text-[#9BB8D4] group-hover:text-[#FFFFFF]'} />
                            </div>
                            <span className="font-semibold text-sm tracking-wide flex-1 text-left">
                              {item.label}
                            </span>
                            {active && (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse" />
                            )}
                          </Link>
                        </div>
                      </div>
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
