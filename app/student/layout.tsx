'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Home, 
  Users, 
  GraduationCap, 
  Calendar, 
  CalendarDays,
  Library,
  FileText, 
  IndianRupee, 
  Bell, 
  Menu, 
  X, 
  LogOut,
  Key,
  Image as ImageIcon,
  CalendarX,
  Search,
  Settings,
  ClipboardCheck,
  BookOpen,
  Award,
  Bus,
  BarChart3,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/Button';
import type { Student, AcceptedSchool } from '@/lib/supabase';
import { setupApiInterceptor, removeApiInterceptor, setLogoutHandler } from '@/lib/api-interceptor';

interface StudentLayoutProps {
  children: React.ReactNode;
}

// Menu structure with modules and sub-modules
interface MenuItem {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  path: string;
  isModule?: boolean; // If true, this is a module header (expandable)
  parent?: string; // Parent module name for sub-items
}

const menuItems: MenuItem[] = [
  // Home (always at top, no module)
  { icon: Home, label: 'Home', path: '/student/dashboard' },
  
  // Academics Module
  { icon: GraduationCap, label: 'Academics', path: '#', isModule: true },
  { icon: GraduationCap, label: 'My Class', path: '/student/dashboard/class', parent: 'Academics' },
  { icon: Calendar, label: 'Attendance', path: '/student/dashboard/attendance', parent: 'Academics' },
  { icon: FileText, label: 'Examinations', path: '/student/dashboard/examinations', parent: 'Academics' },
  { icon: BarChart3, label: 'Marks', path: '/student/dashboard/marks', parent: 'Academics' },
  { icon: ClipboardCheck, label: 'Copy Checking', path: '/student/dashboard/copy-checking', parent: 'Academics' },
  { icon: CalendarDays, label: 'Academic Calendar', path: '/student/dashboard/calendar/academic', parent: 'Academics' },
  { icon: BookOpen, label: 'Digital Diary', path: '/student/dashboard/diary', parent: 'Academics' },
  { icon: Library, label: 'Library', path: '/student/dashboard/library', parent: 'Academics' },
  
  // Fees & Transport Module
  { icon: IndianRupee, label: 'Fees & Transport', path: '#', isModule: true },
  { icon: IndianRupee, label: 'Fees', path: '/student/dashboard/fees', parent: 'Fees & Transport' },
  { icon: Bus, label: 'Transport Info', path: '/student/dashboard/transport', parent: 'Fees & Transport' },
  
  // Requests Module
  { icon: CalendarX, label: 'Requests', path: '#', isModule: true },
  { icon: CalendarX, label: 'Apply for Leave', path: '/student/dashboard/apply-leave', parent: 'Requests' },
  { icon: Calendar, label: 'My Leaves', path: '/student/dashboard/my-leaves', parent: 'Requests' },
  { icon: Award, label: 'Certificate Management', path: '/student/dashboard/certificates', parent: 'Requests' },
  
  // Communication Module
  { icon: Bell, label: 'Communication', path: '#', isModule: true },
  { icon: Bell, label: 'Communication', path: '/student/dashboard/communication', parent: 'Communication' },
  { icon: Users, label: 'Parent Info', path: '/student/dashboard/parent', parent: 'Communication' },
  
  // Media & Activities Module
  { icon: ImageIcon, label: 'Media & Activities', path: '#', isModule: true },
  { icon: ImageIcon, label: 'Gallery', path: '/student/dashboard/gallery', parent: 'Media & Activities' },
  
  // Account Module
  { icon: Settings, label: 'Account', path: '#', isModule: true },
  { icon: Settings, label: 'Settings', path: '/student/dashboard/settings', parent: 'Account' },
  { icon: Key, label: 'Change Password', path: '/student/dashboard/change-password', parent: 'Account' },
];

