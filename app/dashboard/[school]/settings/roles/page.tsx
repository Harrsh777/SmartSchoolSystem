'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  Shield,
  Users,
  CheckCircle,
  X,
  Plus,
  Save,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  Folder,
  ArrowLeft,
  Lock,
  Search,
  Filter,
} from 'lucide-react';
import React from 'react';

interface Permission {
  id: string;
  key: string;
  name: string;
  description: string | null;
  module: string | null;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions?: Permission[];
}

interface StaffMember {
  id: string;
  staff_id: string;
  full_name: string;
  email: string | null;
  designation: string | null;
  school_code: string;
  roles: Array<{ id: string; name: string; description: string | null }>;
}

export default function RoleManagementPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [staffFilter, setStaffFilter] = useState<'all' | 'teaching' | 'non-teaching' | 'rest'>('all');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  
  // For module-based permissions modal
  interface SubModule {
    id: string;
    name: string;
    view_access: boolean;
    edit_access: boolean;
    supports_view_access: boolean;
    supports_edit_access: boolean;
  }
  interface Module {
    id: string;
    name: string;
    sub_modules: SubModule[];
  }
  interface Category {
    id: string;
    name: string;
    description: string | null;
  }
  const [modules, setModules] = useState<Module[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [loadingModules, setLoadingModules] = useState(false);
  const [modalError, setModalError] = useState('');

  // Comprehensive list of all modules and submodules from the sidebar (22 modules only)
  const allSidebarModules: Module[] = [
    {
      id: 'home',
      name: 'Home',
      sub_modules: [
        { id: 'home-dashboard', name: 'Dashboard', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: false },
        { id: 'home-main', name: 'Home', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: false }
      ]
    },
    {
      id: 'institute-info',
      name: 'Institute Info',
      sub_modules: [
        { id: 'basic-institute-info', name: 'Basic Institute Info', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'setup-school-faster', name: 'Setup Your School faster', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true }
      ]
    },
    {
      id: 'admin-role-management',
      name: 'Admin Role Management',
      sub_modules: [
        { id: 'staff-access-control', name: 'Staff Access Control', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'role-management', name: 'Role Management', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true }
      ]
    },
    {
      id: 'password-manager',
      name: 'Password Manager',
      sub_modules: [
        { id: 'password-manager-main', name: 'Password Manager', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true }
      ]
    },
    {
      id: 'staff-management',
      name: 'Staff Management',
      sub_modules: [
        { id: 'staff-directory', name: 'Staff Directory', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: false },
        { id: 'add-staff', name: 'Add Staff', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'bulk-staff-import', name: 'Bulk Staff import', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'bulk-photo-upload-staff', name: 'Bulk Photo Upload', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'staff-attendance', name: 'Staff Attendance', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'student-attendance-marking-report', name: 'Student Attendance Marking Report', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: false },
        { id: 'quick-staff-search', name: 'Quick Staff Search', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: false },
        { id: 'bulk-import-staff', name: 'Bulk Import Staff', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true }
      ]
    },
    {
      id: 'classes',
      name: 'Classes',
      sub_modules: [
        { id: 'classes-overview', name: 'Classes Overview', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: false },
        { id: 'modify-classes', name: 'Modify Classes', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'subject-teachers', name: 'Subject Teachers', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'add-modify-subjects', name: 'Add/Modify Subjects', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true }
      ]
    },
    {
      id: 'student-management',
      name: 'Student Management',
      sub_modules: [
        { id: 'add-student', name: 'Add student', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'bulk-import-students', name: 'Bulk Student Import', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'bulk-photo-upload-students', name: 'Bulk Photo Upload', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'student-optional-subject-allocation', name: 'Student Optional Subject Allocation', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'student-directory', name: 'Student Directory', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: false },
        { id: 'new-admission-report', name: 'New Admission Report', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: false },
        { id: 'student-attendance', name: 'Student Attendance', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'student-report', name: 'Student Report', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: false },
        { id: 'student-info-update-settings', name: 'Student Info. Update Settings on App', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'student-form-config', name: 'Student Form Config', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'student-sibling', name: 'Student Sibling', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'student-attendance-report', name: 'Student Attendance Report', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: false },
        { id: 'ptm-attendance', name: 'PTM Attendance', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'quick-student-search', name: 'Quick Student Search', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: false },
        { id: 'bulk-import-students-alt', name: 'Bulk Import Students', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'student-siblings', name: 'Student Siblings', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true }
      ]
    },
    {
      id: 'timetable',
      name: 'Timetable',
      sub_modules: [
        { id: 'class-timetable', name: 'Class Timetable', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'teacher-timetable', name: 'Teacher Timetable', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: false },
        { id: 'group-wise-timetable', name: 'Group Wise Timetable', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: false }
      ]
    },
    {
      id: 'event-calendar',
      name: 'Event/Calendar',
      sub_modules: [
        { id: 'academic-calendar', name: 'Academic Calendar', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'events', name: 'Events', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true }
      ]
    },
    {
      id: 'examinations',
      name: 'Examinations',
      sub_modules: [
        { id: 'create-examination', name: 'Create Examination', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'grade-scale', name: 'Grade Scale', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'marks-entry', name: 'Marks Entry', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'offline-tests', name: 'Offline Tests', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'report-card', name: 'Report Card', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: false },
        { id: 'report-card-template', name: 'Report Card Template', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'examination-reports', name: 'Examination Reports', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: false }
      ]
    },
    {
      id: 'fees',
      name: 'Fees',
      sub_modules: [
        { id: 'fee-setup', name: 'Fee Setup', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'fee-components', name: 'Fee Components', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'fee-schedules', name: 'Fee Schedules', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'class-fee-assignment', name: 'Class Fee Assignment', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'fee-collection', name: 'Fee Collection', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'student-fee-statements', name: 'Student Fee Statements', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: false },
        { id: 'discounts-fines', name: 'Discounts & Fines', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'fee-reports', name: 'Fee Reports', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: false },
        { id: 'fee-configuration', name: 'Fee Configuration', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'fee-basics', name: 'Fee Basics', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'class-wise-fee', name: 'Class-wise Fee', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'student-wise-fee', name: 'Student-wise Fee', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'student-class-fee-schedule-mapper', name: 'Student Class & Fee Schedule Mapper', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'pending-cheque', name: 'Pending cheque', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'fee-dashboard', name: 'Fee Dashboard', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: false },
        { id: 'fee-heads', name: 'Fee Heads', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'fee-structures', name: 'Fee Structures', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'collect-payment', name: 'Collect Payment', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true }
      ]
    },
    {
      id: 'library',
      name: 'Library',
      sub_modules: [
        { id: 'library-dashboard', name: 'Library Dashboard', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: false },
        { id: 'library-basics', name: 'Library Basics', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'library-catalogue', name: 'Library Catalogue', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'library-transactions', name: 'Library Transactions', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true }
      ]
    },
    {
      id: 'transport',
      name: 'Transport',
      sub_modules: [
        { id: 'transport-basics', name: 'Transport Basics', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'vehicles', name: 'Vehicles', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'stops', name: 'Stops', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'routes', name: 'Routes', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'student-route-mapping', name: 'Student Route Mapping', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'vehicle-expenses', name: 'Vehicle Expenses', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true }
      ]
    },
    {
      id: 'leave-management',
      name: 'Leave Management',
      sub_modules: [
        { id: 'leave-basics', name: 'Leave Basics', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'student-staff-leave', name: 'Student Leave, Staff Leave', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'send-notification-staff-leave', name: 'Send Notification\'s On Leave Applied By Staff', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'send-notification-student-leave', name: 'Send Notification\'s On Leave Applied By Student', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'leave-dashboard', name: 'Leave Dashboard', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true }
      ]
    },
    {
      id: 'communication',
      name: 'Communication',
      sub_modules: [
        { id: 'notice-circular', name: 'Notice/Circular', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'survey', name: 'Survey', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'incident-log', name: 'Incident Log', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'child-activity', name: 'Child Activity', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'whatsapp', name: 'Whatsapp', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'communication-main', name: 'Communication', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true }
      ]
    },
    {
      id: 'report',
      name: 'Report',
      sub_modules: [
        { id: 'report-main', name: 'Report', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: false }
      ]
    },
    {
      id: 'gallery',
      name: 'Gallery',
      sub_modules: [
        { id: 'post-an-event', name: 'Post an Event', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'gallery-main', name: 'Gallery', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true }
      ]
    },
    {
      id: 'certificate-management',
      name: 'Certificate Management',
      sub_modules: [
        { id: 'template-selection', name: 'Template Selection', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'manage-certificate', name: 'Manage Certificate', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'classwise-student-certificate', name: 'Classwise student certificate', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'certificate-send-to-student', name: 'Certificate Send to Student', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'manage-certificates', name: 'Manage Certificates', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'class-wise-student-certificates', name: 'Class wise student certificates', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true }
      ]
    },
    {
      id: 'digital-diary',
      name: 'Digital Diary',
      sub_modules: [
        { id: 'create-diary', name: 'Create Diary', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'daily-dairy-report', name: 'Daily Dairy Report', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: false },
        { id: 'daily-dairy-report-all', name: 'Daily Dairy Report(all classes or all batches)', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: false },
        { id: 'digital-diary-main', name: 'Digital Diary', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true }
      ]
    },
    {
      id: 'expense-income',
      name: 'Expense/income',
      sub_modules: [
        { id: 'expense-income-main', name: 'Expense/income', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true }
      ]
    },
    {
      id: 'front-office-management',
      name: 'Front Office management',
      sub_modules: [
        { id: 'front-office-dashboard', name: 'Front Office Dashboard', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: false },
        { id: 'gate-pass', name: 'Gate pass', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true },
        { id: 'visitor-management', name: 'Visitor Management', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true }
      ]
    },
    {
      id: 'copy-checking',
      name: 'Copy Checking',
      sub_modules: [
        { id: 'copy-checking-main', name: 'Copy Checking', view_access: false, edit_access: false, supports_view_access: true, supports_edit_access: true }
      ]
    }
  ];

  // Helper function to merge API modules with sidebar modules
  // Only includes the 22 sidebar modules, merges API permission data into them
  const mergeModulesWithSidebar = (apiModules: Module[]): Module[] => {
    const mergedModules: Module[] = [];
    const apiModulesMap = new Map<string, Module>();
    
    // Create a map of API modules by name for quick lookup
    apiModules.forEach(module => {
      apiModulesMap.set(module.name.toLowerCase(), module);
    });
    
    // Process ONLY the sidebar modules (22 modules)
    allSidebarModules.forEach(sidebarModule => {
      const apiModule = apiModulesMap.get(sidebarModule.name.toLowerCase());
      
      if (apiModule) {
        // Merge: use API module ID and permission data, but use sidebar submodule structure
        const subModulesMap = new Map<string, SubModule>();
        const apiSubModulesMap = new Map<string, SubModule>();
        
        // Create map of API submodules by name for quick lookup
        apiModule.sub_modules.forEach(sub => {
          apiSubModulesMap.set(sub.name.toLowerCase(), sub);
        });
        
        // Use sidebar submodules as base, merge API permission data if available
        sidebarModule.sub_modules.forEach(sidebarSub => {
          const apiSub = apiSubModulesMap.get(sidebarSub.name.toLowerCase());
          if (apiSub) {
            // Use API submodule data (includes UUID ID and permission states)
            subModulesMap.set(sidebarSub.name.toLowerCase(), apiSub);
          } else {
            // Use sidebar submodule (no API data yet)
            subModulesMap.set(sidebarSub.name.toLowerCase(), sidebarSub);
          }
        });
        
        mergedModules.push({
          id: apiModule.id,
          name: apiModule.name,
          sub_modules: Array.from(subModulesMap.values())
        });
      } else {
        // Module not in API, use sidebar module as-is
        mergedModules.push(sidebarModule);
      }
    });
    
    // Do NOT add API modules not in sidebar - only use the 22 sidebar modules
    return mergedModules;
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.filter-dropdown-container')) {
        setFilterDropdownOpen(false);
      }
    };

    if (filterDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [filterDropdownOpen]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Normalize school code to uppercase
      const normalizedSchoolCode = schoolCode.toUpperCase();
      console.log('Fetching staff for school:', normalizedSchoolCode);
      
      const [staffRes, rolesRes, permissionsRes] = await Promise.all([
        fetch(`/api/rbac/staff/with-roles?school_code=${normalizedSchoolCode}`),
        fetch('/api/rbac/roles'),
        fetch('/api/rbac/permissions'),
      ]);

      const staffData = await staffRes.json();
      const rolesData = await rolesRes.json();
      const permissionsData = await permissionsRes.json();

      if (staffRes.ok) {
        if (staffData.data && Array.isArray(staffData.data)) {
          setStaff(staffData.data);
          console.log(`Loaded ${staffData.data.length} staff members for school ${normalizedSchoolCode}`);
          if (staffData.data.length === 0) {
            setError(`No staff members found for school ${normalizedSchoolCode}. Please add staff members first through Staff Management.`);
          }
        } else {
          console.warn('No staff data received or invalid format:', staffData);
          setStaff([]);
          setError('No staff data received. Please check if staff members exist in the database.');
        }
      } else {
        console.error('Failed to fetch staff:', staffData);
        const errorMsg = staffData.details 
          ? `${staffData.error}: ${staffData.details}`
          : (staffData.error || 'Failed to load staff members');
        setError(errorMsg);
        setStaff([]);
      }

      if (rolesRes.ok && rolesData.data) {
        setRoles(rolesData.data);
        console.log(`Loaded ${rolesData.data.length} roles`);
      } else {
        console.error('Failed to fetch roles:', rolesData);
        if (!rolesData.data) {
          setError((prev) => prev ? `${prev}. Also failed to load roles.` : 'Failed to load roles.');
        }
      }

      if (permissionsRes.ok && permissionsData.data) {
        setPermissions(permissionsData.data);
        console.log(`Loaded ${permissionsData.data.length} permissions`);
      } else {
        console.error('Failed to fetch permissions:', permissionsData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const handleManageRoles = async (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    setLoadingModules(true);
    setRoleModalOpen(true);
    setModalError('');
    
    try {
      // Fetch staff permissions (modules/sub-modules) - use staff UUID
      const response = await fetch(`/api/rbac/staff-permissions/${staffMember.id}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        // Merge API modules with sidebar modules to ensure all are shown
        const apiModules = result.data.modules || [];
        const mergedModules = mergeModulesWithSidebar(apiModules);
        setModules(mergedModules);
        setCategories(result.data.categories || []);
        if (result.data.category) {
          setSelectedCategory(result.data.category);
        } else if (result.data.categories && result.data.categories.length > 0) {
          setSelectedCategory(result.data.categories[0]);
        }
      } else {
        // Even if API fails, show sidebar modules
        setModules(allSidebarModules);
        setModalError(result.error || 'Failed to load permissions');
      }
    } catch (err) {
      console.error('Error fetching staff permissions:', err);
      // On error, still show sidebar modules
      setModules(allSidebarModules);
      setModalError('Failed to load permissions');
    } finally {
      setLoadingModules(false);
    }
  };
  
  const handleToggleViewAccess = (moduleId: string, subModuleId: string) => {
    setModules((prevModules) =>
      prevModules.map((module) => {
        if (module.id === moduleId) {
          return {
            ...module,
            sub_modules: module.sub_modules.map((subModule) => {
              if (subModule.id === subModuleId) {
                return {
                  ...subModule,
                  view_access: !subModule.view_access,
                };
              }
              return subModule;
            }),
          };
        }
        return module;
      })
    );
  };

  const handleToggleEditAccess = (moduleId: string, subModuleId: string) => {
    setModules((prevModules) =>
      prevModules.map((module) => {
        if (module.id === moduleId) {
          return {
            ...module,
            sub_modules: module.sub_modules.map((subModule) => {
              if (subModule.id === subModuleId) {
                return {
                  ...subModule,
                  edit_access: !subModule.edit_access,
                };
              }
              return subModule;
            }),
          };
        }
        return module;
      })
    );
  };
  
  const handleToggleModuleViewAccess = (moduleId: string) => {
    setModules((prevModules) =>
      prevModules.map((module) => {
        if (module.id === moduleId) {
          const allEnabled = module.sub_modules
            .filter((sm) => sm.supports_view_access)
            .every((sm) => sm.view_access);
          const newValue = !allEnabled;
          return {
            ...module,
            sub_modules: module.sub_modules.map((subModule) => {
              if (subModule.supports_view_access) {
                return {
                  ...subModule,
                  view_access: newValue,
                };
              }
              return subModule;
            }),
          };
        }
        return module;
      })
    );
  };
  
  const handleToggleModuleEditAccess = (moduleId: string) => {
    setModules((prevModules) =>
      prevModules.map((module) => {
        if (module.id === moduleId) {
          const allEnabled = module.sub_modules
            .filter((sm) => sm.supports_edit_access)
            .every((sm) => sm.edit_access);
          const newValue = !allEnabled;
          return {
            ...module,
            sub_modules: module.sub_modules.map((subModule) => {
              if (subModule.supports_edit_access) {
                return {
                  ...subModule,
                  edit_access: newValue,
                };
              }
              return subModule;
            }),
          };
        }
        return module;
      })
    );
  };
  
  const handleCategoryChange = async (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (category && selectedStaff) {
      setSelectedCategory(category);
      setLoadingModules(true);
      setModalError('');
      
      try {
        // Fetch staff permissions for new category - use staff UUID
        const response = await fetch(`/api/rbac/staff-permissions/${selectedStaff.id}?category_id=${categoryId}`);
        const result = await response.json();
        
        if (response.ok && result.data) {
          // Merge API modules with sidebar modules to ensure all are shown
          const apiModules = result.data.modules || [];
          const mergedModules = mergeModulesWithSidebar(apiModules);
          setModules(mergedModules);
        } else {
          // Even if API fails, show sidebar modules
          setModules(allSidebarModules);
          setModalError(result.error || 'Failed to load permissions');
        }
      } catch (err) {
        console.error('Error fetching staff permissions:', err);
        // On error, still show sidebar modules
        setModules(allSidebarModules);
        setModalError('Failed to load permissions');
      } finally {
        setLoadingModules(false);
      }
    }
  };

  const handleSaveStaffRoles = async () => {
    if (!selectedStaff || !selectedCategory) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Get current user for assigned_by
      const currentUser = sessionStorage.getItem('staff');
      let assignedBy = null;
      if (currentUser) {
        try {
          const userData = JSON.parse(currentUser);
          assignedBy = userData.id;
        } catch {
          // Ignore parse errors
        }
      }

      // Only include submodules with valid UUIDs (database IDs)
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      const permissions = modules.flatMap((module) =>
        module.sub_modules
          .filter((subModule) => uuidRegex.test(subModule.id)) // Only include valid UUIDs
          .map((subModule) => ({
            sub_module_id: subModule.id,
            view_access: subModule.view_access,
            edit_access: subModule.edit_access,
          }))
      );

      const response = await fetch(`/api/rbac/staff-permissions/${selectedStaff.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: selectedCategory.id,
          permissions: permissions,
          assigned_by: assignedBy,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Permissions updated successfully!');
        setRoleModalOpen(false);
        setSelectedStaff(null);
        setModules([]);
        fetchData(); // Refresh data
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to update permissions');
      }
    } catch (err) {
      console.error('Error saving permissions:', err);
      setError('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      setError('Role name is required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/rbac/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoleName,
          description: newRoleDescription || null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Role created successfully!');
        setNewRoleName('');
        setNewRoleDescription('');
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorMessage = result.details 
          ? `${result.error}: ${result.details}` 
          : (result.error || 'Failed to create role');
        setError(errorMessage);
        console.error('Role creation error:', result);
      }
    } catch (err) {
      console.error('Error creating role:', err);
      setError('Failed to create role');
    } finally {
      setSaving(false);
    }
  };

  const handleEditRolePermissions = (role: Role) => {
    setSelectedRole(role);
    const rolePermissionIds = new Set(
      role.permissions?.map((p) => p.id) || []
    );
    setSelectedPermissions(rolePermissionIds);
    setPermissionModalOpen(true);
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRole) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const permissionIds = Array.from(selectedPermissions);

      const response = await fetch(`/api/rbac/roles/${selectedRole.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission_ids: permissionIds }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Permissions assigned successfully!');
        setPermissionModalOpen(false);
        setSelectedRole(null);
        setSelectedPermissions(new Set());
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to assign permissions');
      }
    } catch (err) {
      console.error('Error saving permissions:', err);
      setError('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role? This will remove it from all staff members.')) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await fetch(`/api/rbac/roles/${roleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Role deleted successfully!');
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to delete role');
      }
    } catch (err) {
      console.error('Error deleting role:', err);
      setError('Failed to delete role');
    } finally {
      setSaving(false);
    }
  };

  // Filter staff by type
  const getStaffByType = (type: 'all' | 'teaching' | 'non-teaching' | 'rest') => {
    const teachingRoles = ['Teacher', 'Principal', 'Vice Principal', 'Head Teacher'];
    const nonTeachingRoles = ['Accountant', 'Clerk', 'Librarian', 'Admin Staff', 'Admin', 'Super Admin'];
    const supportingRoles = ['Driver', 'Support Staff', 'Helper', 'Security'];

    return staff.filter(member => {
      const designation = (member.designation || '').toLowerCase();
      const role = designation;

      switch (type) {
        case 'teaching':
          return teachingRoles.some(r => designation.includes(r.toLowerCase()) || role.includes(r.toLowerCase()));
        case 'non-teaching':
          return nonTeachingRoles.some(r => designation.includes(r.toLowerCase()) || role.includes(r.toLowerCase()));
        case 'rest':
          return !teachingRoles.some(r => designation.includes(r.toLowerCase()) || role.includes(r.toLowerCase())) &&
                 !nonTeachingRoles.some(r => designation.includes(r.toLowerCase()) || role.includes(r.toLowerCase())) &&
                 !supportingRoles.some(r => designation.includes(r.toLowerCase()) || role.includes(r.toLowerCase()));
        default:
          return true;
      }
    });
  };

  // Filter and search staff
  const filteredStaff = getStaffByType(staffFilter).filter(member => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      member.full_name?.toLowerCase().includes(query) ||
      member.staff_id?.toLowerCase().includes(query) ||
      member.email?.toLowerCase().includes(query) ||
      member.designation?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Shield className="text-indigo-600" size={32} />
          Role & Permission Management
        </h1>
        <p className="text-gray-600 mt-2">
          Manage staff roles and permissions for {schoolCode}
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <CheckCircle size={20} />
          {success}
        </motion.div>
      )}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <AlertCircle size={20} />
          {error}
        </motion.div>
      )}

      {/* Staff List - Full Width */}
      <Card className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-[#0F172A] flex items-center gap-2">
              <Users size={28} className="text-[#2F6FED]" />
              All Staff Members ({filteredStaff.length})
            </h2>
          </div>
          
          {/* Search and Filter Bar */}
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B] size-4" />
              <input
                type="text"
                placeholder="Search staff by name, ID, email, or designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-[#0F172A] placeholder-[#64748B] text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6FED] focus:border-transparent transition-all"
              />
            </div>
            
            {/* Filter Dropdown */}
            <div className="relative filter-dropdown-container">
              <button
                onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                className="px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-[#0F172A] text-sm font-medium hover:bg-[#F1F5F9] transition-colors flex items-center gap-2"
              >
                <Filter size={16} className="text-[#64748B]" />
                <span>
                  {staffFilter === 'all' && 'All Staff'}
                  {staffFilter === 'teaching' && 'Teaching'}
                  {staffFilter === 'non-teaching' && 'Non-Teaching'}
                  {staffFilter === 'rest' && 'Rest of Staff'}
                </span>
              </button>
              
              {filterDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-10">
                  <div className="py-1">
                    {(['all', 'teaching', 'non-teaching', 'rest'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => {
                          setStaffFilter(filter);
                          setFilterDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          staffFilter === filter
                            ? 'bg-[#EAF1FF] text-[#2F6FED] font-medium'
                            : 'text-[#0F172A] hover:bg-[#F1F5F9]'
                        }`}
                      >
                        {filter === 'all' && 'All Staff'}
                        {filter === 'teaching' && 'Teaching'}
                        {filter === 'non-teaching' && 'Non-Teaching'}
                        {filter === 'rest' && 'Rest of Staff'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {staff.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 text-lg font-semibold mb-2">No staff members found</p>
            <p className="text-gray-500 text-sm mb-4">
              Staff members from school {schoolCode} will appear here once they are added to the system.
            </p>
            <p className="text-gray-400 text-xs">
              You can add staff members through the Staff Management section.
            </p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto text-[#64748B] mb-4" size={48} />
            <p className="text-[#0F172A] text-lg font-semibold mb-2">No staff members found</p>
            <p className="text-[#64748B] text-sm">
              {searchQuery ? 'Try adjusting your search or filter criteria.' : 'No staff members match the selected filter.'}
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Staff Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Designation</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Staff ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Assigned Roles</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStaff.map((member) => (
                  <motion.tr
                    key={member.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{member.full_name}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{member.email || 'No email'}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{member.designation || 'No designation'}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{member.staff_id}</div>
                    </td>
                    <td className="px-4 py-4">
                      {member.roles.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {member.roles.map((role) => (
                            <span
                              key={role.id}
                              className="px-3 py-1 bg-[#EAF1FF] text-[#2F6FED] text-xs rounded-full font-medium"
                            >
                              {role.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No roles assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleManageRoles(member)}
                        className="border-[#2F6FED] text-[#2F6FED] hover:bg-[#EAF1FF]"
                      >
                        <Edit size={14} className="mr-2" />
                        Assign Roles
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Role Assignment Modal - Module-based Permissions */}
      {roleModalOpen && selectedStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl flex flex-col"
            style={{ width: '26cm', height: '18cm', maxHeight: '90vh', maxWidth: '90vw' }}
          >
            {/* Header with Buttons */}
            <div className="p-4 border-b border-gray-200">
              {/* Top Row: Staff Name and Action Buttons */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-teal-700">{selectedStaff.full_name}</h2>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRoleModalOpen(false);
                      setSelectedStaff(null);
                      setModules([]);
                      setSelectedCategory(null);
                    }}
                    className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                  >
                    <ArrowLeft size={16} className="mr-2" />
                    ← BACK
                  </Button>
                  <Button
                    onClick={handleSaveStaffRoles}
                    disabled={saving || !selectedCategory}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Folder size={16} className="mr-2" />
                        UPDATE
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Second Row: Device Guard and Category */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Device Guard Settings Button (Premium) */}
                  <button className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm text-sm">
                    <Shield size={16} className="text-gray-600" />
                    <span className="text-xs font-medium text-gray-700">DEVICE GUARD SETTINGS</span>
                    <span className="px-1.5 py-0.5 bg-green-500 text-white text-xs font-semibold rounded">PREMIUM</span>
                  </button>
                </div>
                {/* Category Selector */}
                <div className="flex items-center gap-2">
                  <Folder size={14} className="text-gray-400" />
                  <select
                    value={selectedCategory?.id || ''}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {modalError && (
              <div className="mx-4 mt-2 p-2 bg-red-50 border border-red-200 text-red-800 text-xs rounded">
                {modalError}
              </div>
            )}

            {/* Permissions Table */}
            <div className="overflow-y-auto flex-1" style={{ height: 'calc(18cm - 200px)' }}>
              {loadingModules ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : modules.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  No modules found
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-orange-100 border-b border-orange-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">MODULE</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">SUB MODULE</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900">VIEW ACCESS</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900">EDIT ACCESS</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {modules.map((module, modIdx) => (
                      <React.Fragment key={module.id}>
                        {/* Module Row */}
                        <tr className="bg-gray-50">
                          <td className="px-3 py-2 text-xs font-semibold text-gray-900">
                            {modIdx + 1}. {module.name}
                          </td>
                          <td className="px-3 py-2"></td>
                          <td className="px-3 py-2 text-center">
                            {module.sub_modules.some((sm) => sm.supports_view_access) && (
                              <button
                                onClick={() => handleToggleModuleViewAccess(module.id)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                  module.sub_modules
                                    .filter((sm) => sm.supports_view_access)
                                    .every((sm) => sm.view_access)
                                    ? 'bg-orange-500'
                                    : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                    module.sub_modules
                                      .filter((sm) => sm.supports_view_access)
                                      .every((sm) => sm.view_access)
                                      ? 'translate-x-5'
                                      : 'translate-x-0.5'
                                  }`}
                                />
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {module.sub_modules.some((sm) => sm.supports_edit_access) && (
                              <button
                                onClick={() => handleToggleModuleEditAccess(module.id)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                  module.sub_modules
                                    .filter((sm) => sm.supports_edit_access)
                                    .every((sm) => sm.edit_access)
                                    ? 'bg-orange-500'
                                    : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                    module.sub_modules
                                      .filter((sm) => sm.supports_edit_access)
                                      .every((sm) => sm.edit_access)
                                      ? 'translate-x-5'
                                      : 'translate-x-0.5'
                                  }`}
                                />
                              </button>
                            )}
                          </td>
                        </tr>
                        {/* Sub-module Rows */}
                        {module.sub_modules.map((subModule, subIdx) => (
                          <tr key={subModule.id} className="hover:bg-gray-50">
                            <td className="px-3 py-1"></td>
                            <td className="px-3 py-1 text-xs text-gray-700">
                              {modIdx + 1}.{subIdx + 1} {subModule.name}
                            </td>
                            <td className="px-3 py-1 text-center">
                              {subModule.supports_view_access ? (
                                <button
                                  onClick={() => handleToggleViewAccess(module.id, subModule.id)}
                                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                    subModule.view_access ? 'bg-orange-500' : 'bg-gray-300'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                      subModule.view_access ? 'translate-x-5' : 'translate-x-0.5'
                                    }`}
                                  />
                                </button>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-3 py-1 text-center">
                              {subModule.supports_edit_access ? (
                                <button
                                  onClick={() => handleToggleEditAccess(module.id, subModule.id)}
                                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                    subModule.edit_access ? 'bg-orange-500' : 'bg-gray-300'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                      subModule.edit_access ? 'translate-x-5' : 'translate-x-0.5'
                                    }`}
                                  />
                                </button>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Create Role Modal */}
      {permissionModalOpen && !selectedRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Create New Role</h2>
                <button
                  onClick={() => {
                    setPermissionModalOpen(false);
                    setNewRoleName('');
                    setNewRoleDescription('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role Name *
                </label>
                <Input
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g., Fee Manager"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Describe what this role does..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setPermissionModalOpen(false);
                  setNewRoleName('');
                  setNewRoleDescription('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateRole} disabled={saving || !newRoleName.trim()}>
                {saving ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={18} className="mr-2" />
                    Create Role
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Role Permissions Modal */}
      {permissionModalOpen && selectedRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  Assign Permissions to {selectedRole.name}
                </h2>
                <button
                  onClick={() => {
                    setPermissionModalOpen(false);
                    setSelectedRole(null);
                    setSelectedPermissions(new Set());
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {/* Group permissions by module */}
              {Object.entries(
                permissions.reduce((acc, perm) => {
                  const moduleName = perm.module || 'Other';
                  if (!acc[moduleName]) acc[moduleName] = [];
                  acc[moduleName].push(perm);
                  return acc;
                }, {} as Record<string, Permission[]>)
              ).map(([moduleName, modulePermissions]) => (
                <div key={moduleName} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">{moduleName}</h3>
                  <div className="space-y-2">
                    {modulePermissions.map((perm) => {
                      const isSelected = selectedPermissions.has(perm.id);
                      return (
                        <label
                          key={perm.id}
                          className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSet = new Set(selectedPermissions);
                              if (e.target.checked) {
                                newSet.add(perm.id);
                              } else {
                                newSet.delete(perm.id);
                              }
                              setSelectedPermissions(newSet);
                            }}
                            className="mt-1 w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">{perm.name}</span>
                            {perm.description && (
                              <p className="text-sm text-gray-600 mt-1">{perm.description}</p>
                            )}
                            <span className="text-xs text-gray-500 mt-1 block">
                              Key: {perm.key}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setPermissionModalOpen(false);
                  setSelectedRole(null);
                  setSelectedPermissions(new Set());
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveRolePermissions} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} className="mr-2" />
                    Save Permissions
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

