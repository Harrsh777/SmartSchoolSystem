'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  GraduationCap, 
  UserCheck, 
  Calendar, 
  FileText, 
  Settings, 
  Menu, 
  X, 
  Home, 
  Key, 
  Image,
  Building2,
  Library,
  MessageSquare,
  CalendarDays,
  Award,
  BookMarked,
  CalendarX,
  LogOut,
  Search,
  Bell,
  HelpCircle,
  Languages,
  Zap,
  ClipboardCheck,
  Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import type { Staff, AcceptedSchool } from '@/lib/supabase';
import HelpModal from '@/components/help/HelpModal';
import { setupApiInterceptor, removeApiInterceptor, setLogoutHandler } from '@/lib/api-interceptor';
import RoleSessionSwitcher from '@/components/auth/RoleSessionSwitcher';
import { logoutCurrentSessionAndGo } from '@/lib/client-logout';
import { languages } from '@/lib/translations';
import { isTeachingStaffRole } from '@/lib/staff-teaching-role';
import {
  isTeacherClassTeacherIntrinsicPath,
  isTeacherDashboardIntrinsicPath,
} from '@/lib/rbac/teacher-intrinsic-paths';
import { evaluateTeacherSlugAgainstMenu, teacherPathnameToSlug } from '@/lib/rbac/teacher-menu-matching';
import { TeacherRbacSidebar } from '@/components/teacher/TeacherRbacSidebar';
import { INTRINSIC_DIGITAL_DIARY_SIDEBAR_MODULE } from '@/lib/rbac/intrinsic-digital-diary';

interface TeacherLayoutProps {
  children: React.ReactNode;
}

// Teacher-specific menu items (always shown)
type TeacherMenuItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  permission: string | null;
  viewPermission: string | null;
  requiresClassTeacher?: boolean;
  /** If true with requiresClassTeacher, also show when staff has timetable subject assignments */
  allowsSubjectTeacher?: boolean;
};

