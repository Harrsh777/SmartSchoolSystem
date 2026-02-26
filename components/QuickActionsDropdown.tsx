'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  IndianRupee,
  FileText,
  CalendarDays,
  TrendingUp,
  BookMarked,
  Building2,
  Database,
  TrendingDown,
  Shield,
  UserCheck,
  Users,
  Key,
  Calendar,
  UserPlus,
  Upload,
  Camera,
  UsersRound,
  BookOpen,
  Settings,
  CreditCard,
  AlertCircle,
  FileCheck,
  Bus,
  MessageSquare,
  FileBarChart,
  Award,
  ChevronDown,
  Edit,
} from 'lucide-react';

export type QuickActionTab = 'quick' | 'admin' | 'finance' | 'academics' | 'transport' | 'communication' | 'reports';

type MenuItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  subItems?: Array<{
    label: string;
    path: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }>;
};

const quickActionsMenuItems: Record<QuickActionTab, MenuItem[]> = {
  quick: [
    { label: 'Student-wise Fee', path: '/fees/student-wise', icon: IndianRupee, color: '#F97316' },
    { label: 'Create Diary', path: '/homework', icon: BookMarked, color: '#F97316' },
    { label: 'Notice / Circular', path: '/communication', icon: FileText, color: '#F97316' },
    { label: 'Post An Event', path: '/calendar/events', icon: CalendarDays, color: '#F97316' },
    { label: 'Manage Expense', path: '/expense-income', icon: TrendingUp, color: '#F97316' },
    { label: 'Salary Slip', path: '/expense-income', icon: FileText, color: '#F97316' },
  ],
  admin: [
    { label: 'Institute Info', path: '/institute-info', icon: Building2, color: '#F97316', subItems: [] },
    { label: 'Storage Used', path: '/settings', icon: Database, color: '#F97316', subItems: [] },
    { label: 'Download Statistics', path: '/reports', icon: TrendingDown, color: '#F97316', subItems: [] },
    { label: 'Admin Role Management', path: '/settings/roles', icon: Shield, color: '#F97316', subItems: [] },
    { label: 'Staff Management', path: '/staff-management/directory', icon: UserCheck, color: '#F97316', subItems: [
      { label: 'Add Staff', path: '/staff-management/add', icon: UserPlus },
      { label: 'Staff Directory', path: '/staff-management/directory', icon: Users },
      { label: 'Staff Attendance', path: '/staff-management/attendance', icon: Calendar },
      { label: 'Bulk Import Staff', path: '/staff-management/bulk-import', icon: Upload },
      { label: 'Bulk Photo Upload', path: '/staff-management/bulk-photo', icon: Camera },
    ]},
    { label: 'I Card/ Bus Pass/ Admit Card', path: '/certificates', icon: FileText, color: '#F97316', subItems: [] },
    { label: 'Password Management', path: '/password', icon: Key, color: '#F97316', subItems: [] },
    { label: 'Student Management', path: '/students/directory', icon: Users, color: '#F97316', subItems: [
      { label: 'Add Student', path: '/students/add', icon: UserPlus },
      { label: 'Student Directory', path: '/students/directory', icon: Users },
      { label: 'Student Attendance', path: '/students/attendance', icon: Calendar },
      { label: 'Bulk Import Students', path: '/students/bulk-import', icon: Upload },
      { label: 'Student Siblings', path: '/students/siblings', icon: UsersRound },
    ]},
    { label: 'Event & Holiday Management', path: '/calendar/events', icon: CalendarDays, color: '#F97316', subItems: [
      { label: 'Academic Calendar', path: '/calendar/academic', icon: CalendarDays },
      { label: 'Events', path: '/calendar/events', icon: CalendarDays },
    ]},
  ],
  finance: [
    { label: 'Fees', path: '/fees', icon: IndianRupee, color: '#F97316', subItems: [
      { label: 'Fee Configuration', path: '/fees/configuration', icon: Settings },
      { label: 'Fee Basics', path: '/fees/basics', icon: Calendar },
      { label: 'Class-wise Fee', path: '/fees/class-wise', icon: Users },
      { label: 'Student-wise Fee', path: '/fees/student-wise', icon: Users },
      { label: 'Student Class & Fee Schedule Mapper', path: '/fees/mapper', icon: AlertCircle },
      { label: 'Pending cheque', path: '/fees/pending-cheque', icon: CreditCard },
    ]},
    { label: 'Expense/Income', path: '/expense-income', icon: TrendingUp, color: '#F97316', subItems: [] },
  ],
  academics: [
    { label: 'Classes', path: '/classes', icon: BookOpen, color: '#F97316', subItems: [
      { label: 'Classes Overview', path: '/classes/overview', icon: BookOpen },
      { label: 'Modify Classes', path: '/classes/modify', icon: BookOpen },
    ]},
    { label: 'Timetable', path: '/timetable', icon: CalendarDays, color: '#F97316', subItems: [
      { label: 'Timetable Builder', path: '/timetable', icon: CalendarDays },
      { label: 'Class Timetable', path: '/timetable/class', icon: CalendarDays },
      { label: 'Teacher Timetable', path: '/timetable/teacher', icon: CalendarDays },
      { label: 'Group Wise Timetable', path: '/timetable/group-wise', icon: CalendarDays },
    ]},
    { label: 'Examinations', path: '/examinations', icon: FileText, color: '#F97316', subItems: [
      { label: 'Create Examination', path: '/examinations/create', icon: FileText },
      { label: 'Exam Schedule', path: '/examinations', icon: Calendar },
      { label: 'View Marks', path: '/examinations/marks-entry', icon: FileCheck },
    ]},
    { label: 'Digital Diary', path: '/homework', icon: BookMarked, color: '#F97316', subItems: [] },
    { label: 'Copy Checking', path: '/copy-checking', icon: FileText, color: '#F97316', subItems: [] },
    { label: 'Certificate Management', path: '/certificates', icon: Award, color: '#F97316', subItems: [
      { label: 'Certificate Dashboard', path: '/certificates', icon: Award },
      { label: 'New Certificate', path: '/certificates/new', icon: Award },
    ]},
  ],
  transport: [
    { label: 'Transport', path: '/transport', icon: Bus, color: '#2F6FED', subItems: [
      { label: 'Transport Dashboard', path: '/transport/dashboard', icon: Bus },
      { label: 'Vehicles', path: '/transport/vehicles', icon: Bus },
      { label: 'Stops', path: '/transport/stops', icon: Bus },
      { label: 'Routes', path: '/transport/routes', icon: Bus },
      { label: 'Student Route Mapping', path: '/transport/route-students', icon: Users },
    ]},
  ],
  communication: [
    { label: 'Communication', path: '/communication', icon: MessageSquare, color: '#F97316', subItems: [] },
  ],
  reports: [
    { label: 'Report', path: '/reports', icon: FileBarChart, color: '#F97316', subItems: [] },
  ],
};

