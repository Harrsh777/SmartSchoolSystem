'use client';

import { useState, useEffect } from 'react';
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
  BookOpen,
  DollarSign,
  Library,
  Bus,
  MessageSquare,
  FileBarChart,
  CalendarDays,
  Award,
  BookMarked,
  CalendarX,
  TrendingUp,
  DoorOpen,
  Lock,
  LogOut,
  Search,
  Bell,
  HelpCircle,
  Languages,
  Zap,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Staff, AcceptedSchool } from '@/lib/supabase';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import SessionTimeoutModal from '@/components/SessionTimeoutModal';
import HelpModal from '@/components/help/HelpModal';

interface TeacherLayoutProps {
  children: React.ReactNode;
}

// Teacher-specific menu items (always shown)
type TeacherMenuItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  path: string;
  permission: string | null;
  viewPermission: string | null;
  requiresClassTeacher?: boolean;
};

const teacherBaseItems: TeacherMenuItem[] = [
  { id: 'home', label: 'Home', icon: Home, path: '/teacher/dashboard', permission: null, viewPermission: null },
  { id: 'attendance', label: 'Mark Attendance', icon: Calendar, path: '/teacher/dashboard/attendance', permission: null, viewPermission: null },
  { id: 'my-attendance', label: 'My Attendance', icon: Calendar, path: '/teacher/dashboard/attendance-staff', permission: null, viewPermission: null },
  { id: 'marks', label: 'Marks Entry', icon: FileText, path: '/teacher/dashboard/marks', requiresClassTeacher: true, permission: null, viewPermission: null },
  { id: 'classes', label: 'Classes', icon: UserCheck, path: '/teacher/dashboard/classes', permission: null, viewPermission: null },
  { id: 'apply-leave', label: 'Apply for Leave', icon: CalendarX, path: '/teacher/dashboard/apply-leave', permission: null, viewPermission: null },
  { id: 'my-leaves', label: 'My Leaves', icon: Calendar, path: '/teacher/dashboard/my-leaves', permission: null, viewPermission: null },
];