export default function StudentLayout({ children }: StudentLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [student, setStudent] = useState<Student | null>(null);
  const [school, setSchool] = useState<AcceptedSchool | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(['Academics'])); // Default: Academics expanded

  // Logout handler for 401 responses only (no inactivity timeout)
  useEffect(() => {
    const logout = () => {
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      sessionStorage.clear();
      router.push('/student/login');
    };
    setLogoutHandler(logout);
    setupApiInterceptor();
    return () => {
      removeApiInterceptor();
    };
  }, [router]);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    // Skip authentication check for login page
    if (pathname === '/student/login') {
      setLoading(false);
      return;
    }

    const storedStudent = sessionStorage.getItem('student');
    const role = sessionStorage.getItem('role');

    // Academic calendar: allow any logged-in user (student or staff) without permission check
    if (pathname === '/student/dashboard/calendar/academic') {
      if (!role) {
        router.push('/login');
        return;
      }
      if (storedStudent && role === 'student') {
        try {
          const studentData = JSON.parse(storedStudent);
          setStudent(studentData);
          fetchSchoolName(studentData.school_code);
        } catch (err) {
          console.error('Error parsing student data:', err);
        }
      }
      setLoading(false);
      return;
    }

    // All other student dashboard pages require student login
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
  }, [router, pathname]);

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

  // Get sub-items for a module
  const getSubItems = (moduleName: string) => {
    return menuItems.filter(item => item.parent === moduleName);
  };

  // Toggle module expansion
  const toggleModule = (moduleName: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleName)) {
        newSet.delete(moduleName);
      } else {
        newSet.add(moduleName);
      }
      return newSet;
    });
  };

  // Check if any sub-item is active
  const isModuleActive = (moduleName: string) => {
    const subItems = getSubItems(moduleName);
    return subItems.some(item => isActive(item.path));
  };

  // Don't render layout for login page
  if (pathname === '/student/login') {
    return <>{children}</>;
  }

  // Academic calendar: staff (or anyone without student) see only the page content, no sidebar
  if (pathname === '/student/dashboard/calendar/academic' && !loading) {
    if (!student) {
      return (
        <div className="min-h-screen bg-[#ECEDED] p-4 md:p-6">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </div>
      );
    }
    // Student: fall through to full layout below
  }

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
            <div className="flex items-center space-x-4 flex-1">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-xl hover:bg-[#DBEAFE] transition-all"
              >
                {sidebarOpen ? <X size={24} className="text-[#1e3a8a]" /> : <Menu size={24} className="text-[#1e3a8a]" />}
              </button>
              <Link href="/" className="text-xl font-bold text-[#1e3a8a]">
                Edu<span className="text-[#5A7A9A]">Core</span>
              </Link>
              <div className="hidden sm:block h-6 w-px bg-[#E1E1DB]" />
              <span className="hidden sm:block text-[#1e3a8a] font-semibold">
                {school?.school_name || student.school_code}
              </span>
              
              {/* Search Bar */}
              <div className="hidden md:block flex-1 max-w-md ml-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A7A9A]" size={18} />
                  <input
                    className="w-full pl-10 pr-4 py-2 bg-[#F8F9FA] border border-[#E1E1DB] rounded-lg text-sm focus:ring-1 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] transition-all outline-none"
                    placeholder="Search everything..."
                    type="text"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-[#1e3a8a]">{student.student_name}</p>
                  <p className="text-xs text-[#5A7A9A]">
                    {student.class && student.section ? `${student.class}-${student.section}` : `Admission: ${student.admission_no}`}
                  </p>
                </div>
                <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-[#E1E1DB] flex-shrink-0">
                  {student.photo_url && typeof student.photo_url === 'string' && student.photo_url.trim() !== '' ? (
                    <Image
                      src={student.photo_url}
                      alt={student.student_name || 'Student'}
                      fill
                      className="object-cover"
                      unoptimized
                      sizes="40px"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center text-white font-semibold text-sm">
                      {(student.student_name?.split(' ').map(n => n?.[0]).join('') || 'S').substring(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
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
                    const isModule = item.isModule || false;
                    const subItems = isModule ? getSubItems(item.label) : [];
                    const isExpanded = expandedModules.has(item.label);
                    const moduleActive = isModule ? isModuleActive(item.label) : false;
                    const active = !isModule && isActive(item.path);
                    
                    // Skip sub-items in main loop (they'll be rendered under their parent)
                    if (item.parent) {
                      return null;
                    }
                    
                    return (
                      <div key={item.label} className="relative sidebar-menu-item">
                        {/* Module Header or Regular Item */}
                        <div className="flex items-center gap-1">
                          {isModule ? (
                            <button
                              onClick={() => toggleModule(item.label)}
                              className={`group flex-1 flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-300 ${
                                moduleActive
                                  ? 'bg-[#60A5FA] text-[#FFFFFF] shadow-xl shadow-[#60A5FA]/20'
                                  : 'text-[#B8D4E8] hover:text-[#FFFFFF] hover:bg-[#2c4a6b]'
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                                moduleActive 
                                  ? 'bg-[#3B82F6] shadow-lg' 
                                  : 'bg-transparent group-hover:bg-[#2c4a6b] group-hover:scale-110 group-hover:shadow-md'
                              }`}>
                                <Icon size={20} className={moduleActive ? 'text-[#FFFFFF]' : 'text-[#9BB8D4] group-hover:text-[#FFFFFF]'} />
                              </div>
                              <span className="font-semibold text-sm tracking-wide flex-1 text-left">
                                {item.label}
                              </span>
                              <ChevronRight 
                                size={18} 
                                className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''} ${
                                  moduleActive ? 'text-[#FFFFFF]' : 'text-[#9BB8D4]'
                                }`} 
                              />
                            </button>
                          ) : (
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
                          )}
                        </div>
                        
                        {/* Sub-items (if module is expanded) */}
                        {isModule && isExpanded && subItems.length > 0 && (
                          <AnimatePresence>
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="ml-4 mt-1 space-y-1 border-l-2 border-[#2c4a6b] pl-2"
                            >
                              {subItems.map((subItem) => {
                                const SubIcon = subItem.icon;
                                const subActive = isActive(subItem.path);
                                
                                return (
                                  <Link
                                    key={subItem.label}
                                    href={subItem.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-300 ${
                                      subActive
                                        ? 'bg-[#60A5FA] text-[#FFFFFF] shadow-lg shadow-[#60A5FA]/20'
                                        : 'text-[#B8D4E8] hover:text-[#FFFFFF] hover:bg-[#2c4a6b]'
                                    }`}
                                  >
                                    <SubIcon size={18} className={subActive ? 'text-[#FFFFFF]' : 'text-[#9BB8D4] group-hover:text-[#FFFFFF]'} />
                                    <span className="font-medium text-sm tracking-wide flex-1 text-left">
                                      {subItem.label}
                                    </span>
                                    {subActive && (
                                      <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse" />
                                    )}
                                  </Link>
                                );
                              })}
                            </motion.div>
                          </AnimatePresence>
                        )}
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
    </div>
  );
}
