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
  IndianRupee,
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
  ClipboardCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Staff, AcceptedSchool } from '@/lib/supabase';
import HelpModal from '@/components/help/HelpModal';
import { setupApiInterceptor, removeApiInterceptor, setLogoutHandler } from '@/lib/api-interceptor';
import { languages } from '@/lib/translations';

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

// Default teacher menu items (always visible)
const teacherBaseItems: TeacherMenuItem[] = [
  { id: 'home', label: 'Home', icon: Home, path: '/teacher/dashboard', permission: null, viewPermission: null },
  { id: 'attendance', label: 'Mark Attendance', icon: Calendar, path: '/teacher/dashboard/attendance', permission: null, viewPermission: null },
  { id: 'my-attendance', label: 'My Attendance', icon: Calendar, path: '/teacher/dashboard/attendance-staff', permission: null, viewPermission: null },
  { id: 'marks', label: 'Marks Entry', icon: FileText, path: '/teacher/dashboard/marks', requiresClassTeacher: true, permission: null, viewPermission: null },
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
  { id: 'fees', icon: IndianRupee, label: 'Fees', path: '/teacher/dashboard/fees', permission: 'manage_fees', viewPermission: 'view_fees' },
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

  // Logout handler for 401 responses only (no inactivity timeout)
  useEffect(() => {
    const logout = () => {
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      router.push('/login');
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
  }, [router, pathname]);

  const fetchStaffPermissions = async (staffId: string) => {
    try {
      // Fetch staff menu items (which include permissions)
      const response = await fetch(`/api/staff/${staffId}/menu`);
      const result = await response.json();
      
      console.log('Staff menu API response:', {
        ok: response.ok,
        hasData: !!result.data,
        modulesCount: result.data?.length || 0,
        error: result.error,
      });
      
      if (response.ok && result.data) {
        // Store the raw menu modules for dynamic menu generation
        setDynamicModules(result.data || []);
        
        // Convert menu data to permissions format
        const menuModules = result.data || [];
        
        // Build the permissions data structure expected by staffPermissions state
        const permissionsData = {
          modules: menuModules.map((module: {
            module_name: string;
            module_key: string;
            sub_modules: Array<{
              name: string;
              key: string;
              route: string;
              has_view_access: boolean;
              has_edit_access: boolean;
            }>;
          }) => ({
            id: module.module_key,
            name: module.module_name,
            sub_modules: module.sub_modules.map(sm => ({
              name: sm.name,
              view_access: sm.has_view_access,
              edit_access: sm.has_edit_access,
            })),
          })),
        };
        
        setStaffPermissions(permissionsData);
        
        // Extract enabled sub-modules and map to permission keys
        const enabledPermissions = new Set<string>();
        const moduleAccessMap = new Map<string, boolean>(); // Track module-level access
        
        console.log('Processing modules:', menuModules.length);
        
        menuModules.forEach((module: {
          module_name: string;
          module_key: string;
          sub_modules: Array<{
            name: string;
            key: string;
            route: string;
            has_view_access: boolean;
            has_edit_access: boolean;
          }>;
        }) => {
          let hasModuleAccess = false;
          
          const subModules = module.sub_modules || [];
          console.log(`Module "${module.module_name}" has ${subModules.length} sub-modules`);
          
          subModules.forEach((subModule) => {
            const subModuleName = subModule.name;
            const hasAccess = subModule.has_view_access || subModule.has_edit_access;
            
            if (hasAccess && subModuleName) {
              hasModuleAccess = true;
              console.log(`  - Sub-module "${subModuleName}" has access (view: ${subModule.has_view_access}, edit: ${subModule.has_edit_access})`);
              // Map sub-module names to permission keys
              const permKeys = mapSubModuleToPermissions(subModuleName);
              console.log(`  - Mapped to permissions:`, permKeys);
              permKeys.forEach(key => enabledPermissions.add(key));
            }
          });
          
          // Store module-level access
          if (module.module_key && module.module_name) {
            moduleAccessMap.set(module.module_key.toLowerCase(), hasModuleAccess);
            // Also check by module name for backward compatibility
            moduleAccessMap.set(module.module_name.toLowerCase(), hasModuleAccess);
          }
        });
        
        const permissionsArray = Array.from(enabledPermissions);
        console.log('Final enabled permissions:', permissionsArray);
        console.log('Module access map:', Object.fromEntries(moduleAccessMap));
        
        setPermissions(permissionsArray);
        // Store module access map for direct module checking
        (window as unknown as Record<string, unknown>).__moduleAccessMap = moduleAccessMap;
      } else {
        console.error('Failed to fetch staff menu:', result.error || 'Unknown error');
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
      'Staff Directory': ['view_staff', 'manage_staff'],
      'Add Staff': ['manage_staff', 'view_staff'],
      'Bulk Staff import': ['manage_staff', 'view_staff'],
      'Bulk Staff Import': ['manage_staff', 'view_staff'],
      'Bulk Staff Photo Upload': ['manage_staff', 'view_staff'],
      'Bulk Photo Upload': ['manage_staff', 'view_staff'],
      'Staff Attendance': ['view_staff', 'manage_staff'],
      'Student Attendance Marking Report': ['view_staff'],
      'Staff Attendance Marking Report': ['view_staff'],
      'Quick Staff Search': ['view_staff'],
      'Role Management': ['manage_staff'],
      
      // Classes - Updated to match actual sub-module names
      'Classes Overview': ['view_classes', 'manage_classes'],
      'Modify Classes': ['manage_classes', 'view_classes'],
      'Subject Teachers': ['view_classes', 'manage_classes'],
      'Add/Modify Subjects': ['manage_classes', 'view_classes'],
      'Add/Modify Class': ['manage_classes', 'view_classes'],
      'Assign Teachers': ['manage_classes', 'view_classes'],
      
      // Timetable - Updated to match actual sub-module names
      'Class Timetable': ['view_timetable', 'manage_timetable'],
      'Teacher Timetable': ['view_timetable'],
      'Group Wise Timetable': ['view_timetable'],
      'Teacher Workload': ['view_timetable'],
      'Group wise Timetable': ['view_timetable'],
      'Class Time Table': ['manage_timetable', 'view_timetable'],
      'Teacher Time Table': ['view_timetable'],
      
      // Student Management
      'Add Student': ['manage_students', 'view_students'],
      'Add student': ['manage_students', 'view_students'],
      'Student Directory': ['view_students', 'manage_students'],
      'Student Attendance': ['view_students', 'manage_students'],
      'Mark Attendance': ['view_students', 'manage_students'],
      'Bulk Import Students': ['manage_students', 'view_students'],
      'Bulk Student Import': ['manage_students', 'view_students'],
      'Bulk Student Photo Upload': ['manage_students', 'view_students'],
      'New Admission Report': ['view_students'],
      'Student Report': ['view_students'],
      'Student Info. Update Settings on App': ['manage_students', 'view_students'],
      'Student Form Config': ['manage_students', 'view_students'],
      'Student Siblings': ['view_students', 'manage_students'],
      'Student Sibling': ['view_students'],
      'Student Attendance Report': ['view_students'],
      'PTM Attendance': ['view_students'],
      'Quick Student Search': ['view_students'],
      
      // Examinations - Updated to match actual sub-module names
      'Examination Dashboard': ['view_exams'],
      'Create Examination': ['view_exams', 'manage_exams'],
      'Grade Scale': ['view_exams', 'manage_exams'],
      'Offline Tests': ['view_exams', 'manage_exams'],
      'Report Card': ['view_exams'],
      'Report Card Template': ['view_exams', 'manage_exams'],
      'Examination Reports': ['view_exams'],
      'Exams': ['view_exams', 'manage_exams'],
      'Report Card, Teacher Report Card, Template Selection': ['view_exams', 'manage_exams'],
      'Staff Marks Entry Report': ['view_exams'],
      
      // Marks
      'Marks Dashboard': ['view_exams'],
      'Mark Entry': ['view_exams', 'manage_exams'],
      'Marks Entry': ['view_exams', 'manage_exams'],
      
      // Fee Management - Updated to match actual sub-module names
      'Fee Dashboard': ['view_fees'],
      'Fee Heads': ['view_fees', 'manage_fees'],
      'Fee Structures': ['view_fees', 'manage_fees'],
      'Collect Payment': ['view_fees', 'manage_fees'],
      'Student Fee Statements': ['view_fees'],
      'Discounts & Fines': ['view_fees', 'manage_fees'],
      'Fee Reports': ['view_fees'],
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
      
      // Library - Updated
      'Library Dashboard': ['view_library'],
      'Library Basics': ['view_library', 'manage_library'],
      'Library Catalogue': ['view_library', 'manage_library'],
      'Catalogue': ['view_library', 'manage_library'],
      'Library Transactions': ['view_library', 'manage_library'],
      'Transactions': ['view_library', 'manage_library'],
      
      // Transport - Updated
      'Transport Dashboard': ['view_transport'],
      'Vehicles': ['view_transport', 'manage_transport'],
      'Stops': ['view_transport', 'manage_transport'],
      'Routes': ['view_transport', 'manage_transport'],
      'Student Route Mapping': ['view_transport', 'manage_transport'],
      'Transport Basics': ['view_transport', 'manage_transport'],
      'Vehicle expenses': ['view_transport', 'manage_transport'],
      'GPS Tracking': ['view_transport'],
      
      // Leave Management - Updated
      'Leave Dashboard': ['view_leave', 'manage_leave'],
      'Student Leave': ['view_leave', 'manage_leave'],
      'Staff Leave': ['view_leave', 'manage_leave'],
      'Leave Basics': ['view_leave', 'manage_leave'],
      
      // Event/Calendar - Updated
      'Academic Calendar': ['view_events', 'manage_events'],
      'Events': ['view_events', 'manage_events'],
      
      // Communication
      'Communication': ['view_communication', 'manage_communication'],
      'Notice/Circular': ['view_communication', 'manage_communication'],
      'Survey': ['view_communication', 'manage_communication'],
      'Incident Log': ['view_communication', 'manage_communication'],
      'Child Activity': ['view_communication', 'manage_communication'],
      'Whatsapp': ['view_communication', 'manage_communication'],
      
      // Reports
      'Report': ['view_reports'],
      
      // Certificate Management - Updated
      'Certificate Dashboard': ['view_certificates'],
      'New Certificate': ['view_certificates', 'manage_certificates'],
      'Template Selection': ['view_certificates', 'manage_certificates'],
      'Manage Certificate': ['view_certificates', 'manage_certificates'],
      'Classwise student certificate': ['view_certificates', 'manage_certificates'],
      'Certificate Send to Student': ['view_certificates', 'manage_certificates'],
      
      // Digital Diary - Updated
      'Digital Diary': ['view_homework', 'manage_homework'],
      'Create Diary': ['view_homework', 'manage_homework'],
      'Daily Dairy Report': ['view_homework'],
      'Daily Dairy Report(all classes or all batches)': ['view_homework'],
      
      // Expense/Income - Updated
      'Expense/Income': ['view_finances', 'manage_finances'],
      'Add/Edit Category': ['view_finances', 'manage_finances'],
      'Add/Edit Payee': ['view_finances', 'manage_finances'],
      'Manage Income': ['view_finances', 'manage_finances'],
      'Manage Expenditure': ['view_finances', 'manage_finances'],
      
      // Front Office - Updated
      'Front Office Dashboard': ['view_gate_pass', 'manage_gate_pass'],
      'Gate Pass': ['view_gate_pass', 'manage_gate_pass'],
      'Visitor Management': ['view_gate_pass', 'manage_gate_pass'],
      'Gate Pass Management': ['view_gate_pass', 'manage_gate_pass'],
      
      // Copy Checking
      'Copy Checking': ['view_homework', 'manage_homework'],
      
      // Gallery
      'Gallery': ['view_gallery'],
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
    
    // Check if staff has view or edit permission via permission keys
    if (item.viewPermission && permissions.includes(item.viewPermission)) return true;
    if (item.permission && permissions.includes(item.permission)) return true;
    
    // Check module-level access directly from staff permissions
    // This allows checking if ANY sub-module in a module has access
    if (staffPermissions?.modules) {
      // Map menu item paths/IDs to module name patterns
      const moduleMap: Record<string, string[]> = {
        '/teacher/dashboard/examinations': ['examination', 'exam'],
        '/teacher/dashboard/marks': ['mark', 'examination', 'exam'],
        '/teacher/dashboard/fees': ['fee'],
        '/teacher/dashboard/library': ['library'],
        '/teacher/dashboard/transport': ['transport'],
        '/teacher/dashboard/communication': ['communication', 'notice', 'circular'],
        '/teacher/dashboard/certificates': ['certificate'],
        '/teacher/dashboard/homework': ['homework', 'diary', 'digital diary'],
        '/teacher/dashboard/expense-income': ['expense', 'income', 'finance'],
        '/teacher/dashboard/gate-pass': ['gate', 'pass', 'front office'],
        '/teacher/dashboard/staff-management': ['staff'],
        '/teacher/dashboard/classes': ['class'],
        '/teacher/dashboard/students': ['student'],
        '/teacher/dashboard/timetable': ['timetable', 'time table'],
        '/teacher/dashboard/calendar': ['calendar', 'event'],
      };
      
      // Also check by item ID
      const itemIdMap: Record<string, string[]> = {
        'examinations': ['examination', 'exam'],
        'marks': ['mark', 'examination', 'exam'],
        'fees': ['fee'],
        'library': ['library'],
        'transport': ['transport'],
        'communication': ['communication', 'notice', 'circular'],
        'certificates': ['certificate'],
        'homework': ['homework', 'diary', 'digital diary'],
        'expense-income': ['expense', 'income', 'finance'],
        'gate-pass': ['gate', 'pass', 'front office'],
        'staff-management': ['staff'],
        'classes-dash': ['class'],
        'classes': ['class'],
        'students': ['student'],
        'timetable': ['timetable', 'time table'],
        'calendar': ['calendar', 'event'],
      };
      
      const modulePatterns = moduleMap[item.path] || itemIdMap[item.id || ''] || [];
      
      for (const pattern of modulePatterns) {
        const modulesArray = Array.isArray(staffPermissions.modules) ? staffPermissions.modules : [];
        const modRecord = modulesArray.find((m: { name?: string; id?: string }) => {
          const moduleName = m.name?.toLowerCase() || '';
          const moduleId = m.id?.toLowerCase() || '';
          return moduleName.includes(pattern.toLowerCase()) || moduleId.includes(pattern.toLowerCase());
        });
        
        if (modRecord) {
          // Check if any sub-module has view or edit access
          const hasAccess = modRecord.sub_modules?.some((sm: { view_access?: boolean; edit_access?: boolean }) => 
            sm.view_access || sm.edit_access
          );
          if (hasAccess) return true;
        }
      }
    }
    
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

  // Build dynamic menu items from dynamicModules (from API)
  const dynamicMenuItems: TeacherMenuItem[] = [];
  if (dynamicModules && dynamicModules.length > 0) {
    const iconMap: Record<string, typeof Home> = {
      'fee_management': IndianRupee,
      'classes': BookOpen,
      'examination': FileText,
      'timetable': CalendarDays,
      'student_management': GraduationCap,
      'staff_management': UserCheck,
      'library': Library,
      'transport': Bus,
      'leave_management': CalendarX,
      'communication': MessageSquare,
      'reports': FileBarChart,
      'gallery': Image,
      'certificate_management': Award,
      'digital_diary': BookMarked,
      'expense_income': TrendingUp,
      'front_office': DoorOpen,
      'copy_checking': FileText,
      'event_calendar': CalendarDays,
      'marks': FileText,
      'attendance': Calendar,
    };

    // Map of module keys to their equivalent base item IDs to prevent duplicates
    const moduleToBaseItemMap: Record<string, string[]> = {
      'examination': ['examinations', 'marks'],
      'classes': ['classes', 'my-class'],
      'timetable': ['calendar'],
      'digital_diary': ['homework'],
      'copy_checking': ['copy-checking'],
      'student_management': ['students'],
      'staff_management': ['staff-management'],
      'certificate_management': ['certificates'],
      'leave_management': ['apply-leave', 'my-leaves', 'student-leave-approvals'],
      'communication': ['communication'],
      'library': ['library'],
      'gallery': ['gallery'],
      'reports': ['reports'],
    };

    dynamicModules.forEach((module) => {
      // Check if module has any accessible sub-modules
      const hasAccess = module.sub_modules?.some(sm => sm.has_view_access || sm.has_edit_access);
      if (!hasAccess) return;

      // Skip if already in base items (check by module key mapping)
      const equivalentBaseItems = moduleToBaseItemMap[module.module_key] || [];
      const isAlreadyInBase = filteredTeacherItems.some(item => 
        equivalentBaseItems.includes(item.id) || 
        item.label.toLowerCase() === module.module_name.toLowerCase()
      );
      if (isAlreadyInBase) {
        console.log(`Skipping ${module.module_name} - already in base items`);
        return;
      }

      // Get the first accessible sub-module's route
      const firstAccessibleSubModule = module.sub_modules.find(sm => sm.has_view_access || sm.has_edit_access);
      if (!firstAccessibleSubModule) return;

      const icon = iconMap[module.module_key] || FileText;
      
      dynamicMenuItems.push({
        id: module.module_key,
        label: module.module_name,
        icon: icon,
        path: firstAccessibleSubModule.route,
        permission: null,
        viewPermission: null,
      });
    });
    
    console.log('Built dynamic menu items:', dynamicMenuItems.length, dynamicMenuItems.map(d => ({ id: d.id, label: d.label, path: d.path })));
  }

  // Filter dashboard items based on permissions (only show if teacher has access)
  // Also skip items that overlap with dynamic modules
  const dynamicModuleKeys = dynamicModules.map(m => m.module_key);
  const dynamicModuleNames = dynamicModules.map(m => m.module_name.toLowerCase());
  
  const filteredDashboardItems = dashboardMenuItems.filter(item => {
    // Skip items that are already in teacherBaseItems
    if (teacherBaseItems.some(baseItem => baseItem.id === item.id)) {
      return false;
    }
    // Skip items that are already in dynamicMenuItems
    if (dynamicMenuItems.some(dynItem => dynItem.id === item.id || dynItem.label.toLowerCase() === item.label.toLowerCase())) {
      return false;
    }
    // Skip items that match dynamic module keys or names (e.g., 'fees' when 'fee_management' is active)
    const itemIdLower = item.id.toLowerCase();
    const itemLabelLower = item.label.toLowerCase();
    if (dynamicModuleKeys.some(key => 
      key.includes(itemIdLower) || itemIdLower.includes(key.replace('_', '-')) ||
      key.replace('_management', '') === itemIdLower || key.replace('_', '-') === itemIdLower
    )) {
      return false;
    }
    if (dynamicModuleNames.some(name => 
      name === itemLabelLower || 
      name.replace(' management', '') === itemLabelLower ||
      name.replace('/', ' ') === itemLabelLower.replace('/', ' ')
    )) {
      return false;
    }
    // Check if teacher has permission for this item
    return hasPermission(item);
  });

  // Combine teacher items with dynamic items and filtered dashboard items
  const allMenuItems: MenuItem[] = [
    ...filteredTeacherItems,
    ...dynamicMenuItems,
    ...filteredDashboardItems,
  ];

  // Debug: log all menu items being rendered
  console.log('=== SIDEBAR DEBUG ===');
  console.log('Dynamic modules from API:', dynamicModules.length);
  console.log('Dynamic menu items built:', dynamicMenuItems.length, dynamicMenuItems.map(d => d.id));
  console.log('Filtered teacher items:', filteredTeacherItems.length);
  console.log('Filtered dashboard items:', filteredDashboardItems.length);
  console.log('Total allMenuItems:', allMenuItems.length, allMenuItems.map(m => m.id));

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
              <Link href="/" className="text-xl font-bold text-[#1e3a8a]">
                Edu<span className="text-[#5A7A9A]">-Core</span>
              </Link>
              <div className="hidden sm:block h-6 w-px bg-[#E1E1DB]" />
              <span className="hidden sm:block text-[#1e3a8a] font-semibold">{school?.school_name || teacher.school_code}</span>
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
                      onClick={async () => {
                        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
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

              {/* Sidebar - Dark Green, Modular */}
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                className="fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-70 bg-emerald-950 border-r border-emerald-900 z-50 lg:z-auto overflow-y-auto overflow-x-visible shadow-2xl"
                style={{ width: '280px', background: 'linear-gradient(180deg, #064e3b 0%, #022c22 100%)' }}
              >
                <nav className="p-5 space-y-1.5 overflow-visible">
                  {/* Header Section */}
                  <div className="mb-6 px-4 py-3.5 bg-emerald-900/90 rounded-2xl border border-emerald-800 backdrop-blur-sm">
                    <h3 className="text-white font-bold text-base uppercase tracking-widest">
                      Teacher Portal
                    </h3>
                    <p className="text-emerald-100 text-xs mt-1">Dashboard Menu</p>
                  </div>
                  
                  {/* Grouped Menu Items */}
                  {(() => {
                    const sections = [
                      { id: 'core', label: 'Core', items: ['home'] },
                      { id: 'academics', label: 'Academics', items: ['attendance', 'my-attendance', 'marks', 'examinations', 'my-class', 'classes', 'calendar', 'homework', 'copy-checking', 'timetable'] },
                      { id: 'leave', label: 'Leave & Requests', items: ['apply-leave', 'my-leaves', 'student-leave-approvals', 'leave_management'] },
                      { id: 'info', label: 'Information', items: ['students', 'student_management', 'library', 'certificates', 'gallery', 'communication', 'staff-management', 'transport', 'front_office'] },
                      { id: 'finance', label: 'Finance', items: ['fee_management', 'expense_income'] },
                      { id: 'account', label: 'Account', items: ['institute-info', 'settings', 'change-password'] },
                    ];
                    
                    // Get all item IDs that are in predefined sections
                    const allSectionItemIds = sections.flatMap(s => s.items);
                    
                    // Find any dynamic items not in any section
                    const uncategorizedItems = allMenuItems.filter(item => !allSectionItemIds.includes(item.id));
                    
                    // Add uncategorized section if there are items
                    if (uncategorizedItems.length > 0) {
                      sections.splice(sections.length - 1, 0, {
                        id: 'additional',
                        label: 'Additional Modules',
                        items: uncategorizedItems.map(item => item.id),
                      });
                    }
                    
                    let globalOrder = 0;
                    return sections.map((section) => {
                      const sectionItems = allMenuItems.filter(item => section.items.includes(item.id));
                      // Skip empty sections
                      if (sectionItems.length === 0) return null;
                      const startIndex = globalOrder;
                      globalOrder += sectionItems.length;
                      return (
                    <div key={section.id} className="mb-3">
                      <p className="px-3.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
                        {section.label}
                      </p>
                      {sectionItems.map((item, index) => {
                          const Icon = item.icon;
                          const active = isActive(item.path);
                          const enabled = hasPermission(item);
                          const itemId = item.id;
                          const orderIndex = startIndex + index + 1;

                          return (
                            <div key={itemId} className="relative sidebar-menu-item">
                              <div className="flex items-center gap-1">
                                {enabled ? (
                                  <Link
                                    href={item.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`group flex-1 flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-300 ${
                                      active
                                        ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-700/30 scale-[1.02]'
                                        : 'text-emerald-100 hover:text-white hover:bg-emerald-800/80'
                                    }`}
                                  >
                                    <span
                                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mr-1.5 ${
                                        active
                                          ? 'bg-white text-emerald-700'
                                          : 'bg-emerald-900 text-emerald-200 group-hover:bg-emerald-600 group-hover:text-white'
                                      }`}
                                    >
                                      {orderIndex}
                                    </span>
                                    <div
                                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                                        active
                                          ? 'bg-emerald-700 shadow-lg'
                                          : 'bg-transparent group-hover:bg-emerald-900 group-hover:scale-110 group-hover:shadow-md'
                                      }`}
                                    >
                                      <Icon
                                        size={20}
                                        className={active ? 'text-white' : 'text-emerald-200 group-hover:text-white'}
                                      />
                                    </div>
                                    <span className="font-semibold text-sm tracking-wide flex-1 text-left">
                                      {item.label}
                                    </span>
                                    {active && (
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                                    )}
                                  </Link>
                                ) : (
                                  <div className="group flex-1 flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-300 text-emerald-300/70 opacity-60 cursor-not-allowed relative">
                                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mr-1.5 bg-emerald-900 text-emerald-300">
                                      {orderIndex}
                                    </span>
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-transparent">
                                      <Icon size={20} className="text-emerald-300/70" />
                                    </div>
                                    <span className="font-semibold text-sm tracking-wide flex-1 text-left">
                                      {item.label}
                                    </span>
                                    <Lock size={16} className="text-emerald-300/70" />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                      );
                    });
                  })()}
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

      {/* Help Modal */}
      <HelpModal isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)} schoolCode={''} />
    </div>
  );
}
