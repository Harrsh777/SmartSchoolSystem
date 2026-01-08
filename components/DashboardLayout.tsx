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
  ChevronLeft,
  ChevronRight,
  ChevronUp,
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
  Search,
  ExternalLink,
  Award,
  BookMarked,
  TrendingUp,
  DoorOpen,
  User,
  Lightbulb,
  GraduationCap,
  GripVertical
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { languages } from '@/lib/translations';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import StaffManagementModal from '@/components/staff/StaffManagementModal';
import ClassManagementModal from '@/components/classes/ClassManagementModal';
import TimetableManagementModal from '@/components/timetable/TimetableManagementModal';
import StudentManagementModal from '@/components/students/StudentManagementModal';
import FeeManagementModal from '@/components/fees/FeeManagementModal';
import EventCalendarManagementModal from '@/components/calendar/EventCalendarManagementModal';
import LibraryManagementModal from '@/components/library/LibraryManagementModal';
import TransportManagementModal from '@/components/transport/TransportManagementModal';
import LeaveManagementModal from '@/components/leave/LeaveManagementModal';
import HelpModal from '@/components/help/HelpModal';

interface DashboardLayoutProps {
  children: ReactNode;
  schoolName: string;
}

const menuItems = [
  { icon: Home, label: 'Home', path: '', permission: null, viewPermission: null }, // Always visible
  { icon: Building2, label: 'Institute Info', path: '/institute-info', permission: null, viewPermission: null }, // Always visible
  { icon: Shield, label: 'Admin Role Management', path: '/settings/roles', permission: null, viewPermission: null }, // Admin only - handled separately
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
  { icon: CalendarDays, label: 'Leave Management', path: '/leave', isModal: true, permission: 'manage_leaves', viewPermission: 'view_leaves' },
  { icon: MessageSquare, label: 'Communication', path: '/communication', permission: 'manage_communication', viewPermission: 'view_communication' },
  { icon: FileBarChart, label: 'Report', path: '/reports', permission: 'view_reports', viewPermission: 'view_reports' },
  { icon: Image, label: 'Gallery', path: '/gallery', permission: null, viewPermission: null }, // Visible to all, but only admin can manage
  { icon: Award, label: 'Certificate Management', path: '/certificates', permission: 'manage_certificates', viewPermission: 'view_certificates' },
  { icon: BookMarked, label: 'Digital Diary ', path: '/homework', permission: 'manage_homework', viewPermission: 'view_homework' },
  { icon: TrendingUp, label: 'Expense/income', path: '/expense-income', permission: 'manage_finances', viewPermission: 'view_finances' },
  { icon: DoorOpen, label: 'Front Office management', path: '/front-office', permission: 'manage_gate_pass', viewPermission: 'view_gate_pass' },
  { icon: FileText, label: 'Copy Checking', path: '/copy-checking', permission: 'manage_copy_checking', viewPermission: 'view_copy_checking' },
  { icon: Settings, label: 'Settings', path: '/settings', permission: null, viewPermission: null }, // Always visible
];