const TABS: { key: QuickActionTab; label: string }[] = [
  { key: 'quick', label: 'QUICK ACTIONS' },
  { key: 'admin', label: 'ADMIN' },
  { key: 'finance', label: 'FINANCE' },
  { key: 'academics', label: 'ACADEMICS' },
  { key: 'transport', label: 'TRANSPORT' },
  { key: 'communication', label: 'COMMUNICATION' },
  { key: 'reports', label: 'REPORTS' },
];

interface QuickActionsDropdownProps {
  basePath: string;
  onClose: () => void;
  className?: string;
}

export default function QuickActionsDropdown({ basePath, onClose, className = '' }: QuickActionsDropdownProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<QuickActionTab>('quick');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpansion = (label: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const handleItemClick = (path: string) => {
    if (path === '#') return;
    router.push(`${basePath}${path}`);
    onClose();
  };

  const items = quickActionsMenuItems[activeTab] || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-[800px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-white dark:bg-[#1e293b] shadow-xl z-50 overflow-hidden quick-actions-menu-container ${className}`}
    >
      <div className="flex items-center gap-1 border-b border-border px-4 pt-3 pb-2 bg-muted/50 dark:bg-gray-800/50">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-xs font-medium transition-colors relative ${
              activeTab === key
                ? 'text-[#2C3E50] dark:text-[#5A879A]'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#2C3E50] dark:hover:text-[#5A879A]'
            }`}
          >
            {label}
            {activeTab === key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2C3E50] dark:bg-[#4A707A]" />
            )}
            {activeTab === 'quick' && key === 'quick' && (
              <Edit className="absolute -top-1 -right-6 text-[#2F6FED]" size={12} />
            )}
          </button>
        ))}
      </div>

      <div className="p-6 max-h-[600px] overflow-y-auto">
        <div className="grid grid-cols-3 gap-4">
          {items.map((item, index) => {
            const Icon = item.icon;
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedItems.has(item.label);

            return (
              <div key={`${activeTab}-${index}`}>
                <button
                  type="button"
                  onClick={() => {
                    if (hasSubItems) {
                      toggleExpansion(item.label);
                    } else {
                      handleItemClick(item.path);
                    }
                  }}
                  className="w-full p-4 rounded-lg border border-border hover:border-[#2C3E50]/30 dark:hover:border-[#4A707A]/30 hover:shadow-md transition-all flex items-center justify-between group bg-white dark:bg-gray-800/50 text-left"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#2C3E50]/10 dark:bg-[#4A707A]/10 shrink-0">
                      <Icon className="text-[#2C3E50] dark:text-[#5A879A]" size={20} />
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">{item.label}</span>
                  </div>
                  {hasSubItems && (
                    <ChevronDown
                      className={`text-muted-foreground shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      size={16}
                    />
                  )}
                </button>

                {hasSubItems && isExpanded && (
                  <div className="mt-2 ml-4 space-y-2">
                    {item.subItems?.map((subItem, subIndex) => {
                      const SubIcon = subItem.icon;
                      return (
                        <button
                          key={`${subItem.path}-${subIndex}`}
                          type="button"
                          onClick={() => handleItemClick(subItem.path)}
                          className="w-full p-3 bg-muted/50 dark:bg-gray-700/50 rounded-lg border border-border hover:border-[#2C3E50]/30 dark:hover:border-[#4A707A]/30 hover:bg-card transition-all flex items-center gap-3 text-left"
                        >
                          <SubIcon className="text-[#2C3E50] dark:text-[#5A879A]" size={16} />
                          <span className="text-xs font-medium text-foreground">{subItem.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
