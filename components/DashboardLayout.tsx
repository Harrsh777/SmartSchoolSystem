'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  Users, 
  UserCheck, 
  BookOpen, 
  FileText, 
  DollarSign, 
  Library, 
  Bus, 
  MessageSquare, 
  Settings,
  Menu,
  X,
  CalendarDays,
  FileBarChart,
  Building2,
  Shield,
  Key,
  LogOut,
  Languages,
  ChevronDown,
  HelpCircle,
  Bell,
  Image,
  Search
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { languages } from '@/lib/translations';
import { motion, AnimatePresence } from 'framer-motion';
import StaffManagementModal from '@/components/staff/StaffManagementModal';
import ClassManagementModal from '@/components/classes/ClassManagementModal';
import TimetableManagementModal from '@/components/timetable/TimetableManagementModal';
import StudentManagementModal from '@/components/students/StudentManagementModal';
import FeeManagementModal from '@/components/fees/FeeManagementModal';
import EventCalendarManagementModal from '@/components/calendar/EventCalendarManagementModal';
import LibraryManagementModal from '@/components/library/LibraryManagementModal';
import TransportManagementModal from '@/components/transport/TransportManagementModal';
import HelpModal from '@/components/help/HelpModal';

interface DashboardLayoutProps {
  children: ReactNode;
  schoolName: string;
}

const menuItems = [
  { icon: Home, label: 'Home', path: '', permission: null, viewPermission: null }, // Always visible
  { icon: Building2, label: 'Institute Info', path: '/institute-info', permission: null, viewPermission: null }, // Always visible
  { icon: Shield, label: 'Role Management', path: '/settings/roles', permission: null, viewPermission: null }, // Admin only - handled separately
  { icon: Key, label: 'Password Manager', path: '/password', permission: 'manage_passwords', viewPermission: 'manage_passwords' },
  { icon: UserCheck, label: 'Staff Management', path: '/staff-management', isModal: true, permission: 'manage_staff', viewPermission: 'view_staff' },
  { icon: BookOpen, label: 'Classes', path: '/classes', isModal: true, permission: 'manage_classes', viewPermission: 'view_classes' },
  { icon: Users, label: 'Student Management', path: '/students', isModal: true, permission: 'manage_students', viewPermission: 'view_students' },
  { icon: CalendarDays, label: 'Timetable', path: '/timetable', isModal: true, permission: 'manage_timetable', viewPermission: 'view_timetable' },
  { icon: CalendarDays, label: 'Event/Calendar', path: '/calendar', isModal: true, permission: 'manage_events', viewPermission: 'view_events' },
  { icon: FileText, label: 'Examinations', path: '/examinations', permission: 'manage_exams', viewPermission: 'view_exams' },
  { icon: DollarSign, label: 'Fees', path: '/fees', isModal: true, permission: 'manage_fees', viewPermission: 'view_fees' },
  { icon: Library, label: 'Library', path: '/library', isModal: true, permission: 'manage_library', viewPermission: 'view_library' },
  { icon: Bus, label: 'Transport', path: '/transport', isModal: true, permission: 'manage_transport', viewPermission: 'view_transport' },
  { icon: MessageSquare, label: 'Communication', path: '/communication', permission: 'manage_communication', viewPermission: 'view_communication' },
  { icon: FileBarChart, label: 'Report', path: '/reports', permission: 'view_reports', viewPermission: 'view_reports' },
  { icon: Image, label: 'Gallery', path: '/gallery', permission: null, viewPermission: null }, // Visible to all, but only admin can manage
  { icon: Settings, label: 'Settings', path: '/settings', permission: null, viewPermission: null }, // Always visible
];