// Sortable Menu Item Component - Must be outside the main component to avoid hook order issues
interface SortableMenuItemProps {
  item: typeof menuItems[0];
  index: number;
  sidebarCollapsed: boolean;
  active: boolean;
  subItems: Array<{ label: string; path: string; icon: any }>;
  hasSubItems: boolean;
  isExpanded: boolean;
  basePath: string;
  isActive: (path: string) => boolean;
  toggleSection: (label: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setStaffModalOpen: (open: boolean) => void;
  setClassModalOpen: (open: boolean) => void;
  setTimetableModalOpen: (open: boolean) => void;
  setStudentModalOpen: (open: boolean) => void;
  setFeeModalOpen: (open: boolean) => void;
  setCalendarModalOpen: (open: boolean) => void;
  setLibraryModalOpen: (open: boolean) => void;
  setTransportModalOpen: (open: boolean) => void;
  setLeaveModalOpen: (open: boolean) => void;
  t: (key: string) => string;
}

function SortableMenuItem({
  item,
  index,
  sidebarCollapsed,
  active,
  subItems,
  hasSubItems,
  isExpanded,
  basePath,
  isActive,
  toggleSection,
  setSidebarOpen,
  setStaffModalOpen,
  setClassModalOpen,
  setTimetableModalOpen,
  setStudentModalOpen,
  setFeeModalOpen,
  setCalendarModalOpen,
  setLibraryModalOpen,
  setTransportModalOpen,
  setLeaveModalOpen,
  t,
}: SortableMenuItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isItemDragging,
  } = useSortable({ id: item.path });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isItemDragging ? 0.5 : 1,
  };

  const Icon = item.icon;

  if (item.isModal) {
    const isStaffManagement = item.path === '/staff-management';
    const isClasses = item.path === '/classes';
    const isTimetable = item.path === '/timetable';
    const isStudents = item.path === '/students';
    const isFees = item.path === '/fees';
    const isCalendar = item.path === '/calendar';
    const isLibrary = item.path === '/library';
    const isTransport = item.path === '/transport';
    const isLeave = item.path === '/leave';
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="relative sidebar-menu-item group"
      >
        <div className="flex items-center gap-1">
          {/* Drag Handle */}
          {!sidebarCollapsed && (
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-[#3d5a7f] transition-colors opacity-0 group-hover:opacity-100"
              title="Drag to reorder"
            >
              <GripVertical size={14} className="text-[#B8D4E8] hover:text-[#FFFFFF]" />
            </div>
          )}
          <button
            onClick={() => {
              // If item has sub-items, toggle dropdown
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
                } else if (isLeave) {
                  setLeaveModalOpen(true);
                }
                setSidebarOpen(false);
              }
            }}
            className={`group flex-1 flex ${sidebarCollapsed ? 'flex-col items-center px-2' : 'items-center gap-3 px-2'} py-3 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              active
                ? 'bg-[#60A5FA] text-[#FFFFFF] shadow-xl shadow-[#60A5FA]/20 scale-[1.02]'
                : 'text-[#B8D4E8] hover:text-[#FFFFFF] hover:bg-[#2c4a6b]'
            }`}
          >
            {!sidebarCollapsed && (
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2 ${
                active 
                  ? 'bg-[#3B82F6] text-[#FFFFFF]' 
                  : 'bg-[#2c4a6b] text-[#B8D4E8] group-hover:bg-[#3d5a7f] group-hover:text-[#FFFFFF]'
              }`}>
                {index + 1}
              </span>
            )}
            <div className={`${sidebarCollapsed ? 'w-10 h-10' : 'w-10 h-10'} rounded-xl flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              active 
                ? 'bg-[#3B82F6] shadow-lg' 
                : 'bg-transparent group-hover:bg-[#2c4a6b] group-hover:scale-110 group-hover:shadow-md'
            }`}>
              <Icon size={20} className={active ? 'text-[#FFFFFF]' : 'text-[#9BB8D4] group-hover:text-[#FFFFFF]'} />
            </div>
            <AnimatePresence mode="wait">
              {sidebarCollapsed ? (
                <motion.span 
                  key="collapsed-label"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
                  className="text-[10px] font-medium text-center mt-1 leading-tight text-[#B8D4E8] group-hover:text-[#FFFFFF]"
                >
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
                </motion.span>
              ) : (
                <motion.span 
                  key="expanded-label"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                  className="font-semibold text-sm tracking-wide flex-1 text-left"
                >
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
                </motion.span>
              )}
            </AnimatePresence>
            {!sidebarCollapsed && hasSubItems && (
              <ChevronDown 
                size={16} 
                className={`transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isExpanded ? 'rotate-180' : ''} ${
                  active ? 'text-[#FFFFFF]' : 'text-[#B8D4E8]'
                }`} 
              />
            )}
            {active && !hasSubItems && (
              <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse" />
            )}
          </button>
        </div>
        {hasSubItems && isExpanded && !sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-1 ml-4 overflow-hidden"
          >
            <div className="bg-[#2c4a6b] rounded-lg shadow-lg border border-[#3d5a7f] py-2">
              {subItems.map((subItem) => {
                const SubIcon = subItem.icon;
                const subActive = isActive(subItem.path);
                return (
                  <Link
                    key={`${subItem.path}-${subItem.label}`}
                    href={`${basePath}${subItem.path}`}
                    onClick={() => {
                      setSidebarOpen(false);
                    }}
                    className={`group flex items-center gap-3 px-4 py-2.5 transition-all duration-300 ${
                      subActive
                        ? 'bg-[#3d5a7f] text-[#60A5FA]'
                        : 'text-[#B8D4E8] hover:text-[#FFFFFF] hover:bg-[#3d5a7f]'
                    }`}
                  >
                    <SubIcon size={16} className={subActive ? 'text-[#60A5FA]' : 'text-[#7FA3C4] group-hover:text-[#B8D4E8]'} />
                    <span className="font-medium text-sm tracking-wide flex-1 text-left">
                      {subItem.label}
                    </span>
                    <ExternalLink size={14} className={subActive ? 'text-[#60A5FA]' : 'text-[#7FA3C4] group-hover:text-[#B8D4E8]'} />
                    {subActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#60A5FA] animate-pulse" />
                    )}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    );
  }
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative sidebar-menu-item group"
    >
      <div className="flex items-center gap-1">
        {/* Drag Handle */}
        {!sidebarCollapsed && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-[#3d5a7f] transition-colors opacity-0 group-hover:opacity-100"
            title="Drag to reorder"
          >
            <GripVertical size={14} className="text-[#B8D4E8] hover:text-[#FFFFFF]" />
          </div>
        )}
        
        {hasSubItems ? (
          <button
            onClick={() => toggleSection(item.label)}
            className={`group flex-1 flex ${sidebarCollapsed ? 'flex-col items-center px-2' : 'items-center gap-3 px-2'} py-3 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              active
                ? 'bg-[#60A5FA] text-[#FFFFFF] shadow-xl shadow-[#60A5FA]/20 scale-[1.02]'
                : 'text-[#B8D4E8] hover:text-[#FFFFFF] hover:bg-[#2c4a6b]'
            }`}
          >
            {!sidebarCollapsed && (
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2 ${
                active 
                  ? 'bg-[#3B82F6] text-[#FFFFFF]' 
                  : 'bg-[#2c4a6b] text-[#B8D4E8] group-hover:bg-[#3d5a7f] group-hover:text-[#FFFFFF]'
              }`}>
                {index + 1}
              </span>
            )}
            <div className={`${sidebarCollapsed ? 'w-10 h-10' : 'w-10 h-10'} rounded-xl flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              active 
                ? 'bg-[#3B82F6] shadow-lg' 
                : 'bg-transparent group-hover:bg-[#2c4a6b] group-hover:scale-110 group-hover:shadow-md'
            }`}>
              <Icon size={20} className={active ? 'text-[#FFFFFF]' : 'text-[#9BB8D4] group-hover:text-[#FFFFFF]'} />
            </div>
            <AnimatePresence mode="wait">
              {sidebarCollapsed ? (
                <motion.span 
                  key="collapsed-label"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
                  className="text-[10px] font-medium text-center mt-1 leading-tight text-[#B8D4E8] group-hover:text-[#FFFFFF]"
                >
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
                </motion.span>
              ) : (
                <motion.span 
                  key="expanded-label"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                  className="font-semibold text-sm tracking-wide flex-1 text-left"
                >
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
                </motion.span>
              )}
            </AnimatePresence>
            {!sidebarCollapsed && hasSubItems && (
              <ChevronDown 
                size={16} 
                className={`transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isExpanded ? 'rotate-180' : ''} ${
                  active ? 'text-[#FFFFFF]' : 'text-[#B8D4E8]'
                }`} 
              />
            )}
            {active && !hasSubItems && (
              <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse" />
            )}
          </button>
        ) : (
          <Link
            href={`${basePath}${item.path}`}
            onClick={() => {
              setSidebarOpen(false);
            }}
            className={`group flex-1 flex ${sidebarCollapsed ? 'flex-col items-center px-2' : 'items-center gap-3 px-2'} py-3 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              active
                ? 'bg-[#60A5FA] text-[#FFFFFF] shadow-xl shadow-[#60A5FA]/20 scale-[1.02]'
                : 'text-[#B8D4E8] hover:text-[#FFFFFF] hover:bg-[#2c4a6b]'
            }`}
          >
            {!sidebarCollapsed && (
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2 ${
                active 
                  ? 'bg-[#3B82F6] text-[#FFFFFF]' 
                  : 'bg-[#2c4a6b] text-[#B8D4E8] group-hover:bg-[#3d5a7f] group-hover:text-[#FFFFFF]'
              }`}>
                {index + 1}
              </span>
            )}
            <div className={`${sidebarCollapsed ? 'w-10 h-10' : 'w-10 h-10'} rounded-xl flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              active 
                ? 'bg-[#3B82F6] shadow-lg' 
                : 'bg-transparent group-hover:bg-[#2c4a6b] group-hover:scale-110 group-hover:shadow-md'
            }`}>
              <Icon size={20} className={active ? 'text-[#FFFFFF]' : 'text-[#9BB8D4] group-hover:text-[#FFFFFF]'} />
            </div>
            {sidebarCollapsed ? (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="text-[10px] font-medium text-center mt-1 leading-tight text-[#B8D4E8] group-hover:text-[#FFFFFF]"
              >
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
              </motion.span>
            ) : (
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
            )}
            {active && (
              <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse" />
            )}
          </Link>
        )}
      </div>
      {hasSubItems && isExpanded && !sidebarCollapsed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-1 ml-4 overflow-hidden"
        >
          <div className="bg-[#2c4a6b] rounded-lg shadow-lg border border-[#3d5a7f] py-2">
            {subItems.map((subItem) => {
              const SubIcon = subItem.icon;
              const subActive = isActive(subItem.path);
              return (
                <Link
                  key={`${subItem.path}-${subItem.label}`}
                  href={`${basePath}${subItem.path}`}
                  onClick={() => {
                    setSidebarOpen(false);
                  }}
                  className={`group flex items-center gap-3 px-4 py-2.5 transition-all duration-300 ${
                    subActive
                      ? 'bg-[#3d5a7f] text-[#60A5FA]'
                      : 'text-[#B8D4E8] hover:text-[#FFFFFF] hover:bg-[#3d5a7f]'
                  }`}
                >
                  <SubIcon size={16} className={subActive ? 'text-[#60A5FA]' : 'text-[#7FA3C4] group-hover:text-[#B8D4E8]'} />
                  <span className="font-medium text-sm tracking-wide flex-1 text-left">
                    {subItem.label}
                  </span>
                  <ExternalLink size={14} className={subActive ? 'text-[#60A5FA]' : 'text-[#7FA3C4] group-hover:text-[#B8D4E8]'} />
                  {subActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#60A5FA] animate-pulse" />
                  )}
                </Link>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function DashboardLayout({ children, schoolName }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [timetableModalOpen, setTimetableModalOpen] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const [transportModalOpen, setTransportModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [notificationsDropdownOpen, setNotificationsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [quickSearchDropdownOpen, setQuickSearchDropdownOpen] = useState(false);
  const [menuOrder, setMenuOrder] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Extract school code from pathname
  const schoolCode = pathname.split('/')[2] || '';

  // Get user info from session storage
  const [userInfo, setUserInfo] = useState<{ name?: string; role?: string; id?: string; isAdmin?: boolean }>({});
  const [permissions, setPermissions] = useState<string[]>([]);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get current menu name based on pathname
  const getCurrentMenuName = () => {
    // Remove school code from pathname to get the relative path
    const pathParts = pathname.split('/');
    const relativePath = '/' + pathParts.slice(3).join('/');
    
    // Normalize paths (remove trailing slashes)
    const normalizedPath = relativePath === '/' ? '' : relativePath.replace(/\/$/, '');
    
    // First, find all matching items (both exact and prefix matches)
    const matchingItems = searchableMenuItems
      .filter(item => {
        if (item.path.includes('[') && item.path.includes(']')) {
          // Skip dynamic routes
          return false;
        }
        const normalizedItemPath = item.path === '' ? '' : item.path.replace(/\/$/, '');
        return normalizedPath === normalizedItemPath || 
               (normalizedItemPath !== '' && normalizedPath.startsWith(normalizedItemPath + '/'));
      })
      .sort((a, b) => {
        // Sort by path length (longer paths first) to prioritize sub-items
        return b.path.length - a.path.length;
      });
    
    // Return the first match (which will be the most specific sub-item if available)
    if (matchingItems.length > 0) {
      return matchingItems[0].label;
    }
    
    // Default to "Welcome Back" if on home page or no match
    if (normalizedPath === '' || normalizedPath === '/') {
      return 'Welcome Back';
    }
    
    return 'Welcome Back';
  };

  // Format today's date
  const getTodayDate = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    return today.toLocaleDateString('en-US', options);
  };
  
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

  // Load menu order from localStorage on mount
  useEffect(() => {
    const savedOrder = localStorage.getItem(`menu-order-${schoolCode}`);
    if (savedOrder) {
      try {
        const parsedOrder = JSON.parse(savedOrder);
        setMenuOrder(parsedOrder);
      } catch (error) {
        console.error('Error parsing saved menu order:', error);
      }
    }
  }, [schoolCode]);

  // Filter menu items based on permissions
  // Show ALL menu items regardless of permissions
  const filteredMenuItems = menuItems;

  // Sort menu items based on saved order
  const sortedMenuItems = menuOrder.length > 0
    ? [...filteredMenuItems].sort((a, b) => {
        const indexA = menuOrder.indexOf(a.path);
        const indexB = menuOrder.indexOf(b.path);
        // If both items are in the saved order, sort by their order
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        // If only one is in the saved order, prioritize it
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        // If neither is in the saved order, maintain original order
        return filteredMenuItems.indexOf(a) - filteredMenuItems.indexOf(b);
      })
    : filteredMenuItems;

  // Initialize menu order if not set
  useEffect(() => {
    if (menuOrder.length === 0 && filteredMenuItems.length > 0) {
      const initialOrder = filteredMenuItems.map(item => item.path);
      setMenuOrder(initialOrder);
      localStorage.setItem(`menu-order-${schoolCode}`, JSON.stringify(initialOrder));
    }
  }, [filteredMenuItems, menuOrder.length, schoolCode]);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    setIsDragging(true);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    setIsDragging(false);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = menuOrder.indexOf(active.id as string);
    const newIndex = menuOrder.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = [...menuOrder];
      const [removed] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, removed);
      setMenuOrder(newOrder);
      localStorage.setItem(`menu-order-${schoolCode}`, JSON.stringify(newOrder));
    }
  };

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.profile-dropdown-container')) {
        setProfileDropdownOpen(false);
      }
      if (!target.closest('.notifications-dropdown-container')) {
        setNotificationsDropdownOpen(false);
      }
      if (!target.closest('.language-dropdown-container')) {
        setLanguageDropdownOpen(false);
      }
      if (!target.closest('.search-container')) {
        setSearchDropdownOpen(false);
      }
      if (!target.closest('.quick-search-container')) {
        setQuickSearchDropdownOpen(false);
      }
      if (!target.closest('.sidebar-menu-item')) {
        // Don't close sub-items when clicking outside if sidebar is collapsed
        if (!sidebarCollapsed) {
          // Handle sub-items closing logic if needed
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Define all searchable menu items with sub-items
  const searchableMenuItems = [
    { label: 'Home', path: '', category: 'Management', icon: Home },
    { label: 'Institute Info', path: '/institute-info', category: 'Management', icon: Building2 },
    { label: 'Basic Institute Info', path: '/institute-info', category: 'Management', icon: Building2, parent: 'Institute Info' },
    { label: 'Setup Your School faster', path: '/institute-info/setup', category: 'Management', icon: Building2, parent: 'Institute Info' },
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
    { label: 'Add/Modify Subjects', path: '/classes/subjects', category: 'Classes', icon: BookOpen, parent: 'Classes' },
    
    // Student Management
    { label: 'Student Management', path: '/students', category: 'Student Management', icon: Users },
    { label: 'Add Student', path: '/students/add', category: 'Student Management', icon: Users, parent: 'Student Management' },
    { label: 'Student Directory', path: '/students/directory', category: 'Student Management', icon: Users, parent: 'Student Management' },
    { label: 'Student Attendance', path: '/students/attendance', category: 'Student Management', icon: Users, parent: 'Student Management' },
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
    { label: 'Fee Configuration', path: '/fees/configuration', category: 'Fees', icon: DollarSign, parent: 'Fees' },
    { label: 'Fee Basics', path: '/fees/basics', category: 'Fees', icon: DollarSign, parent: 'Fees' },
    { label: 'Class-wise Fee', path: '/fees/class-wise', category: 'Fees', icon: DollarSign, parent: 'Fees' },
    { label: 'Student-wise Fee', path: '/fees/student-wise', category: 'Fees', icon: DollarSign, parent: 'Fees' },
    { label: 'Student Class & Fee Schedule Mapper', path: '/fees/mapper', category: 'Fees', icon: DollarSign, parent: 'Fees' },
    { label: 'Pending cheque', path: '/fees/pending-cheque', category: 'Fees', icon: DollarSign, parent: 'Fees' },
    
    // Library
    { label: 'Library', path: '/library', category: 'Library', icon: Library },
    { label: 'Library Dashboard', path: '/library/dashboard', category: 'Library', icon: Library, parent: 'Library' },
    { label: 'Library Basics', path: '/library/basics', category: 'Library', icon: Library, parent: 'Library' },
    { label: 'Library Catalogue', path: '/library/catalogue', category: 'Library', icon: Library, parent: 'Library' },
    { label: 'Library Transactions', path: '/library/transactions', category: 'Library', icon: Library, parent: 'Library' },
    
    // Transport
    { label: 'Transport', path: '/transport', category: 'Transport', icon: Bus },
    { label: 'Transport Basics', path: '/transport/basics', category: 'Transport', icon: Bus, parent: 'Transport' },
    { label: 'Vehicles', path: '/transport/vehicles', category: 'Transport', icon: Bus, parent: 'Transport' },
    { label: 'Stops', path: '/transport/stops', category: 'Transport', icon: Bus, parent: 'Transport' },
    { label: 'Routes', path: '/transport/routes', category: 'Transport', icon: Bus, parent: 'Transport' },
    { label: 'Student Route Mapping', path: '/transport/route-students', category: 'Transport', icon: Bus, parent: 'Transport' },
    { label: 'Vehicle Expenses', path: '/transport/expenses', category: 'Transport', icon: Bus, parent: 'Transport' },
    
    // Leave Management
    { label: 'Leave Management', path: '/leave', category: 'Leave Management', icon: CalendarDays },
    { label: 'Leave Basics', path: '/leave/basics', category: 'Leave Management', icon: CalendarDays, parent: 'Leave Management' },
    { label: 'Staff Leave', path: '/leave/staff', category: 'Leave Management', icon: CalendarDays, parent: 'Leave Management' },
    { label: 'Student Leave', path: '/leave/student', category: 'Leave Management', icon: CalendarDays, parent: 'Leave Management' },
    
    // Communication
    { label: 'Communication', path: '/communication', category: 'Communication', icon: MessageSquare },
    
    // Reports
    { label: 'Report', path: '/reports', category: 'Report', icon: FileBarChart },
    
    // Gallery
    { label: 'Gallery', path: '/gallery', category: 'Gallery', icon: Image },
    
    // Certificate Management
    { label: 'Certificate Management', path: '/certificates', category: 'Certificate Management', icon: Award },
    
    // Digital Diary for Homework
    { label: 'Digital Diary', path: '/homework', category: 'Homework', icon: BookMarked },
    
    // Expense/Income
    { label: 'Expense/income', path: '/expense-income', category: 'Finance', icon: TrendingUp },
    
    // Front Office Management
    { label: 'Front Office management', path: '/front-office', category: 'Security', icon: DoorOpen },
    { label: 'Gate pass', path: '/gate-pass', category: 'Security', icon: DoorOpen, parent: 'Front Office management' },
    { label: 'Visitor Management', path: '/visitor-management', category: 'Security', icon: DoorOpen, parent: 'Front Office management' },
    
    // Copy Checking
    { label: 'Copy Checking', path: '/copy-checking', category: 'Academic', icon: FileText },
    
    // Certificate Management
    { label: 'Template Selection', path: '/certificates/templates', category: 'Academic', icon: Award, parent: 'Certificate Management' },
    { label: 'Manage Certificates', path: '/certificates/manage', category: 'Academic', icon: Award, parent: 'Certificate Management' },
    { label: 'Class wise student certificates', path: '/certificates/classwise', category: 'Academic', icon: Award, parent: 'Certificate Management' },
    
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
      // Close expanded menu sections when clicking outside
      if (!target.closest('.sidebar-menu-item')) {
        setExpandedSections({});
      }
    };

    if (languageDropdownOpen || notificationsDropdownOpen || searchDropdownOpen || Object.keys(expandedSections).length > 0) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [languageDropdownOpen, notificationsDropdownOpen, searchDropdownOpen, expandedSections]);

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
      } else if (item.path === '/leave') {
        setLeaveModalOpen(true);
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
    
    // Settings should not have sub-items - it opens a page
    if (mainMenuItem.path === '/settings') {
      return [];
    }
    
    // Front Office management should have sub-items
    if (mainMenuItem.path === '/front-office') {
      return searchableItems.filter(item => item.parent === 'Front Office management');
    }
    
    // Institute Info should have sub-items
    if (mainMenuItem.path === '/institute-info') {
      return searchableItems.filter(item => item.parent === 'Institute Info');
    }
    
    // Classes should have sub-items
    if (mainMenuItem.path === '/classes') {
      return searchableItems.filter(item => item.parent === 'Classes');
    }
    
    // Leave Management should have sub-items
    if (mainMenuItem.path === '/leave') {
      return searchableItems.filter(item => item.parent === 'Leave Management');
    }
    
    return searchableItems.filter((item) => {
      // Don't include the main item itself
      if (item.path === mainMenuItem.path) return false;
      
      // Don't include items that are already main menu items
      const isMainMenuItem = menuItems.some(mi => mi.path === item.path);
      if (isMainMenuItem) return false;
      
      // Filter out dynamic route paths (e.g., [examId]) as they can't be used in Link href
      if (item.path.includes('[') && item.path.includes(']')) {
        return false;
      }
      
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
                className="lg:hidden p-2 rounded-xl hover:bg-[#DBEAFE] transition-all"
              >
                {sidebarOpen ? <X size={24} className="text-[#1e3a8a]" /> : <Menu size={24} className="text-[#1e3a8a]" />}
              </button>
              <Link href="/" className="text-xl font-bold text-[#1e3a8a]">
                Edu<span className="text-[#5A7A9A]">-Yan</span>
              </Link>
              <div className="hidden sm:block h-6 w-px bg-[#E1E1DB]" />
              <span className="hidden sm:block text-[#1e3a8a] font-semibold">{schoolName}</span>
              <div className="hidden md:block h-6 w-px bg-[#E1E1DB]" />
              <span className="hidden md:block text-sm text-[#64748B] font-medium">{getTodayDate()}</span>
              <div className="hidden md:block h-6 w-px bg-[#E1E1DB]" />
              <span className="hidden md:block text-sm text-[#0F172A] font-semibold">{getCurrentMenuName()}</span>
            </div>
            <div className="flex items-center space-x-4">

              {/* Quick Search Button */}
              <div className="relative quick-search-container">
                <button
                  onClick={() => setQuickSearchDropdownOpen(!quickSearchDropdownOpen)}
                  className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
                  title="Quick Search"
                >
                  <div className="w-10 h-10 rounded-full bg-[#EAF1FF] flex items-center justify-center">
                    <Search className="text-[#2F6FED]" size={18} />
                </div>
                  <span className="text-[10px] font-medium text-[#64748B]">Search</span>
                </button>
                
                {quickSearchDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 top-12 w-64 bg-[#FFFFFF] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-[#E5E7EB] z-50 overflow-hidden backdrop-blur-sm"
                  >
                    <div className="p-2">
                      <button
                        onClick={() => {
                          router.push(`${basePath}/students/directory`);
                          setQuickSearchDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F8FAFC] rounded-lg transition-all border border-transparent hover:border-[#E5E7EB]"
                      >
                        <div className="w-10 h-10 rounded-lg bg-[#EAF1FF] flex items-center justify-center flex-shrink-0">
                          <div className="relative">
                            <GraduationCap className="text-[#2F6FED]" size={20} />
                            <Search className="absolute -bottom-1 -right-1 text-[#2F6FED] bg-white rounded-full p-0.5" size={12} />
                        </div>
                              </div>
                        <span className="text-sm font-medium text-[#0F172A]">Quick Student Search</span>
                      </button>
                      
                                  <button
                        onClick={() => {
                          router.push(`${basePath}/staff-management/directory`);
                          setQuickSearchDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F8FAFC] rounded-lg transition-all border border-transparent hover:border-[#E5E7EB] mt-2"
                      >
                        <div className="w-10 h-10 rounded-lg bg-[#EAF1FF] flex items-center justify-center flex-shrink-0">
                          <div className="relative">
                            <User className="text-[#2F6FED]" size={20} />
                            <Search className="absolute -bottom-1 -right-1 text-[#2F6FED] bg-white rounded-full p-0.5" size={12} />
                                    </div>
                                    </div>
                        <span className="text-sm font-medium text-[#0F172A]">Quick Staff Search</span>
                                  </button>
                            </div>
                  </motion.div>
                )}
              </div>

              {/* Quick Actions Button */}
              <div className="relative quick-actions-menu-container">
                <button
                  id="quick-actions-navbar-button"
                  className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
                  aria-label="Quick Actions"
                  title="Quick Actions"
                >
                  <div className="w-10 h-10 rounded-full bg-[#EAF1FF] flex items-center justify-center">
                    <ChevronUp className="text-[#2F6FED]" size={18} />
                  </div>
                  <span className="text-[10px] font-medium text-[#64748B]">Quick</span>
                </button>
              </div>

              {/* Notifications Button */}
              <div className="relative notifications-dropdown-container">
                <button
                  onClick={() => setNotificationsDropdownOpen(!notificationsDropdownOpen)}
                  className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
                  title="Notifications"
                >
                  <div className="w-10 h-10 rounded-full bg-[#EAF1FF] flex items-center justify-center">
                    <Bell className="text-[#2F6FED]" size={18} />
                  </div>
                  <span className="text-[10px] font-medium text-[#64748B]">Notifications</span>
                </button>

                {notificationsDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-80 bg-[#FFFFFF] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-[#E1E1DB] z-50 overflow-hidden backdrop-blur-sm"
                  >
                    <div className="p-4 border-b border-[#E1E1DB]">
                      <h3 className="font-semibold text-[#1e3a8a]">Notifications</h3>
                    </div>
                    <div className="p-8 text-center">
                      <Bell className="mx-auto mb-3 text-[#7FA3C4]" size={32} />
                      <p className="text-[#5A7A9A] font-medium">No new notifications are there</p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Help Button */}
              <button
                onClick={() => setHelpModalOpen(true)}
                className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
                title="Get Help"
              >
                <div className="w-10 h-10 rounded-full bg-[#EAF1FF] flex items-center justify-center">
                  <HelpCircle className="text-[#2F6FED]" size={18} />
                </div>
                <span className="text-[10px] font-medium text-[#64748B]">Help</span>
              </button>

              {/* Language Selector */}
              <div className="relative language-dropdown-container">
                <button
                  onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                  className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
                >
                  <div className="w-10 h-10 rounded-full bg-[#EAF1FF] flex items-center justify-center">
                    <Languages className="text-[#2F6FED]" size={18} />
                  </div>
                  <span className="text-[10px] font-medium text-[#64748B]">Translate</span>
                </button>
                
                {languageDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 top-12 w-48 bg-[#FFFFFF] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-[#E5E7EB] z-50 overflow-hidden backdrop-blur-sm"
                  >
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                          setLanguageDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-[#DBEAFE] transition-all flex items-center gap-3 ${
                          language === lang.code ? 'bg-[#60A5FA] font-semibold' : ''
                        }`}
                      >
                        <span className="text-xl">{lang.flag}</span>
                        <span className="flex-1 text-[#1e3a8a]">{lang.name}</span>
                        {language === lang.code && (
                          <div className="w-2 h-2 rounded-full bg-[#1e3a8a]" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Settings Button */}
              <Link
                href={`${basePath}/settings`}
                className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
                title="Settings"
              >
                <div className="w-10 h-10 rounded-full bg-[#EAF1FF] flex items-center justify-center">
                  <Settings className="text-[#2F6FED]" size={18} />
                </div>
                <span className="text-[10px] font-medium text-[#64748B]">Settings</span>
              </Link>

              {/* Profile Dropdown */}
              <div className="relative profile-dropdown-container">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
                >
                  <div className="w-10 h-10 rounded-full bg-[#EAF1FF] flex items-center justify-center">
                    <User className="text-[#2F6FED]" size={18} />
                  </div>
                  <span className="text-[10px] font-medium text-[#64748B]">Profile</span>
                </button>

                <AnimatePresence>
                  {profileDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 top-12 w-64 bg-[#FFFFFF] rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-[#E5E7EB] z-50 overflow-hidden backdrop-blur-sm"
                    >
                    {/* My Profile Section */}
                    <div className="px-4 py-3 flex items-center gap-3 border-b border-[#E1E1DB]">
                      <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                        <User size={18} className="text-white" />
                      </div>
                      <span className="text-orange-500 font-semibold">My Profile</span>
                    </div>

                    {/* Activity Section */}
                    <div className="px-4 py-3">
                      <h3 className="font-bold text-black mb-2">Activity</h3>
                      
                      {/* Updates */}
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          // Handle updates click
                        }}
                        className="w-full flex items-center gap-3 px-2 py-2 hover:bg-[#F5F5F5] rounded-lg transition-colors"
                      >
                        <Lightbulb size={20} className="text-yellow-500" />
                        <span className="flex-1 text-left text-black">Updates</span>
                        <div className="flex items-center gap-2">
                          <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">24</span>
                          <ChevronDown size={16} className="text-gray-400 rotate-[-90deg]" />
                        </div>
                      </button>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-[#E1E1DB]"></div>

                    {/* Logout */}
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F5F5F5] transition-colors"
                    >
                      <DoorOpen size={20} className="text-red-500" />
                      <span className="text-red-500 font-medium">Logout</span>
                    </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
                animate={{ 
                  x: 0,
                  width: sidebarCollapsed ? 100 : 280
                }}
                exit={{ x: -280 }}
                transition={{ 
                  duration: 0.4, 
                  ease: [0.4, 0, 0.2, 1],
                  width: { 
                    duration: 0.4, 
                    ease: [0.4, 0, 0.2, 1],
                    type: "tween"
                  },
                  x: {
                    duration: 0.4,
                    ease: [0.4, 0, 0.2, 1]
                  }
                }}
                className="fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] bg-[#1e3a8a] border-r border-[#2c4a6b] z-50 lg:z-auto overflow-y-auto overflow-x-hidden shadow-2xl"
                style={{ 
                  background: 'linear-gradient(180deg, #1e3a8a 0%, #0f1b2e 100%)',
                  willChange: 'width'
                }}
              >
                <nav className={`p-3 space-y-1.5 overflow-visible transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${sidebarCollapsed ? 'px-2' : ''}`}>
                  {/* Search Menu Section */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      <AnimatePresence mode="wait">
                        {!sidebarCollapsed ? (
                          <motion.div 
                            key="search-input"
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: sidebarCollapsed ? 0 : 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                            className="relative search-container flex-1"
                          >
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#B8D4E8] size-4" />
                              <input
                                type="text"
                                placeholder="Search menu..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setSearchDropdownOpen(true)}
                                className="w-full pl-10 pr-4 py-2.5 bg-[#2c4a6b] border border-[#3d5a7f] rounded-lg text-[#FFFFFF] placeholder-[#B8D4E8] text-sm focus:outline-none focus:ring-2 focus:ring-[#60A5FA] focus:border-transparent transition-all"
                              />
                          </div>
                          
                          {/* Search Results Dropdown */}
                          {searchDropdownOpen && filteredSearchResults.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="absolute top-full left-0 right-0 mt-2 bg-[#2c4a6b] border border-[#3d5a7f] rounded-lg shadow-xl max-h-96 overflow-y-auto z-50"
                            >
                              <div className="p-2">
                                {filteredSearchResults.map((item, idx) => {
                                  const ItemIcon = item.icon;
                                  return (
                                    <Link
                                      key={`${item.path}-${idx}`}
                                      href={`${basePath}${item.path}`}
                                      onClick={() => {
                                        setSearchQuery('');
                                        setSearchDropdownOpen(false);
                                        setSidebarOpen(false);
                                      }}
                                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#3d5a7f] rounded-lg transition-colors group"
                                    >
                                      <div className="w-8 h-8 rounded-lg bg-[#1e3a8a] flex items-center justify-center flex-shrink-0 group-hover:bg-[#60A5FA] transition-colors">
                                        <ItemIcon size={16} className="text-[#B8D4E8] group-hover:text-white" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-[#FFFFFF] truncate">
                                          {item.label}
                                        </div>
                                        {item.parent && (
                                          <div className="text-xs text-[#B8D4E8] truncate">
                                            {item.parent} • {item.category}
                                          </div>
                                        )}
                                      </div>
                                      <ChevronRight size={14} className="text-[#B8D4E8] group-hover:text-[#60A5FA] flex-shrink-0" />
                                    </Link>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                          
                          {searchDropdownOpen && searchQuery.trim() && filteredSearchResults.length === 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="absolute top-full left-0 right-0 mt-2 bg-[#2c4a6b] border border-[#3d5a7f] rounded-lg shadow-xl p-4 z-50"
                            >
                              <p className="text-sm text-[#B8D4E8] text-center">No results found</p>
                            </motion.div>
                          )}
                          </motion.div>
                        ) : (
                          <motion.button
                            key="search-icon"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.3 }}
                            onClick={() => setSidebarCollapsed(false)}
                            className="flex-1 p-2 rounded-lg bg-[#2c4a6b] hover:bg-[#3d5a7f] text-white transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex items-center justify-center"
                            title="Expand Sidebar"
                          >
                            <Search size={18} />
                          </motion.button>
                        )}
                      </AnimatePresence>
                      
                      {/* Collapse/Expand Button */}
                      <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="p-1.5 rounded-lg bg-[#2c4a6b] hover:bg-[#3d5a7f] text-white transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex items-center justify-center flex-shrink-0"
                        title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                      >
                        {sidebarCollapsed ? (
                          <ChevronRight size={14} />
                        ) : (
                          <ChevronLeft size={14} />
                        )}
                      </button>
                        </div>
                  </div>
                  
                  {/* Menu Items */}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={sortedMenuItems.map(item => item.path)}
                      strategy={verticalListSortingStrategy}
                    >
                      {sortedMenuItems.map((item, index) => {
                    const active = isActive(item.path);
                    const subItems = getSubItems(item);
                    const hasSubItems = subItems.length > 0;
                    const isExpanded = expandedSections[item.label] || false;
                    
                    return (
                      <SortableMenuItem
                        key={item.path}
                        item={item}
                        index={index}
                        sidebarCollapsed={sidebarCollapsed}
                        active={active}
                        subItems={subItems}
                        hasSubItems={hasSubItems}
                        isExpanded={isExpanded}
                        basePath={basePath}
                        isActive={isActive}
                        toggleSection={toggleSection}
                        setSidebarOpen={setSidebarOpen}
                        setStaffModalOpen={setStaffModalOpen}
                        setClassModalOpen={setClassModalOpen}
                        setTimetableModalOpen={setTimetableModalOpen}
                        setStudentModalOpen={setStudentModalOpen}
                        setFeeModalOpen={setFeeModalOpen}
                        setCalendarModalOpen={setCalendarModalOpen}
                        setLibraryModalOpen={setLibraryModalOpen}
                        setTransportModalOpen={setTransportModalOpen}
                        setLeaveModalOpen={setLeaveModalOpen}
                        t={t}
                      />
                                );
                              })}
                    </SortableContext>
                    <DragOverlay>
                      {activeDragId ? (
                        <div className="opacity-50">
                          <div className="p-3 bg-[#2c4a6b] rounded-xl border border-[#3d5a7f]">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#3d5a7f] flex items-center justify-center">
                                <GripVertical size={16} className="text-[#B8D4E8]" />
                            </div>
                              <span className="text-sm font-semibold text-[#B8D4E8]">
                                {sortedMenuItems.find(item => item.path === activeDragId)?.label}
                              </span>
                      </div>
                          </div>
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
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
      
      {/* Calendar Management Modal */}
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
      
      {/* Leave Management Modal */}
      <LeaveManagementModal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
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