// Default teacher menu items (always visible)
const teacherBaseItems: TeacherMenuItem[] = [
  { id: 'home', label: 'Home', icon: Home, path: '/teacher/dashboard', permission: null, viewPermission: null },
  { id: 'attendance', label: 'Mark Attendance', icon: Calendar, path: '/teacher/dashboard/attendance', permission: null, viewPermission: null },
  { id: 'my-attendance', label: 'My Attendance', icon: Calendar, path: '/teacher/dashboard/attendance-staff', permission: null, viewPermission: null },
  { id: 'my-timetable', label: 'My Timetable', icon: CalendarDays, path: '/teacher/dashboard/my-timetable', permission: null, viewPermission: null },
  { id: 'marks', label: 'Marks Entry', icon: FileText, path: '/teacher/dashboard/marks', requiresClassTeacher: true, allowsSubjectTeacher: true, permission: null, viewPermission: null },
  { id: 'non-scholastic-marks', label: 'Non-Scholastic Marks', icon: Palette, path: '/teacher/dashboard/non-scholastic-marks', requiresClassTeacher: true, permission: null, viewPermission: null },
  { id: 'examinations', label: 'Examinations', icon: FileText, path: '/teacher/dashboard/examinations', permission: null, viewPermission: null },
  { id: 'my-class', label: 'My Class', icon: UserCheck, path: '/teacher/dashboard/my-class', requiresClassTeacher: true, permission: null, viewPermission: null },
  { id: 'classes', label: 'Classes', icon: UserCheck, path: '/teacher/dashboard/classes', permission: null, viewPermission: null },
  { id: 'apply-leave', label: 'Apply for Leave', icon: CalendarX, path: '/teacher/dashboard/apply-leave', permission: null, viewPermission: null },
  { id: 'my-leaves', label: 'My Leaves', icon: Calendar, path: '/teacher/dashboard/my-leaves', permission: null, viewPermission: null },
  { id: 'student-leave-approvals', label: 'Student Leave Approvals', icon: CalendarX, path: '/teacher/dashboard/student-leave-approvals', requiresClassTeacher: true, permission: null, viewPermission: null },
  { id: 'institute-info', icon: Building2, label: 'Institute Info', path: '/teacher/dashboard/institute-info', permission: null, viewPermission: null },
  { id: 'students', icon: GraduationCap, label: 'Student Management', path: '/teacher/dashboard/students', permission: null, viewPermission: null },
  { id: 'library', icon: Library, label: 'Library', path: '/teacher/dashboard/library', permission: null, viewPermission: null },
  { id: 'certificates', icon: Award, label: 'Certificate Management', path: '/teacher/dashboard/certificates', permission: null, viewPermission: null },
  { id: 'gallery', icon: Image, label: 'Gallery', path: '/teacher/dashboard/gallery', permission: null, viewPermission: null },
  { id: 'calendar', icon: CalendarDays, label: 'Academic Calendar', path: '/teacher/dashboard/calendar', permission: null, viewPermission: null },
  { id: 'homework', icon: BookMarked, label: 'Digital Diary', path: '/teacher/dashboard/homework', permission: null, viewPermission: null },
  { id: 'copy-checking', icon: ClipboardCheck, label: 'Copy Checking', path: '/teacher/dashboard/copy-checking', permission: null, viewPermission: null },
  { id: 'settings', icon: Settings, label: 'Settings', path: '/teacher/dashboard/settings', permission: null, viewPermission: null },
  { id: 'change-password', icon: Key, label: 'Change Password', path: '/teacher/dashboard/change-password', permission: null, viewPermission: null },
  { id: 'staff-management', icon: UserCheck, label: 'Staff Information', path: '/teacher/dashboard/staff-management/directory', permission: null, viewPermission: null },
  { id: 'communication', icon: MessageSquare, label: 'Communication', path: '/teacher/dashboard/communication', permission: null, viewPermission: null },
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
  const [hasTimetableTeaching, setHasTimetableTeaching] = useState(false);
  const [dynamicModules, setDynamicModules] = useState<Array<{
    module_name: string;
    module_key: string;
    sub_modules: Array<{
      name: string;
      key: string;
      route: string;
      has_view_access: boolean;
      has_edit_access: boolean;
    }>;
  }>>([]);

  // Logout handler for 401 responses only – clear only teacher session so admin tab is unaffected
  useEffect(() => {
    const logout = () => {
      void logoutCurrentSessionAndGo('/login', {
        beforeNavigate: () => {
          sessionStorage.removeItem('teacher');
          sessionStorage.removeItem('teacher_authenticated');
        },
      });
    };
    setLogoutHandler(logout);
    setupApiInterceptor();
    return () => removeApiInterceptor();
  }, [router]);
  
  // State for navbar dropdowns
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [quickDropdownOpen, setQuickDropdownOpen] = useState(false);
  const [notificationsDropdownOpen, setNotificationsDropdownOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.search-container')) setSearchDropdownOpen(false);
      if (!target.closest('.quick-search-container')) setQuickDropdownOpen(false);
      if (!target.closest('.notifications-dropdown-container')) setNotificationsDropdownOpen(false);
      if (!target.closest('.language-dropdown-container')) setLanguageDropdownOpen(false);
      if (!target.closest('.profile-dropdown-container')) setProfileDropdownOpen(false);
      const settingsBtn = target.closest('button[title="Settings"]');
      if (!settingsBtn && !target.closest('[title="Settings"]')?.nextElementSibling) setSettingsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Skip authentication check for login pages
    if (pathname === '/staff/login' || pathname === '/teacher/login') {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const runAuth = async () => {
      // Check if teacher is logged in; if sessionStorage empty (e.g. new tab), rehydrate from server
      let storedTeacher = sessionStorage.getItem('teacher');
      const role = sessionStorage.getItem('role');
      const teacherAuthenticated = sessionStorage.getItem('teacher_authenticated');

      if (!storedTeacher || (teacherAuthenticated !== '1' && role !== 'teacher')) {
        const res = await fetch('/api/auth/session?role=teacher', { credentials: 'include' });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (data.role === 'teacher' && data.user) {
            sessionStorage.setItem('teacher', JSON.stringify(data.user));
            sessionStorage.setItem('role', 'teacher');
            sessionStorage.setItem('teacher_authenticated', '1');
            storedTeacher = JSON.stringify(data.user);
          }
        }
        if (!storedTeacher) {
          router.push('/login');
          setLoading(false);
          return;
        }
      }

      if (cancelled) return;
      try {
        const teacherData = JSON.parse(storedTeacher!);
        setTeacher(teacherData);
        fetchSchoolName(teacherData.school_code);
        checkIfClassTeacher(teacherData.id, teacherData.school_code, teacherData);
        void (async () => {
          try {
            const q = new URLSearchParams({
              school_code: String(teacherData.school_code || ''),
              staff_id: String(teacherData.id || ''),
            });
            const r = await fetch(`/api/teachers/teaching-assignments?${q.toString()}`);
            const j = await r.json();
            if (r.ok && Array.isArray(j.data?.assignments) && j.data.assignments.length > 0) {
              setHasTimetableTeaching(true);
            } else {
              setHasTimetableTeaching(false);
            }
          } catch {
            setHasTimetableTeaching(false);
          }
        })();
        fetchStaffPermissions(teacherData.id);
      } catch (err) {
        console.error('Error parsing teacher data:', err);
        router.push('/login');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    runAuth();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, pathname]);

  const isRestrictedNonTeaching =
    teacher != null &&
    !isTeachingStaffRole(
      teacher.role,
      (teacher as { designation?: string | null }).designation ?? null
    );

  const rbacHasDigitalDiary = dynamicModules.some((m) => m.module_key === 'digital_diary');
  const intrinsicDigitalDiaryEligible =
    teacher != null && !isRestrictedNonTeaching && (isClassTeacher || hasTimetableTeaching);

  const mergedMenuModules = useMemo(() => {
    if (!teacher) return dynamicModules;
    if (intrinsicDigitalDiaryEligible && !rbacHasDigitalDiary) {
      return [...dynamicModules, INTRINSIC_DIGITAL_DIARY_SIDEBAR_MODULE];
    }
    return dynamicModules;
  }, [
    teacher,
    dynamicModules,
    intrinsicDigitalDiaryEligible,
    rbacHasDigitalDiary,
  ]);

  const showDigitalDiaryInPortal = mergedMenuModules.some((m) => m.module_key === 'digital_diary');

  useEffect(() => {
    if (pathname === '/staff/login' || pathname === '/teacher/login') return;
    if (loading || !teacher) return;
    if (!pathname.startsWith('/teacher/dashboard')) return;
    const home = '/teacher/dashboard';
    if (pathname === home || pathname === `${home}/`) return;
    if (isTeacherDashboardIntrinsicPath(pathname)) return;
    if (isTeacherClassTeacherIntrinsicPath(pathname)) {
      if (isRestrictedNonTeaching) {
        router.replace(home);
      }
      return;
    }
    const slug = teacherPathnameToSlug(pathname, teacher.school_code);
    if (!mergedMenuModules.length) return;
    const access = evaluateTeacherSlugAgainstMenu(mergedMenuModules, slug);
    if (!access.allowed) {
      router.replace(home);
    }
  }, [loading, teacher, pathname, router, mergedMenuModules, isRestrictedNonTeaching]);

  const fetchStaffPermissions = async (staffId: string) => {
    try {
      const response = await fetch(`/api/staff/${staffId}/menu`, { credentials: 'include' });
      const result = await response.json();
      if (response.ok && result.data) {
        setDynamicModules(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching staff menu:', error);
    }
  };
  const checkIfClassTeacher = async (teacherId: string, schoolCode: string, teacherData?: Staff) => {
    try {
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


  const isActive = (path: string) => {
    if (path === '/teacher/dashboard' && pathname === '/teacher/dashboard') return true;
    return pathname === path || pathname.startsWith(path + '/');
  };

  // Don't render layout for login pages
  if (pathname === '/staff/login' || pathname === '/teacher/login') {
    return <>{children}</>;
  }

  if (loading || !teacher) {
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
      {/* Top Navigation - Matching Main Dashboard */}
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
              <Link
                href="/teacher/dashboard"
                className="flex items-center gap-3 min-w-0 max-w-[min(100%,20rem)] sm:max-w-md"
              >
                {(() => {
                  const logoUrl =
                    typeof school?.logo_url === 'string' && String(school.logo_url).trim()
                      ? String(school.logo_url).trim()
                      : '';
                  const initial = (
                    school?.school_name ||
                    teacher.school_code ||
                    'S'
                  )
                    .charAt(0)
                    .toUpperCase();
                  return (
                    <>
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- school logos from various storage URLs
                        <img
                          src={logoUrl}
                          alt=""
                          className="h-9 w-9 sm:h-10 sm:w-10 object-contain rounded-lg border border-[#E1E1DB] bg-white shrink-0"
                        />
                      ) : (
                        <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-[#1e3a8a] flex items-center justify-center text-white font-bold text-sm sm:text-base shrink-0 shadow-sm">
                          {initial}
                        </div>
                      )}
                      <span className="text-[#1e3a8a] font-semibold text-sm sm:text-base truncate">
                        {school?.school_name || teacher.school_code}
                      </span>
                    </>
                  );
                })()}
              </Link>
            </div>
            <div className="flex items-center space-x-2">
              {/* Search */}
              <div className="relative search-container">
                <button
                  onClick={() => setSearchDropdownOpen(!searchDropdownOpen)}
                  className="p-2 rounded-xl hover:bg-[#DBEAFE] transition-all relative"
                  title="Search"
                >
                  <Search size={20} className="text-[#1e3a8a]" />
                </button>
                {searchDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-[#E1E1DB] z-50 p-3">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="w-full px-3 py-2 border border-[#E1E1DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="relative quick-search-container">
                <button
                  onClick={() => setQuickDropdownOpen(!quickDropdownOpen)}
                  className="p-2 rounded-xl hover:bg-[#DBEAFE] transition-all"
                  title="Quick Actions"
                >
                  <Zap size={20} className="text-[#1e3a8a]" />
                </button>
                {quickDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-[#E1E1DB] z-50 p-2">
                    {!isRestrictedNonTeaching ? (
                      <>
                        <Link href="/teacher/dashboard/attendance" className="block px-3 py-2 hover:bg-[#DBEAFE] rounded-lg">
                          Mark Attendance
                        </Link>
                        <Link href="/teacher/dashboard/marks" className="block px-3 py-2 hover:bg-[#DBEAFE] rounded-lg">
                          Marks Entry
                        </Link>
                      </>
                    ) : null}
                    <Link href="/teacher/dashboard/communication" className="block px-3 py-2 hover:bg-[#DBEAFE] rounded-lg">
                      Send Notice
                    </Link>
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div className="relative notifications-dropdown-container">
                <button
                  onClick={() => setNotificationsDropdownOpen(!notificationsDropdownOpen)}
                  className="p-2 rounded-xl hover:bg-[#DBEAFE] transition-all relative"
                  title="Notifications"
                >
                  <Bell size={20} className="text-[#1e3a8a]" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                {notificationsDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-[#E1E1DB] z-50 p-3">
                    <p className="text-sm font-semibold text-[#1e3a8a] mb-2">Notifications</p>
                    <p className="text-sm text-gray-500">No new notifications</p>
                  </div>
                )}
              </div>

              {/* Help */}
              <button
                onClick={() => setHelpModalOpen(true)}
                className="p-2 rounded-xl hover:bg-[#DBEAFE] transition-all"
                title="Help"
              >
                <HelpCircle size={20} className="text-[#1e3a8a]" />
              </button>

              {/* Settings */}
              <div className="relative">
                <button
                  onClick={() => setSettingsDropdownOpen(!settingsDropdownOpen)}
                  className="p-2 rounded-xl hover:bg-[#DBEAFE] transition-all"
                  title="Settings"
                >
                  <Settings size={20} className="text-[#1e3a8a]" />
                </button>
                {settingsDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-[#E1E1DB] z-50 p-2">
                    <Link href="/teacher/dashboard/settings" className="block px-3 py-2 hover:bg-[#DBEAFE] rounded-lg">
                      Profile Settings
                    </Link>
                    <Link
                      href={
                        isRestrictedNonTeaching
                          ? '/teacher/dashboard/change-password'
                          : '/teacher/dashboard/password'
                      }
                      className="block px-3 py-2 hover:bg-[#DBEAFE] rounded-lg"
                    >
                      Change Password
                    </Link>
                  </div>
                )}
              </div>

              {/* Translate */}
              <div className="relative language-dropdown-container">
                <button
                  onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                  className="p-2 rounded-xl hover:bg-[#DBEAFE] transition-all"
                  title="Translate"
                >
                  <Languages size={20} className="text-[#1e3a8a]" />
                </button>
                {languageDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-[#E1E1DB] z-50 p-2">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        className="block w-full text-left px-3 py-2 hover:bg-[#DBEAFE] rounded-lg"
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <RoleSessionSwitcher className="hidden sm:block" />

              {/* Profile */}
              <div className="relative profile-dropdown-container">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-[#DBEAFE] transition-all"
                  title="Profile"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center text-white font-semibold text-sm">
                    {teacher.full_name.split(' ').map((n) => n[0] || '').join('').substring(0, 2)}
                  </div>
                  <span className="hidden lg:block text-sm font-medium text-[#1e3a8a]">{teacher.full_name}</span>
                </button>
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-[#E1E1DB] z-50 p-2">
                    <div className="px-3 py-2 border-b border-[#E1E1DB]">
                      <p className="text-sm font-semibold text-[#1e3a8a]">{teacher.full_name}</p>
                      <p className="text-xs text-[#5A7A9A]">{teacher.role || 'Teacher'}</p>
                    </div>
                    <Link href="/teacher/dashboard/settings" className="block px-3 py-2 hover:bg-[#DBEAFE] rounded-lg">
                      Profile Settings
                    </Link>
                    <button
                      onClick={() => {
                        void logoutCurrentSessionAndGo('/login', {
                          beforeNavigate: () => {
                            sessionStorage.removeItem('teacher');
                            sessionStorage.removeItem('teacher_authenticated');
                          },
                        });
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-[#DBEAFE] rounded-lg flex items-center gap-2"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar - Matching Main Dashboard */}
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

              {/* Sidebar - Dark Green, Modular */}
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                className="fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-70 bg-emerald-950 border-r border-emerald-900 z-50 lg:z-auto overflow-y-auto overflow-x-visible shadow-2xl"
                style={{ width: '280px', background: 'linear-gradient(180deg, #064e3b 0%, #022c22 100%)' }}
              >
                <TeacherRbacSidebar
                  pathname={pathname}
                  setSidebarOpen={setSidebarOpen}
                  teacherBaseItems={teacherBaseItems}
                  mergedMenuModules={mergedMenuModules}
                  showDigitalDiaryInPortal={showDigitalDiaryInPortal}
                  teacherSchoolCode={String(teacher?.school_code ?? '').trim()}
                  isRestrictedNonTeaching={isRestrictedNonTeaching}
                  isClassTeacher={isClassTeacher}
                  hasTimetableTeaching={hasTimetableTeaching}
                  isActive={isActive}
                />
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

      {/* Help Modal */}
      <HelpModal isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)} schoolCode={''} />
    </div>
  );
}