export default function DashboardLayout({ children, schoolName }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [timetableModalOpen, setTimetableModalOpen] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const [transportModalOpen, setTransportModalOpen] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [notificationsDropdownOpen, setNotificationsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  // Extract school code from pathname
  const schoolCode = pathname.split('/')[2] || '';

  // Get user info from session storage
  const [userInfo, setUserInfo] = useState<{ name?: string; role?: string; id?: string; isAdmin?: boolean }>({});
  const [permissions, setPermissions] = useState<string[]>([]);
  
  useEffect(() => {
    // Try to get user info from session storage
    const storedSchool = sessionStorage.getItem('school');
    const storedStudent = sessionStorage.getItem('student');
    const storedTeacher = sessionStorage.getItem('teacher');
    
    if (storedSchool) {
      try {
        const school = JSON.parse(storedSchool);
        setUserInfo({
          name: school.school_name || 'School Admin',
          role: 'School Admin',
          isAdmin: true, // Principal/Admin has full access
        });
      } catch {
        // Ignore parse errors
      }
    } else if (storedStudent) {
      try {
        const student = JSON.parse(storedStudent);
        setUserInfo({
          name: student.student_name || 'Student',
          role: 'Student',
        });
      } catch {
        // Ignore parse errors
      }
    } else if (storedTeacher) {
      try {
        const teacher = JSON.parse(storedTeacher);
        setUserInfo({
          name: teacher.full_name || 'Teacher',
          role: 'Teacher',
          id: teacher.id,
        });
        // Fetch permissions for staff member
        if (teacher.id) {
          fetchStaffPermissions(teacher.id);
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  const fetchStaffPermissions = async (staffId: string) => {
    try {
      const response = await fetch(`/api/rbac/staff/${staffId}/permissions`);
      const result = await response.json();
      if (response.ok && result.data) {
        setPermissions(result.data);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  // Filter menu items based on permissions
  const filteredMenuItems = menuItems.filter((item) => {
    // For admin/principal (school login), show ALL items regardless of permissions
    const isAdmin = userInfo.isAdmin === true || userInfo.role === 'School Admin';
    if (isAdmin) {
      return true;
    }
    
    // Always show items without permission requirement
    if (item.permission === null && item.viewPermission === null) {
      // Role Management is only for admin/principal
      if (item.path === '/settings/roles') {
        return isAdmin;
      }
      return true;
    }
    
    // For staff, check permissions
    // If they have manage permission, they can see it (manage implies view)
    if (item.permission && permissions.includes(item.permission)) {
      return true;
    }
    
    // If they have view permission, they can see it
    if (item.viewPermission && permissions.includes(item.viewPermission)) {
      return true;
    }
    
    // Check if manage permission grants access to view (e.g., manage_students allows viewing students menu)
    if (item.viewPermission && item.permission) {
      // Extract module name from permissions (e.g., "students" from "view_students" or "manage_students")
      const viewModule = item.viewPermission.replace('view_', '');
      const manageModule = item.permission.replace('manage_', '');
      
      // If modules match, check if user has manage permission (which implies view)
      if (viewModule === manageModule) {
        if (permissions.includes(item.permission)) {
          return true;
        }
      }
    }
    
    return false;
  });

  const handleLogout = () => {
    // Clear all session data
    sessionStorage.clear();
    localStorage.removeItem('dashboard_language'); // Optional: keep language preference
    router.push('/login');
  };

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Define all searchable menu items with sub-items
  const searchableMenuItems = [
    { label: 'Home', path: '', category: 'Management', icon: Home },
    { label: 'Institute Info', path: '/institute-info', category: 'Management', icon: Building2 },
    { label: 'Role Management', path: '/settings/roles', category: 'Management', icon: Shield },
    { label: 'Password Manager', path: '/password', category: 'Management', icon: Key },
    { label: 'Settings', path: '/settings', category: 'Management', icon: Settings },
    
    // Staff Management
    { label: 'Staff Management', path: '/staff-management', category: 'Staff Management', icon: UserCheck },
    { label: 'Add Staff', path: '/staff-management/add', category: 'Staff Management', icon: UserCheck, parent: 'Staff Management' },
    { label: 'Staff Directory', path: '/staff-management/directory', category: 'Staff Management', icon: UserCheck, parent: 'Staff Management' },
    { label: 'Staff Attendance', path: '/staff-management/attendance', category: 'Staff Management', icon: UserCheck, parent: 'Staff Management' },
    { label: 'Bulk Import Staff', path: '/staff-management/bulk-import', category: 'Staff Management', icon: UserCheck, parent: 'Staff Management' },
    { label: 'Bulk Photo Upload', path: '/staff-management/bulk-photo', category: 'Staff Management', icon: UserCheck, parent: 'Staff Management' },
    
    // Classes
    { label: 'Classes', path: '/classes', category: 'Classes', icon: BookOpen },
    { label: 'Classes Overview', path: '/classes/overview', category: 'Classes', icon: BookOpen, parent: 'Classes' },
    { label: 'Modify Classes', path: '/classes/modify', category: 'Classes', icon: BookOpen, parent: 'Classes' },
    { label: 'Assign Teachers', path: '/classes/assign-teachers', category: 'Classes', icon: BookOpen, parent: 'Classes' },
    
    // Student Management
    { label: 'Student Management', path: '/students', category: 'Student Management', icon: Users },
    { label: 'Add Student', path: '/students/add', category: 'Student Management', icon: Users, parent: 'Student Management' },
    { label: 'Student Directory', path: '/students/directory', category: 'Student Management', icon: Users, parent: 'Student Management' },
    { label: 'Student Attendance', path: '/students/attendance', category: 'Student Management', icon: Users, parent: 'Student Management' },
    { label: 'Import Students', path: '/students/import', category: 'Student Management', icon: Users, parent: 'Student Management' },
    { label: 'Bulk Import Students', path: '/students/bulk-import', category: 'Student Management', icon: Users, parent: 'Student Management' },
    { label: 'Student Siblings', path: '/students/siblings', category: 'Student Management', icon: Users, parent: 'Student Management' },
    
    // Timetable
    { label: 'Timetable', path: '/timetable', category: 'Timetable', icon: CalendarDays },
    { label: 'Class Timetable', path: '/timetable/class', category: 'Timetable', icon: CalendarDays, parent: 'Timetable' },
    { label: 'Teacher Timetable', path: '/timetable/teacher', category: 'Timetable', icon: CalendarDays, parent: 'Timetable' },
    { label: 'Group Wise Timetable', path: '/timetable/group-wise', category: 'Timetable', icon: CalendarDays, parent: 'Timetable' },
    
    // Event/Calendar
    { label: 'Event/Calendar', path: '/calendar', category: 'Event/Calendar', icon: CalendarDays },
    { label: 'Academic Calendar', path: '/calendar/academic', category: 'Event/Calendar', icon: CalendarDays, parent: 'Event/Calendar' },
    { label: 'Events', path: '/calendar/events', category: 'Event/Calendar', icon: CalendarDays, parent: 'Event/Calendar' },
    
    // Examinations
    { label: 'Examinations', path: '/examinations', category: 'Examinations', icon: FileText },
    { label: 'Create Examination', path: '/examinations/create', category: 'Examinations', icon: FileText, parent: 'Examinations' },
    { label: 'Exam Schedule', path: '/examinations/[examId]/schedule', category: 'Examinations', icon: FileText, parent: 'Examinations' },
    { label: 'View Marks', path: '/examinations/[examId]/marks', category: 'Examinations', icon: FileText, parent: 'Examinations' },
    
    // Fees
    { label: 'Fees', path: '/fees', category: 'Fees', icon: DollarSign },
    { label: 'Fee Basics', path: '/fees/basics', category: 'Fees', icon: DollarSign, parent: 'Fees' },
    { label: 'Class Wise Fees', path: '/fees/class-wise', category: 'Fees', icon: DollarSign, parent: 'Fees' },
    { label: 'Fine Management', path: '/fees/fine', category: 'Fees', icon: DollarSign, parent: 'Fees' },
    
    // Library
    { label: 'Library', path: '/library', category: 'Library', icon: Library },
    { label: 'Library Dashboard', path: '/library/dashboard', category: 'Library', icon: Library, parent: 'Library' },
    { label: 'Library Basics', path: '/library/basics', category: 'Library', icon: Library, parent: 'Library' },
    { label: 'Library Catalogue', path: '/library/catalogue', category: 'Library', icon: Library, parent: 'Library' },
    { label: 'Library Transactions', path: '/library/transactions', category: 'Library', icon: Library, parent: 'Library' },
    
    // Transport
    { label: 'Transport', path: '/transport', category: 'Transport', icon: Bus },
    { label: 'Transport Basics', path: '/transport/basics', category: 'Transport', icon: Bus, parent: 'Transport' },
    { label: 'Transport Routes', path: '/transport/routes', category: 'Transport', icon: Bus, parent: 'Transport' },
    { label: 'Transport Vehicles', path: '/transport/vehicles', category: 'Transport', icon: Bus, parent: 'Transport' },
    { label: 'Route Students', path: '/transport/route-students', category: 'Transport', icon: Bus, parent: 'Transport' },
    
    // Communication
    { label: 'Communication', path: '/communication', category: 'Communication', icon: MessageSquare },
    
    // Reports
    { label: 'Report', path: '/reports', category: 'Report', icon: FileBarChart },
    
    // Gallery
    { label: 'Gallery', path: '/gallery', category: 'Gallery', icon: Image },
    
    // Attendance
    { label: 'Attendance', path: '/attendance', category: 'Attendance', icon: CalendarDays },
    { label: 'Staff Attendance', path: '/attendance/staff', category: 'Attendance', icon: CalendarDays, parent: 'Attendance' },
  ];

  // Filter searchable items based on permissions
  const getSearchableItems = () => {
    const isAdmin = userInfo.isAdmin === true || userInfo.role === 'School Admin';
    
    return searchableMenuItems.filter((item) => {
      // For admin/principal, show all items
      if (isAdmin) {
        return true;
      }
      
      // Find the main menu item to check permissions
      const mainMenuItem = menuItems.find(mi => mi.path === item.path || (item.parent && mi.label === item.parent));
      if (!mainMenuItem) return false;
      
      // Always show items without permission requirement
      if (mainMenuItem.permission === null) {
        // Role Management is only for admin/principal
        if (item.path === '/settings/roles') {
          return isAdmin;
        }
        return true;
      }
      
      // For staff, check permissions
      return permissions.includes(mainMenuItem.permission);
    });
  };

  // Search functionality
  const filteredSearchResults = searchQuery.trim() 
    ? getSearchableItems().filter(item => 
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.parent && item.parent.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (languageDropdownOpen && !target.closest('.language-dropdown-container')) {
        setLanguageDropdownOpen(false);
      }
      if (notificationsDropdownOpen && !target.closest('.notifications-dropdown-container')) {
        setNotificationsDropdownOpen(false);
      }
      if (searchDropdownOpen && !target.closest('.search-container')) {
        setSearchDropdownOpen(false);
      }
    };

    if (languageDropdownOpen || notificationsDropdownOpen || searchDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [languageDropdownOpen, notificationsDropdownOpen, searchDropdownOpen]);

  const handleSearchItemClick = (item: typeof searchableMenuItems[0]) => {
    // Handle dynamic routes
    const finalPath = item.path;
    if (finalPath.includes('[examId]')) {
      // For exam-related routes, navigate to main examinations page
      router.push(`${basePath}/examinations`);
      setSearchDropdownOpen(false);
      setSearchQuery('');
      setSidebarOpen(false);
      return;
    }
    
    // Check if this is a sub-page (has a parent)
    const isSubPage = !!item.parent;
    
    // If it's a sub-page, navigate directly (these are actual pages, not modals)
    if (isSubPage) {
      router.push(`${basePath}${finalPath}`);
      setSearchDropdownOpen(false);
      setSearchQuery('');
      setSidebarOpen(false);
      return;
    }
    
    // Handle main modal items (only for main pages without parent)
    const mainMenuItem = menuItems.find(mi => mi.path === item.path);
    if (mainMenuItem?.isModal) {
      // Open the appropriate modal for main pages
      if (item.path === '/staff-management') {
        setStaffModalOpen(true);
      } else if (item.path === '/classes') {
        setClassModalOpen(true);
      } else if (item.path === '/timetable') {
        setTimetableModalOpen(true);
      } else if (item.path === '/students') {
        setStudentModalOpen(true);
      } else if (item.path === '/fees') {
        setFeeModalOpen(true);
      } else if (item.path === '/calendar') {
        setCalendarModalOpen(true);
      } else if (item.path === '/library') {
        setLibraryModalOpen(true);
      } else if (item.path === '/transport') {
        setTransportModalOpen(true);
      }
    } else {
      // Navigate to the page
      router.push(`${basePath}${finalPath}`);
    }
    
    setSearchDropdownOpen(false);
    setSearchQuery('');
    setSidebarOpen(false);
  };

  const basePath = pathname.split('/').slice(0, 3).join('/');
  
  const isActive = (path: string) => {
    if (path === '') {
      return pathname === basePath || pathname === `${basePath}/`;
    }
    return pathname.startsWith(`${basePath}${path}`);
  };

  // Group searchable items by parent/main menu
  const getSubItems = (mainMenuItem: typeof menuItems[0]) => {
    const searchableItems = getSearchableItems();
    
    return searchableItems.filter((item) => {
      // Don't include the main item itself
      if (item.path === mainMenuItem.path) return false;
      
      // If item has a parent property, check if it matches the main menu label
      if (item.parent && item.parent === mainMenuItem.label) {
        return true;
      }
      
      // For items without explicit parent, check if path starts with main menu path
      // and is a sub-path (has additional segments)
      if (mainMenuItem.path && mainMenuItem.path !== '') {
        // Check if the item path is a sub-path of the main menu path
        if (item.path.startsWith(mainMenuItem.path + '/') && item.path !== mainMenuItem.path) {
          return true;
        }
      }
      
      // Special case for Home (empty path) - don't show sub-items
      if (mainMenuItem.path === '') {
        return false;
      }
      
      return false;
    });
  };

  const toggleSection = (sectionLabel: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionLabel]: !prev[sectionLabel]
    }));
  };

  // Auto-expand sections that have active sub-items
  useEffect(() => {
    filteredMenuItems.forEach((item) => {
      const subItems = getSubItems(item);
      const hasActiveSubItem = subItems.some(subItem => isActive(subItem.path));
      if (hasActiveSubItem) {
        setExpandedSections(prev => {
          if (!prev[item.label]) {
            return {
              ...prev,
              [item.label]: true
            };
          }
          return prev;
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#ECEDED]">
      {/* Top Navigation - Modern and Vibrant */}
      <nav className="bg-[#FFFFFF]/80 backdrop-blur-lg border-b border-[#E1E1DB] sticky top-0 z-40 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-xl hover:bg-[#FFF2C2] transition-all"
              >
                {sidebarOpen ? <X size={24} className="text-[#2B2B2B]" /> : <Menu size={24} className="text-[#2B2B2B]" />}
              </button>
              <Link href="/" className="text-xl font-bold text-[#2B2B2B]">
                Edu<span className="text-[#6B6B6B]">-Yan</span>
              </Link>
              <div className="hidden sm:block h-6 w-px bg-[#E1E1DB]" />
              <span className="hidden sm:block text-[#2B2B2B] font-semibold">{schoolName}</span>
            </div>
            <div className="flex items-center space-x-3">
              {/* Search Bar */}
              <div className="relative search-container">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search menu..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSearchDropdownOpen(true);
                    }}
                    onFocus={() => setSearchDropdownOpen(true)}
                    className="pl-10 pr-4 py-2 w-64 rounded-lg border border-[#E1E1DB] focus:outline-none focus:ring-2 focus:ring-[#FFD66B] focus:border-transparent bg-[#FFFFFF] text-sm text-[#2B2B2B]"
                  />
                </div>
                
                {searchDropdownOpen && searchQuery.trim() && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute left-0 mt-2 w-96 bg-[#FFFFFF] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-[#E1E1DB] z-50 overflow-hidden backdrop-blur-sm max-h-96 overflow-y-auto"
                  >
                    {filteredSearchResults.length > 0 ? (
                      <>
                        <div className="p-3 border-b border-[#E1E1DB] bg-[#FFF2C2]">
                          <h3 className="font-semibold text-[#2B2B2B] text-sm">
                            {filteredSearchResults.length} result{filteredSearchResults.length !== 1 ? 's' : ''} found
                          </h3>
                        </div>
                        <div className="py-2">
                          {Object.entries(
                            filteredSearchResults.reduce((acc, item) => {
                              const category = item.category;
                              if (!acc[category]) acc[category] = [];
                              acc[category].push(item);
                              return acc;
                            }, {} as Record<string, typeof filteredSearchResults>)
                          ).map(([category, items]) => (
                            <div key={category} className="mb-2">
                              <div className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider bg-[#F2F2EE]">
                                {category}
                              </div>
                              {items.map((item) => {
                                const Icon = item.icon;
                                return (
                                  <button
                                    key={`${item.path}-${item.label}`}
                                    onClick={() => handleSearchItemClick(item)}
                                    className="w-full px-4 py-3 text-left hover:bg-[#FFF2C2] transition-all flex items-center gap-3 group"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-[#FFF2C2] group-hover:bg-[#FFD66B] flex items-center justify-center transition-all">
                                      <Icon size={16} className="text-[#2B2B2B]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-[#2B2B2B] text-sm">{item.label}</div>
                                      {item.parent && (
                                        <div className="text-xs text-[#6B6B6B] mt-0.5">{item.parent}</div>
                                      )}
                                    </div>
                                    <ChevronDown size={16} className="text-[#9A9A9A] rotate-[-90deg]" />
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="p-8 text-center">
                        <Search className="mx-auto mb-3 text-gray-400" size={32} />
                        <p className="text-gray-600 font-medium">No results found</p>
                        <p className="text-gray-500 text-sm mt-1">Try a different search term</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Notifications Button */}
              <div className="relative notifications-dropdown-container">
                <button
                  onClick={() => setNotificationsDropdownOpen(!notificationsDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#EDEDED] hover:bg-[#E1E1DB] text-[#2B2B2B] font-medium transition-all border border-[#E1E1DB] relative"
                  title="Notifications"
                >
                  <Bell size={18} className="text-[#2B2B2B]" />
                  <span className="hidden sm:inline">Notifications</span>
                </button>

                {notificationsDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-80 bg-[#FFFFFF] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-[#E1E1DB] z-50 overflow-hidden backdrop-blur-sm"
                  >
                    <div className="p-4 border-b border-[#E1E1DB]">
                      <h3 className="font-semibold text-[#2B2B2B]">Notifications</h3>
                    </div>
                    <div className="p-8 text-center">
                      <Bell className="mx-auto mb-3 text-[#9A9A9A]" size={32} />
                      <p className="text-[#6B6B6B] font-medium">No new notifications are there</p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Help Button */}
              <button
                onClick={() => setHelpModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#EDEDED] hover:bg-[#E1E1DB] text-[#2B2B2B] font-medium transition-all border border-[#E1E1DB]"
                title="Get Help"
              >
                <HelpCircle size={18} className="text-[#2B2B2B]" />
                <span className="hidden sm:inline">Help</span>
              </button>

              {/* Language Selector */}
              <div className="relative language-dropdown-container">
                <button
                  onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#EDEDED] hover:bg-[#E1E1DB] text-[#2B2B2B] font-medium transition-all border border-[#E1E1DB]"
                >
                  <Languages size={18} className="text-[#2B2B2B]" />
                  <span className="hidden sm:inline">{languages.find(l => l.code === language)?.flag} {languages.find(l => l.code === language)?.name}</span>
                  <ChevronDown size={16} className={`transition-transform ${languageDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {languageDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-48 bg-[#FFFFFF] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-[#E1E1DB] z-50 overflow-hidden backdrop-blur-sm"
                  >
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                          setLanguageDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-[#FFF2C2] transition-all flex items-center gap-3 ${
                          language === lang.code ? 'bg-[#FFD66B] font-semibold' : ''
                        }`}
                      >
                        <span className="text-xl">{lang.flag}</span>
                        <span className="flex-1 text-[#2B2B2B]">{lang.name}</span>
                        {language === lang.code && (
                          <div className="w-2 h-2 rounded-full bg-[#2B2B2B]" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#E57373] hover:bg-[#D65A5A] text-white font-medium transition-all shadow-lg shadow-[#E57373]/20 hover:shadow-xl hover:shadow-[#E57373]/30"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">{t('nav.logout')}</span>
              </button>
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

              {/* Sidebar - Modern, Clean, Professional */}
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                className="fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-70 bg-[#2B2B2B] border-r border-[#3A3A3A] z-50 lg:z-auto overflow-y-auto shadow-2xl"
                style={{ width: '280px', background: 'linear-gradient(180deg, #2B2B2B 0%, #1F1F1F 100%)' }}
              >
                <nav className="p-5 space-y-1.5">
                  {/* Header Section */}
                  <div className="mb-6 px-4 py-3.5 bg-[#3A3A3A] rounded-2xl border border-[#3A3A3A] backdrop-blur-sm">
                    <h3 className="text-[#FFFFFF] font-bold text-base uppercase tracking-widest">
                      {t('nav.management')}
                    </h3>
                    <p className="text-[#CFCFCF] text-xs mt-1">{t('nav.dashboard_menu')}</p>
                  </div>
                  
                  {/* Menu Items */}
                  {filteredMenuItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    const subItems = getSubItems(item);
                    const hasSubItems = subItems.length > 0;
                    const isExpanded = expandedSections[item.label] || false;
                    
                    if (item.isModal) {
                      const isStaffManagement = item.path === '/staff-management';
                      const isClasses = item.path === '/classes';
                      const isTimetable = item.path === '/timetable';
                      const isStudents = item.path === '/students';
                      const isFees = item.path === '/fees';
                      const isCalendar = item.path === '/calendar';
                      const isLibrary = item.path === '/library';
                      const isTransport = item.path === '/transport';
                      return (
                        <div key={item.label} className="space-y-1">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                // If item has sub-items, only toggle dropdown, don't open modal
                                if (hasSubItems) {
                                  toggleSection(item.label);
                                } else {
                                  // If no sub-items, open modal as before
                                  if (isStaffManagement) {
                                    setStaffModalOpen(true);
                                  } else if (isClasses) {
                                    setClassModalOpen(true);
                                  } else if (isTimetable) {
                                    setTimetableModalOpen(true);
                                  } else if (isStudents) {
                                    setStudentModalOpen(true);
                                  } else if (isFees) {
                                    setFeeModalOpen(true);
                                  } else if (isCalendar) {
                                    setCalendarModalOpen(true);
                                  } else if (isLibrary) {
                                    setLibraryModalOpen(true);
                                  } else if (isTransport) {
                                    setTransportModalOpen(true);
                                  }
                                  setSidebarOpen(false);
                                }
                              }}
                              className={`group flex-1 flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-300 ${
                                active
                                  ? 'bg-[#FFD66B] text-[#2B2B2B] shadow-xl shadow-[#FFD66B]/20 scale-[1.02]'
                                  : 'text-[#CFCFCF] hover:text-[#FFFFFF] hover:bg-[#3A3A3A]'
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                                active 
                                  ? 'bg-[#F5C84B] shadow-lg' 
                                  : 'bg-transparent group-hover:bg-[#3A3A3A] group-hover:scale-110 group-hover:shadow-md'
                              }`}>
                                <Icon size={20} className={active ? 'text-[#2B2B2B]' : 'text-[#AFAFAF] group-hover:text-[#FFFFFF]'} />
                              </div>
                              <span className="font-semibold text-sm tracking-wide flex-1 text-left">
                                {item.path === '' ? t('nav.home') : 
                                 item.path === '/institute-info' ? t('nav.institute_info') :
                                 item.path === '/admin-roles' ? t('nav.admin_roles') :
                                 item.path === '/password' ? t('nav.password') :
                                 item.path === '/staff-management' ? t('nav.staff_management') :
                                 item.path === '/classes' ? t('nav.classes') :
                                 item.path === '/students' ? t('nav.students') :
                                 item.path === '/timetable' ? t('nav.timetable') :
                                 item.path === '/calendar' ? t('nav.calendar') :
                                 item.path === '/examinations' ? t('nav.examinations') :
                                 item.path === '/fees' ? t('nav.fees') :
                                 item.path === '/library' ? t('nav.library') :
                                 item.path === '/transport' ? t('nav.transport') :
                                 item.path === '/communication' ? t('nav.communication') :
                                 item.path === '/reports' ? t('nav.reports') :
                                 item.path === '/settings' ? t('nav.settings') :
                                 item.label}
                              </span>
                              {active && (
                                <div className="w-1.5 h-1.5 rounded-full bg-[#F5C84B] animate-pulse" />
                              )}
                            </button>
                            {hasSubItems && (
                              <button
                                onClick={() => toggleSection(item.label)}
                                className={`p-2 rounded-lg transition-all ${
                                  isExpanded ? 'bg-[#3A3A3A] text-[#FFFFFF]' : 'text-[#CFCFCF] hover:bg-[#3A3A3A] hover:text-[#FFFFFF]'
                                }`}
                              >
                                <ChevronDown 
                                  size={16} 
                                  className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                                />
                              </button>
                            )}
                          </div>
                          {hasSubItems && isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="ml-4 space-y-1 pl-4 border-l-2 border-[#3A3A3A]"
                            >
                              {subItems.map((subItem) => {
                                const SubIcon = subItem.icon;
                                const subActive = isActive(subItem.path);
                                return (
                                  <Link
                                    key={`${subItem.path}-${subItem.label}`}
                                    href={`${basePath}${subItem.path}`}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-300 ${
                                      subActive
                                        ? 'bg-[#3A3A3A] text-[#FFD66B]'
                                        : 'text-[#9A9A9A] hover:text-[#CFCFCF] hover:bg-[#3A3A3A]/50'
                                    }`}
                                  >
                                    <SubIcon size={16} className={subActive ? 'text-[#FFD66B]' : 'text-[#9A9A9A] group-hover:text-[#CFCFCF]'} />
                                    <span className="font-medium text-xs tracking-wide flex-1 text-left">
                                      {subItem.label}
                                    </span>
                                    {subActive && (
                                      <div className="w-1.5 h-1.5 rounded-full bg-[#FFD66B] animate-pulse" />
                                    )}
                                  </Link>
                                );
                              })}
                            </motion.div>
                          )}
                        </div>
                      );
                    }
                    
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`${basePath}${item.path}`}
                            onClick={() => setSidebarOpen(false)}
                            className={`group flex-1 flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-300 ${
                              active
                                ? 'bg-[#FFD66B] text-[#2B2B2B] shadow-xl shadow-[#FFD66B]/20 scale-[1.02]'
                                : 'text-[#CFCFCF] hover:text-[#FFFFFF] hover:bg-[#3A3A3A]'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                              active 
                                ? 'bg-[#F5C84B] shadow-lg' 
                                : 'bg-transparent group-hover:bg-[#3A3A3A] group-hover:scale-110 group-hover:shadow-md'
                            }`}>
                              <Icon size={20} className={active ? 'text-[#2B2B2B]' : 'text-[#AFAFAF] group-hover:text-[#FFFFFF]'} />
                            </div>
                            <span className="font-semibold text-sm tracking-wide flex-1 text-left">
                              {item.path === '' ? t('nav.home') : 
                               item.path === '/institute-info' ? t('nav.institute_info') :
                               item.path === '/admin-roles' ? t('nav.admin_roles') :
                               item.path === '/password' ? t('nav.password') :
                               item.path === '/staff-management' ? t('nav.staff_management') :
                               item.path === '/classes' ? t('nav.classes') :
                               item.path === '/students' ? t('nav.students') :
                               item.path === '/timetable' ? t('nav.timetable') :
                               item.path === '/calendar' ? t('nav.calendar') :
                               item.path === '/examinations' ? t('nav.examinations') :
                               item.path === '/fees' ? t('nav.fees') :
                               item.path === '/library' ? t('nav.library') :
                               item.path === '/transport' ? t('nav.transport') :
                               item.path === '/communication' ? t('nav.communication') :
                               item.path === '/reports' ? t('nav.reports') :
                               item.path === '/settings' ? t('nav.settings') :
                               item.label}
                            </span>
                            {active && (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#F5C84B] animate-pulse" />
                            )}
                          </Link>
                          {hasSubItems && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                toggleSection(item.label);
                              }}
                              className={`p-2 rounded-lg transition-all ${
                                isExpanded ? 'bg-[#3A3A3A] text-[#FFFFFF]' : 'text-[#CFCFCF] hover:bg-[#3A3A3A] hover:text-[#FFFFFF]'
                              }`}
                            >
                              <ChevronDown 
                                size={16} 
                                className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                              />
                            </button>
                          )}
                        </div>
                        {hasSubItems && isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="ml-4 space-y-1 pl-4 border-l-2 border-[#3A3A3A]"
                          >
                            {subItems.map((subItem) => {
                              const SubIcon = subItem.icon;
                              const subActive = isActive(subItem.path);
                              return (
                                <Link
                                  key={`${subItem.path}-${subItem.label}`}
                                  href={`${basePath}${subItem.path}`}
                                  onClick={() => setSidebarOpen(false)}
                                  className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-300 ${
                                    subActive
                                      ? 'bg-[#3A3A3A] text-[#FFD66B]'
                                      : 'text-[#9A9A9A] hover:text-[#CFCFCF] hover:bg-[#3A3A3A]/50'
                                  }`}
                                >
                                  <SubIcon size={16} className={subActive ? 'text-[#FFD66B]' : 'text-[#9A9A9A] group-hover:text-[#CFCFCF]'} />
                                  <span className="font-medium text-xs tracking-wide flex-1 text-left">
                                    {subItem.label}
                                  </span>
                                  {subActive && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#FFD66B] animate-pulse" />
                                  )}
                                </Link>
                              );
                            })}
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content - Vibrant Background */}
        <main className="flex-1 lg:ml-0 bg-[#ECEDED] min-h-[calc(100vh-4rem)]">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
      
      {/* Staff Management Modal */}
      <StaffManagementModal
        isOpen={staffModalOpen}
        onClose={() => setStaffModalOpen(false)}
        schoolCode={schoolCode}
      />
      
      {/* Class Management Modal */}
      <ClassManagementModal
        isOpen={classModalOpen}
        onClose={() => setClassModalOpen(false)}
        schoolCode={schoolCode}
      />
      
      {/* Timetable Management Modal */}
      <TimetableManagementModal
        isOpen={timetableModalOpen}
        onClose={() => setTimetableModalOpen(false)}
        schoolCode={schoolCode}
      />
      
      {/* Student Management Modal */}
      <StudentManagementModal
        isOpen={studentModalOpen}
        onClose={() => setStudentModalOpen(false)}
        schoolCode={schoolCode}
      />
      
      {/* Fee Management Modal */}
      <FeeManagementModal
        isOpen={feeModalOpen}
        onClose={() => setFeeModalOpen(false)}
        schoolCode={schoolCode}
      />
      
      {/* Event/Calendar Management Modal */}
      <EventCalendarManagementModal
        isOpen={calendarModalOpen}
        onClose={() => setCalendarModalOpen(false)}
        schoolCode={schoolCode}
      />

      {/* Library Management Modal */}
      <LibraryManagementModal
        isOpen={libraryModalOpen}
        onClose={() => setLibraryModalOpen(false)}
        schoolCode={schoolCode}
      />

      {/* Transport Management Modal */}
      <TransportManagementModal
        isOpen={transportModalOpen}
        onClose={() => setTransportModalOpen(false)}
        schoolCode={schoolCode}
      />

      {/* Help Modal */}
      <HelpModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
        schoolCode={schoolCode}
        userName={userInfo.name}
        userRole={userInfo.role}
      />
    </div>
  );
}