// All menu items from main dashboard (mapped to teacher paths)
const dashboardMenuItems: TeacherMenuItem[] = [
  { id: 'institute-info', icon: Building2, label: 'Institute Info', path: '/teacher/dashboard/institute-info', permission: null, viewPermission: null },
  { id: 'password', icon: Key, label: 'Password Manager', path: '/teacher/dashboard/password', permission: 'manage_passwords', viewPermission: 'manage_passwords' },
  { id: 'staff-management', icon: UserCheck, label: 'Staff Management', path: '/teacher/dashboard/staff-management', permission: 'manage_staff', viewPermission: 'view_staff' },
  { id: 'classes-dash', icon: BookOpen, label: 'Classes', path: '/teacher/dashboard/classes', permission: 'manage_classes', viewPermission: 'view_classes' },
  { id: 'students', icon: GraduationCap, label: 'Student Management', path: '/teacher/dashboard/students', permission: 'manage_students', viewPermission: 'view_students' },
  { id: 'timetable', icon: CalendarDays, label: 'Timetable', path: '/teacher/dashboard/timetable', permission: 'manage_timetable', viewPermission: 'view_timetable' },
  { id: 'calendar', icon: CalendarDays, label: 'Event/Calendar', path: '/teacher/dashboard/calendar', permission: 'manage_events', viewPermission: 'view_events' },
  { id: 'examinations', icon: FileText, label: 'Examinations', path: '/teacher/dashboard/examinations', permission: 'manage_exams', viewPermission: 'view_exams' },
  { id: 'fees', icon: DollarSign, label: 'Fees', path: '/teacher/dashboard/fees', permission: 'manage_fees', viewPermission: 'view_fees' },
  { id: 'library', icon: Library, label: 'Library', path: '/teacher/dashboard/library', permission: 'manage_library', viewPermission: 'view_library' },
  { id: 'transport', icon: Bus, label: 'Transport', path: '/teacher/dashboard/transport', permission: 'manage_transport', viewPermission: 'view_transport' },
  { id: 'communication', icon: MessageSquare, label: 'Communication', path: '/teacher/dashboard/communication', permission: null, viewPermission: null },
  { id: 'reports', icon: FileBarChart, label: 'Report', path: '/teacher/dashboard/reports', permission: 'view_reports', viewPermission: 'view_reports' },
  { id: 'gallery', icon: Image, label: 'Gallery', path: '/teacher/dashboard/gallery', permission: null, viewPermission: null },
  { id: 'certificates', icon: Award, label: 'Certificate Management', path: '/teacher/dashboard/certificates', permission: 'manage_certificates', viewPermission: 'view_certificates' },
  { id: 'homework', icon: BookMarked, label: 'Digital Diary', path: '/teacher/dashboard/homework', permission: 'manage_homework', viewPermission: 'view_homework' },
  { id: 'expense-income', icon: TrendingUp, label: 'Expense/income', path: '/teacher/dashboard/expense-income', permission: 'manage_finances', viewPermission: 'view_finances' },
  { id: 'gate-pass', icon: DoorOpen, label: 'Gate pass', path: '/teacher/dashboard/gate-pass', permission: 'manage_gate_pass', viewPermission: 'view_gate_pass' },
  { id: 'settings', icon: Settings, label: 'Settings', path: '/teacher/dashboard/settings', permission: null, viewPermission: null },
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
  const [permissions, setPermissions] = useState<string[]>([]);
  const [staffPermissions, setStaffPermissions] = useState<Record<string, unknown> | null>(null);

  // Session timeout (20 minutes)
  const { showWarning, timeRemaining, handleLogout, resetTimer } = useSessionTimeout({
    timeoutMinutes: 20,
    warningMinutes: 19,
    loginPath: '/login',
  });
  
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
      checkIfClassTeacher(teacherData.id, teacherData.school_code, teacherData);
      fetchStaffPermissions(teacherData.id);
    } catch (err) {
      console.error('Error parsing teacher data:', err);
      router.push('/login');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchStaffPermissions = async (staffId: string) => {
    try {
      // Fetch detailed permissions
      const response = await fetch(`/api/rbac/staff-permissions/${staffId}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setStaffPermissions(result.data);
        
        // Extract enabled sub-modules and map to permission keys
        const enabledPermissions = new Set<string>();
        result.data.modules?.forEach((module: { sub_modules?: Array<{ name?: string; view_access?: boolean; edit_access?: boolean }> }) => {
          module.sub_modules?.forEach((subModule: { name?: string; view_access?: boolean; edit_access?: boolean }) => {
            const subModuleName = subModule.name;
            if ((subModule.view_access || subModule.edit_access) && subModuleName) {
              // Map sub-module names to permission keys
              const permKeys = mapSubModuleToPermissions(subModuleName);
              permKeys.forEach(key => enabledPermissions.add(key));
            }
          });
        });
        setPermissions(Array.from(enabledPermissions));
      }
    } catch (error) {
      console.error('Error fetching staff permissions:', error);
    }
  };

  const mapSubModuleToPermissions = (subModuleName: string): string[] => {
    // Map sub-module names to permission keys
    // This mapping should match the actual sub-module names in the database
    const mapping: Record<string, string[]> = {
      // Password Management
      'Reset Password': ['manage_passwords'],
      
      // Staff Management
      'Staff Directory': ['view_staff'],
      'Add Staff': ['manage_staff', 'view_staff'],
      'Bulk Staff import': ['manage_staff', 'view_staff'],
      'Bulk Staff Photo Upload': ['manage_staff', 'view_staff'],
      'Staff Attendance': ['view_staff'],
      'Student Attendance Marking Report': ['view_staff'],
      'Quick Staff Search': ['view_staff'],
      
      // Classes
      'Add/Modify Class': ['manage_classes', 'view_classes'],
      'Add/Modify Subjects': ['manage_classes', 'view_classes'],
      'Assign Teachers': ['manage_classes', 'view_classes'],
      
      // Timetable
      'Teacher Workload': ['view_timetable'],
      'Group wise Timetable': ['view_timetable'],
      'Class Time Table': ['manage_timetable', 'view_timetable'],
      'Teacher Time Table': ['view_timetable'],
      
      // Student Management
      'Add student': ['manage_students', 'view_students'],
      'Bulk Student Import': ['manage_students', 'view_students'],
      'Bulk Student Photo Upload': ['manage_students', 'view_students'],
      'Student Directory': ['view_students'],
      'New Admission Report': ['view_students'],
      'Student Attendance': ['view_students'],
      'Student Report': ['view_students'],
      'Student Info. Update Settings on App': ['manage_students', 'view_students'],
      'Student Form Config': ['manage_students', 'view_students'],
      'Student Sibling': ['view_students'],
      'Student Attendance Report': ['view_students'],
      'PTM Attendance': ['view_students'],
      'Quick Student Search': ['view_students'],
      
      // Examinations
      'Exams': ['view_exams', 'manage_exams'],
      'Report Card, Teacher Report Card, Template Selection': ['view_exams', 'manage_exams'],
      'Staff Marks Entry Report': ['view_exams'],
      'Grade Scale': ['view_exams', 'manage_exams'],
      
      // Fee Management
      'Fee Configuration, Receipt Template': ['view_fees', 'manage_fees'],
      'Fee Basics (Fee Schedule, Fee Component, Fee Fine)': ['view_fees', 'manage_fees'],
      'Fee Discount': ['view_fees', 'manage_fees'],
      'Class-wise Fee, Student-wise Fee, Fee Receipts': ['view_fees', 'manage_fees'],
      'Pending cheques': ['view_fees', 'manage_fees'],
      'Fee Report, Student Fee Collection Report': ['view_fees'],
      'Fee Invoice': ['view_fees', 'manage_fees'],
      'Fee Mapper': ['view_fees', 'manage_fees'],
      'Receive online fee payment notification': ['view_fees'],
      'Quick Fee Search': ['view_fees'],
      
      // Library
      'Library Basics': ['view_library', 'manage_library'],
      'Catalogue': ['view_library', 'manage_library'],
      'Transactions': ['view_library', 'manage_library'],
      'Library Dashboard': ['view_library'],
      
      // Transport
      'Transport Basics': ['view_transport', 'manage_transport'],
      'Vehicles': ['view_transport', 'manage_transport'],
      'Routes': ['view_transport', 'manage_transport'],
      'Student Route Mapping': ['view_transport', 'manage_transport'],
      'Vehicle expenses': ['view_transport', 'manage_transport'],
      'GPS Tracking': ['view_transport'],
      
      // Communication
      'Notice/Circular': ['view_communication', 'manage_communication'],
      'Survey': ['view_communication', 'manage_communication'],
      'Incident Log': ['view_communication', 'manage_communication'],
      'Child Activity': ['view_communication', 'manage_communication'],
      'Whatsapp': ['view_communication', 'manage_communication'],
      
      // Reports
      'Report': ['view_reports'],
      
      // Certificate Management
      'Template Selection': ['view_certificates', 'manage_certificates'],
      'Manage Certificate': ['view_certificates', 'manage_certificates'],
      'Classwise student certificate': ['view_certificates', 'manage_certificates'],
      'Certificate Send to Student': ['view_certificates', 'manage_certificates'],
      
      // Digital Diary
      'Create Diary': ['view_homework', 'manage_homework'],
      'Daily Dairy Report': ['view_homework'],
      'Daily Dairy Report(all classes or all batches)': ['view_homework'],
      
      // Income and Expenditure
      'Add/Edit Category': ['view_finances', 'manage_finances'],
      'Add/Edit Payee': ['view_finances', 'manage_finances'],
      'Manage Income': ['view_finances', 'manage_finances'],
      'Manage Expenditure': ['view_finances', 'manage_finances'],
      
      // Gate Pass
      'Gate Pass Management': ['view_gate_pass', 'manage_gate_pass'],
    };
    return mapping[subModuleName] || [];
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

  type MenuItem = TeacherMenuItem;

  const hasPermission = (item: MenuItem): boolean => {
    // Always visible items (no permission required)
    if (!item.permission && !item.viewPermission) return true;
    
    // Check if staff has view or edit permission
    if (item.viewPermission && permissions.includes(item.viewPermission)) return true;
    if (item.permission && permissions.includes(item.permission)) return true;
    
    // If no permissions loaded yet, show item (will be disabled once permissions load)
    if (permissions.length === 0 && !staffPermissions) return true;
    
    return false;
  };

  // Filter sidebar items based on class teacher status
  const filteredTeacherItems = teacherBaseItems.filter(item => {
    if (item.requiresClassTeacher) {
      return isClassTeacher;
    }
    return true;
  });

  // Combine teacher items with dashboard items
  const allMenuItems: MenuItem[] = [
    ...filteredTeacherItems,
    ...dashboardMenuItems,
  ];

  const isActive = (path: string) => {
    if (path === '/teacher/dashboard' && pathname === '/teacher/dashboard') return true;
    return pathname === path || pathname.startsWith(path + '/');
  };

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
              <Link href="/" className="text-xl font-bold text-[#1e3a8a]">
                Edu<span className="text-[#5A7A9A]">-Core</span>
              </Link>
              <div className="hidden sm:block h-6 w-px bg-[#E1E1DB]" />
              <span className="hidden sm:block text-[#1e3a8a] font-semibold">{school?.school_name || teacher.school_code}</span>
            </div>
            <div className="flex items-center space-x-2">
              {/* Timer Display */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#1e3a8a]/10 rounded-lg border border-[#1e3a8a]/20">
                <Clock size={16} className="text-[#1e3a8a]" />
                <span className="text-sm font-medium text-[#1e3a8a] font-mono">
                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                </span>
              </div>

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
                    <Link href="/teacher/dashboard/attendance" className="block px-3 py-2 hover:bg-[#DBEAFE] rounded-lg">
                      Mark Attendance
                    </Link>
                    <Link href="/teacher/dashboard/marks" className="block px-3 py-2 hover:bg-[#DBEAFE] rounded-lg">
                      Marks Entry
                    </Link>
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
                    <Link href="/teacher/dashboard/password" className="block px-3 py-2 hover:bg-[#DBEAFE] rounded-lg">
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
                    <button className="block w-full text-left px-3 py-2 hover:bg-[#DBEAFE] rounded-lg">
                      English
                    </button>
                    <button className="block w-full text-left px-3 py-2 hover:bg-[#DBEAFE] rounded-lg">
                      हिंदी
                    </button>
                  </div>
                )}
              </div>

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
                        sessionStorage.removeItem('teacher');
                        sessionStorage.removeItem('role');
                        router.push('/login');
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
                      Teacher Portal
                    </h3>
                    <p className="text-[#B8D4E8] text-xs mt-1">Dashboard Menu</p>
                  </div>
                  
                  {/* Menu Items */}
                  {allMenuItems.map((item, index) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    const enabled = hasPermission(item);
                    const itemId = item.id;
                    
                    return (
                      <div key={itemId} className="relative sidebar-menu-item">
                        <div className="flex items-center gap-1">
                          {enabled ? (
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
                          ) : (
                            <div className="group flex-1 flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-300 text-[#7FA3C4] opacity-60 cursor-not-allowed relative">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2 bg-[#2c4a6b] text-[#7FA3C4]`}>
                                {index + 1}
                              </span>
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-transparent`}>
                                <Icon size={20} className="text-[#7FA3C4]" />
                              </div>
                              <span className="font-semibold text-sm tracking-wide flex-1 text-left">
                                {item.label}
                              </span>
                              <Lock size={16} className="text-[#7FA3C4]" />
                            </div>
                          )}
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

      {/* Help Modal */}
      <HelpModal isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)} schoolCode={''} />
    </div>
  );
}
