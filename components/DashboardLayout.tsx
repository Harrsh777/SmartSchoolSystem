'use client';

import { ReactNode, useState, useEffect, useMemo } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import MenuSkeletonLoader from '@/components/MenuSkeletonLoader';
import Link from 'next/link';
import NextImage from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  Users, 
  UserCheck, 
  BookOpen, 
  FileText, 
  IndianRupee, 
  Library, 
  Bus, 
  MessageSquare, 
  Settings,
  Settings2,
  Menu,
  X,
  CalendarDays,
  ChevronRight,
  ChevronUp,
  FileBarChart,
  Building2,
  Shield,
  Key,
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
  GraduationCap,
  GripVertical,
  ClipboardList,
  BarChart3,
  Tag,
  Receipt,
  CreditCard,
  ArrowLeft,
  Download,
  CalendarRange
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
import ClassManagementModal from '@/components/classes/ClassManagementModal';
import TimetableManagementModal from '@/components/timetable/TimetableManagementModal';
import StudentManagementModal from '@/components/students/StudentManagementModal';
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
  { icon: CalendarRange, label: 'Academic Year Management', path: '/academic-year-management', permission: null, viewPermission: null }, // Admin only
  { icon: Key, label: 'Password Manager', path: '/password', permission: 'manage_passwords', viewPermission: 'manage_passwords' },
  { icon: UserCheck, label: 'Staff Management', path: '/staff-management', permission: 'manage_staff', viewPermission: 'view_staff' },
  { icon: BookOpen, label: 'Classes', path: '/classes', isModal: true, permission: 'manage_classes', viewPermission: 'view_classes' },
  { icon: Users, label: 'Student Management', path: '/students', isModal: true, permission: 'manage_students', viewPermission: 'view_students' },
  { icon: CalendarDays, label: 'Timetable', path: '/timetable', isModal: true, permission: 'manage_timetable', viewPermission: 'view_timetable' },
  { icon: CalendarDays, label: 'Event/Calendar', path: '/calendar', isModal: true, permission: 'manage_events', viewPermission: 'view_events' },
  { icon: FileText, label: 'Examinations', path: '/examinations', permission: 'manage_exams', viewPermission: 'view_exams' },
  { icon: Award, label: 'Report Card', path: '/report-card', permission: 'manage_exams', viewPermission: 'view_exams' },
  { icon: GraduationCap, label: 'Marks', path: '/marks', permission: 'manage_exams', viewPermission: 'view_exams' },
  { icon: IndianRupee, label: 'Fees', path: '/fees', permission: 'manage_fees', viewPermission: 'view_fees' },
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
];

// Sortable Menu Item Component - Must be outside the main component to avoid hook order issues
interface SortableMenuItemProps {
  item: typeof menuItems[0];
  index: number;
  sidebarCollapsed: boolean;
  active: boolean;
  subItems: Array<{ label: string; path: string; icon: React.ComponentType<{ size?: number; className?: string }> }>;
  hasSubItems: boolean;
  isExpanded: boolean;
  basePath: string;
  isActive: (path: string) => boolean;
  toggleSection: (label: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setClassModalOpen: (open: boolean) => void;
  setTimetableModalOpen: (open: boolean) => void;
  setStudentModalOpen: (open: boolean) => void;
  setCalendarModalOpen: (open: boolean) => void;
  setLibraryModalOpen: (open: boolean) => void;
  setTransportModalOpen: (open: boolean) => void;
  setLeaveModalOpen: (open: boolean) => void;
  isDragEnabled: boolean;
  t: (key: string) => string;
}

// Default icon for sub-items that don't have one
const DefaultSubItemIcon = ChevronRight;

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
  setClassModalOpen,
  setTimetableModalOpen,
  setStudentModalOpen,
  setCalendarModalOpen,
  setLibraryModalOpen,
  setTransportModalOpen,
  setLeaveModalOpen,
  isDragEnabled,
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
    const isClasses = item.path === '/classes';
    const isTimetable = item.path === '/timetable';
    const isStudents = item.path === '/students';
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
          {/* Drag Handle - only show when drag is enabled */}
          {!sidebarCollapsed && isDragEnabled && (
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1.5 rounded hover:bg-white/10 transition-colors opacity-70 group-hover:opacity-100 flex-shrink-0 touch-none"
              title="Drag to reorder"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
              }}
            >
              <GripVertical size={16} className="text-slate-300 hover:text-white pointer-events-none" />
            </div>
          )}
          <button
            onClick={() => {
              // If item has sub-items, toggle dropdown
              if (hasSubItems) {
                toggleSection(item.label);
              } else {
                // If no sub-items, open modal as before
                if (isClasses) {
                  setClassModalOpen(true);
                } else if (isTimetable) {
                  setTimetableModalOpen(true);
                } else if (isStudents) {
                  setStudentModalOpen(true);
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
                ? 'bg-gradient-to-r from-slate-600 to-slate-500 text-white shadow-lg scale-[1.02]'
                : 'text-[#E2E8F0] hover:text-white hover:bg-[rgba(255,255,255,0.08)] dark:hover:bg-[rgba(255,255,255,0.08)]'
            }`}
          >
            {!sidebarCollapsed && (
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mr-1.5 ${
                active 
                
                  ? 'bg-white/20 text-white' 
                  : 'bg-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.08)] text-[#E2E8F0] group-hover:bg-[rgba(255,255,255,0.12)] group-hover:text-white'
              }`}>
                {index + 1}
              </span>
            )}
            <div className={`${sidebarCollapsed ? 'w-8 h-8' : 'w-8 h-8'} rounded-xl flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              active 
                ? 'bg-white/20 shadow-lg' 
                : 'bg-transparent group-hover:bg-white/10 group-hover:scale-110 group-hover:shadow-md'
            }`}>
              <Icon size={16} className={active ? 'text-white' : 'text-slate-300 group-hover:text-white'} />
            </div>
            <AnimatePresence mode="wait">
              {sidebarCollapsed ? (
                <motion.span 
                  key="collapsed-label"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
                  className="text-[10px] font-medium text-center mt-1 leading-tight text-slate-300 group-hover:text-white"
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
                   item.path === '/report-card' ? t('nav.report_card') :
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
                  className="font-semibold text-xs tracking-wide flex-1 text-left"
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
                   item.path === '/report-card' ? t('nav.report_card') :
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
                  active ? 'text-white' : 'text-slate-300'
                }`} 
              />
            )}
            {active && !hasSubItems && (
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
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
            <div className="bg-white/10 rounded-lg shadow-lg border border-slate-600/40 py-2">
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
                        ? 'bg-slate-500 text-white'
                        : 'text-[#E2E8F0] hover:text-white hover:bg-[rgba(255,255,255,0.08)] dark:hover:bg-[rgba(255,255,255,0.08)]'
                    }`}
                  >
                    <SubIcon size={16} className={subActive ? 'text-white' : 'text-[#E2E8F0] group-hover:text-white'} />
                    <span className="font-medium text-xs tracking-wide flex-1 text-left">
                      {subItem.label}
                    </span>
                    <ExternalLink size={14} className={subActive ? 'text-white' : 'text-[#E2E8F0] group-hover:text-white'} />
                    {subActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
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
          {/* Drag Handle - only show when drag is enabled */}
          {!sidebarCollapsed && isDragEnabled && (
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1.5 rounded hover:bg-white/10 transition-colors opacity-70 group-hover:opacity-100 flex-shrink-0 touch-none"
              title="Drag to reorder"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
              }}
            >
              <GripVertical size={16} className="text-slate-300 hover:text-white pointer-events-none" />
            </div>
          )}
        
        {hasSubItems ? (
          <button
            onClick={() => toggleSection(item.label)}
            className={`group flex-1 flex ${sidebarCollapsed ? 'flex-col items-center px-2' : 'items-center gap-3 px-2'} py-3 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              active
                ? 'bg-gradient-to-r from-slate-600 to-slate-500 text-white shadow-lg scale-[1.02]'
                : 'text-[#E2E8F0] hover:text-white hover:bg-[rgba(255,255,255,0.08)] dark:hover:bg-[rgba(255,255,255,0.08)]'
            }`}
          >
            {!sidebarCollapsed && (
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mr-1.5 ${
                active 
                  ? 'bg-white/20 text-white' 
                  : 'bg-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.08)] text-[#E2E8F0] group-hover:bg-[rgba(255,255,255,0.12)] group-hover:text-white'
              }`}>
                {index + 1}
              </span>
            )}
            <div className={`${sidebarCollapsed ? 'w-8 h-8' : 'w-8 h-8'} rounded-xl flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              active 
                ? 'bg-white/20 shadow-lg' 
                : 'bg-transparent group-hover:bg-white/10 group-hover:scale-110 group-hover:shadow-md'
            }`}>
              <Icon size={16} className={active ? 'text-white' : 'text-slate-300 group-hover:text-white'} />
            </div>
            <AnimatePresence mode="wait">
              {sidebarCollapsed ? (
                <motion.span 
                  key="collapsed-label"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
                  className="text-[10px] font-medium text-center mt-1 leading-tight text-slate-300 group-hover:text-white"
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
                   item.path === '/report-card' ? t('nav.report_card') :
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
                  className="font-semibold text-xs tracking-wide flex-1 text-left"
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
                   item.path === '/report-card' ? t('nav.report_card') :
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
                  active ? 'text-white' : 'text-slate-300'
                }`} 
              />
            )}
            {active && !hasSubItems && (
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
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
                ? 'bg-gradient-to-r from-slate-600 to-slate-500 text-white shadow-lg scale-[1.02]'
                : 'text-[#E2E8F0] hover:text-white hover:bg-[rgba(255,255,255,0.08)] dark:hover:bg-[rgba(255,255,255,0.08)]'
            }`}
          >
            {!sidebarCollapsed && (
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mr-1.5 ${
                active 
                  ? 'bg-white/20 text-white' 
                  : 'bg-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.08)] text-[#E2E8F0] group-hover:bg-[rgba(255,255,255,0.12)] group-hover:text-white'
              }`}>
                {index + 1}
              </span>
            )}
            <div className={`${sidebarCollapsed ? 'w-8 h-8' : 'w-8 h-8'} rounded-xl flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              active 
                ? 'bg-white/20 shadow-lg' 
                : 'bg-transparent group-hover:bg-white/10 group-hover:scale-110 group-hover:shadow-md'
            }`}>
              <Icon size={16} className={active ? 'text-white' : 'text-slate-300 group-hover:text-white'} />
            </div>
            {sidebarCollapsed ? (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                  className="text-[10px] font-medium text-center mt-1 leading-tight text-slate-300 group-hover:text-white"
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
              <span className="font-semibold text-xs tracking-wide flex-1 text-left">
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
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
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
          <div className="bg-white/10 rounded-lg shadow-lg border border-slate-600/40 py-2">
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
                      ? 'bg-white/10 text-slate-200'
                      : 'text-[#E2E8F0] hover:text-white hover:bg-[rgba(255,255,255,0.08)] dark:hover:bg-[rgba(255,255,255,0.08)]'
                  }`}
                >
                  <SubIcon size={16} className={subActive ? 'text-white' : 'text-[#E2E8F0] group-hover:text-white'} />
                  <span className="font-medium text-xs tracking-wide flex-1 text-left">
                    {subItem.label}
                  </span>
                  <ExternalLink size={14} className={subActive ? 'text-white' : 'text-[#E2E8F0] group-hover:text-white'} />
                  {subActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
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
  const sidebarCollapsed = false; // Sidebar is always expanded (collapse button removed)
  const [isDesktop, setIsDesktop] = useState(false);
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [timetableModalOpen, setTimetableModalOpen] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const [attendanceReportModalOpen, setAttendanceReportModalOpen] = useState(false);
  const [reportFromDate, setReportFromDate] = useState('');
  const [reportToDate, setReportToDate] = useState('');
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [transportModalOpen, setTransportModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [notificationsDropdownOpen, setNotificationsDropdownOpen] = useState(false);
  const [, setSearchQuery] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [menuOrder, setMenuOrder] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [isDragEnabled, setIsDragEnabled] = useState(false);
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [sidebarSchoolLogo, setSidebarSchoolLogo] = useState<string | null>(null);
  // Extract school code from pathname
  const schoolCode = pathname.split('/')[2] || '';

  useEffect(() => {
    // Check if drag mode is enabled from localStorage
    const dragEnabled = localStorage.getItem(`drag-enabled-${schoolCode}`);
    setIsDragEnabled(dragEnabled === 'true');
  }, [schoolCode]);

  useEffect(() => {
    if (!schoolCode) return;
    fetch(`/api/schools/info?school_code=${encodeURIComponent(schoolCode)}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.data?.logo_url) setSidebarSchoolLogo(result.data.logo_url);
        else setSidebarSchoolLogo(null);
      })
      .catch(() => setSidebarSchoolLogo(null));
  }, [schoolCode]);

  // Get user info from session storage
  const [userInfo, setUserInfo] = useState<{ name?: string; role?: string; id?: string; isAdmin?: boolean }>({});
  const [permissions, setPermissions] = useState<string[]>([]);
  const [userInfoLoaded, setUserInfoLoaded] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [dynamicMenuItems, setDynamicMenuItems] = useState<Array<{
    module_name: string;
    module_key: string;
    display_order: number;
    sub_modules: Array<{
      name: string;
      key: string;
      route: string;
      has_view_access: boolean;
      has_edit_access: boolean;
    }>;
  }>>([]);

  // DnD Sensors - Improved for better drag handling
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Reduced from 8 for more responsive dragging
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
    const storedStaff = sessionStorage.getItem('staff');
    
    if (storedSchool) {
      try {
        const school = JSON.parse(storedSchool);
        setUserInfo({
          name: school.school_name || 'School Admin',
          role: 'School Admin',
          isAdmin: true, // Principal/Admin has full access
        });
        setUserInfoLoaded(true);
      } catch {
        // Ignore parse errors
        setUserInfoLoaded(true);
      }
    } else if (storedStudent) {
      try {
        const student = JSON.parse(storedStudent);
        setUserInfo({
          name: student.student_name || 'Student',
          role: 'Student',
        });
        setUserInfoLoaded(true);
      } catch {
        // Ignore parse errors
        setUserInfoLoaded(true);
      }
    } else if (storedStaff) {
      try {
        const staff = JSON.parse(storedStaff);
        const isAdmin = staff.role?.toLowerCase().includes('principal') || 
                       staff.role?.toLowerCase().includes('admin');
        setUserInfo({
          name: staff.full_name || 'Staff',
          role: staff.role || 'Staff',
          id: staff.id,
          isAdmin,
        });
        setUserInfoLoaded(true);
        // Fetch dynamic menu and permissions for staff member
        if (staff.id && !isAdmin) {
          // Set loading state immediately before fetching to prevent showing incomplete menu
          setMenuLoading(true);
          fetchStaffMenu(staff.id);
          fetchStaffPermissions(staff.id);
        }
      } catch {
        // Ignore parse errors
        setUserInfoLoaded(true);
      }
    } else if (storedTeacher) {
      try {
        const teacher = JSON.parse(storedTeacher);
        setUserInfo({
          name: teacher.full_name || 'Teacher',
          role: 'Teacher',
          id: teacher.id,
        });
        setUserInfoLoaded(true);
        // Fetch dynamic menu and permissions for staff member
        if (teacher.id) {
          // Set loading state immediately before fetching to prevent showing incomplete menu
          setMenuLoading(true);
          fetchStaffMenu(teacher.id);
          fetchStaffPermissions(teacher.id);
        }
      } catch {
        // Ignore parse errors
        setUserInfoLoaded(true);
      }
    } else {
      // No user info found in this tab (e.g. opened dashboard in a new tab).
      // Since this layout is only used for /dashboard/[school] and middleware
      // already ensures only school admins/principals can reach it, treat this
      // as a school admin session so that the full menu is visible.
      setUserInfo({
        name: schoolName || 'School Admin',
        role: 'School Admin',
        isAdmin: true,
      });
      setUserInfoLoaded(true);
    }
  }, [schoolName]);

  const fetchStaffMenu = async (staffId: string) => {
    try {
      setMenuLoading(true);
      const response = await fetch(`/api/staff/${staffId}/menu`);
      const result = await response.json();
      if (response.ok && result.data) {
        console.log('Fetched staff menu items:', result.data.length, 'modules');
        setDynamicMenuItems(result.data || []);
      } else {
        console.error('Failed to fetch staff menu:', result.error || 'Unknown error');
        // Set empty array to ensure only default items show, not all menuItems
        setDynamicMenuItems([]);
      }
    } catch (error) {
      console.error('Error fetching dynamic menu:', error);
      // Set empty array to ensure only default items show, not all menuItems
      setDynamicMenuItems([]);
    } finally {
      setMenuLoading(false);
    }
  };

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

  // Map dynamic menu items to menuItems format
  // Memoize this to avoid recalculating on every render
  const getDynamicMenuItems = useMemo(() => {
    if (!userInfo.id || userInfo.isAdmin || dynamicMenuItems.length === 0) {
      return [];
    }

    // Icon mapping for modules
    const iconMap: Record<string, typeof Home> = {
      'student_management': Users,
      'fee_management': IndianRupee,
      'staff_management': UserCheck,
      'examination': FileText,
      'marks': GraduationCap,
      'library': Library,
      'transport': Bus,
      'timetable': CalendarDays,
      'leave_management': CalendarDays,
      'communication': MessageSquare,
      'reports': FileBarChart,
      'gallery': Image,
      'certificate_management': Award,
      'digital_diary': BookMarked,
      'expense_income': TrendingUp,
      'front_office': DoorOpen,
      'copy_checking': FileText,
    };

    const dynamicItems: Array<typeof menuItems[0]> = [];
    
    dynamicMenuItems.forEach((module) => {
      // Only add modules that have sub-modules with view access
      const accessibleSubModules = module.sub_modules.filter(sm => sm.has_view_access);
      if (accessibleSubModules.length === 0) return;

      // Use the first sub-module's route as the main path, or create a base path
      const mainSubModule = accessibleSubModules[0];
      const basePath = mainSubModule.route.replace('/dashboard/[school]', '') || `/${module.module_key}`;
      
      dynamicItems.push({
        icon: iconMap[module.module_key] || FileText,
        label: module.module_name,
        path: basePath,
        permission: null,
        viewPermission: null,
        // isModal is optional, don't include it for dynamic items
      });
    });

    return dynamicItems;
  }, [userInfo.id, userInfo.isAdmin, dynamicMenuItems]);

  // Merge hardcoded menu with dynamic menu
  // For admin/principal, show all hardcoded items
  // For staff, show dynamic menu items merged with always-visible items
  const getMergedMenuItems = useMemo(() => {
    if (userInfo.isAdmin) {
      // Admin/Principal sees all hardcoded menu items
      return menuItems;
    }

    // For staff, always show only default items + dynamic menu items
    // Default items that should always be visible to all staff
    const alwaysVisible = menuItems.filter(item => 
      item.path === '' || // Home
      item.path === '/institute-info' || // Institute Info
      item.path === '/gallery' || // Gallery (visible to all)
      item.path === '/settings' // Settings (visible to all staff)
    );
    
    // If we have userInfo.id but menu is still loading, return only alwaysVisible
    // This prevents showing incomplete menu on first load
    if (userInfo.id && menuLoading) {
      return alwaysVisible;
    }
    
    if (userInfo.id) {
      // Staff sees dynamic menu + always-visible items
      // Use the memoized dynamic items (it's now a value, not a function)
      const dynamicItems = getDynamicMenuItems;
      
      // Merge and deduplicate by path
      const merged = [...alwaysVisible];
      dynamicItems.forEach((dynamicItem: typeof menuItems[0]) => {
        if (!merged.some(item => item.path === dynamicItem.path)) {
          merged.push(dynamicItem);
        }
      });
      
      return merged;
    }

    // If no user info, return only always visible items (not all menuItems)
    return alwaysVisible;
  }, [userInfo, menuLoading, getDynamicMenuItems]);

  // Filter menu items based on permissions
  const filteredMenuItems = getMergedMenuItems;

  // Sort menu items based on saved order
  const sortedMenuItems = useMemo(() => {
    if (menuOrder.length === 0 || filteredMenuItems.length === 0) {
      return filteredMenuItems;
    }
    
    // Create a map for quick lookup
    const orderMap = new Map(menuOrder.map((path, index) => [path, index]));
    
    // Sort items based on saved order
    return [...filteredMenuItems].sort((a, b) => {
      const indexA = orderMap.get(a.path) ?? Infinity;
      const indexB = orderMap.get(b.path) ?? Infinity;
      
      // Items in saved order come first, sorted by their order
      if (indexA !== Infinity && indexB !== Infinity) {
        return indexA - indexB;
      }
      // Items in saved order come before items not in saved order
      if (indexA !== Infinity) return -1;
      if (indexB !== Infinity) return 1;
      // Items not in saved order maintain their original relative order
      const originalIndexA = filteredMenuItems.indexOf(a);
      const originalIndexB = filteredMenuItems.indexOf(b);
      return originalIndexA - originalIndexB;
    });
  }, [filteredMenuItems, menuOrder]);

  // Initialize and sync menu order with filtered items
  useEffect(() => {
    if (filteredMenuItems.length === 0) return;
    
    const savedOrder = localStorage.getItem(`menu-order-${schoolCode}`);
    const currentPaths = filteredMenuItems.map(item => item.path);
    
    if (savedOrder) {
      try {
        const parsedOrder = JSON.parse(savedOrder);
        // Validate and merge: keep saved order for existing items, add new items at the end
        const validOrder = parsedOrder.filter((path: string) => currentPaths.includes(path));
        const newItems = currentPaths.filter(path => !validOrder.includes(path));
        const mergedOrder = [...validOrder, ...newItems];
        
        // Only update state if order changed or if menuOrder is empty
        if (menuOrder.length === 0 || JSON.stringify(mergedOrder) !== JSON.stringify(menuOrder)) {
          setMenuOrder(mergedOrder);
        }
        // Only write to localStorage when we are not truncating the saved order.
        // If current menu has fewer items than saved, the menu is likely still loading
        // (e.g. only alwaysVisible items). Writing now would overwrite the full saved order.
        const notTruncating = validOrder.length >= parsedOrder.length;
        if (notTruncating) {
          localStorage.setItem(`menu-order-${schoolCode}`, JSON.stringify(mergedOrder));
        }
      } catch (error) {
        console.error('Error parsing saved menu order:', error);
        // Fallback to default order
        setMenuOrder(currentPaths);
        localStorage.setItem(`menu-order-${schoolCode}`, JSON.stringify(currentPaths));
      }
    } else {
      // No saved order, use default
      if (menuOrder.length === 0 || JSON.stringify(currentPaths) !== JSON.stringify(menuOrder)) {
        setMenuOrder(currentPaths);
        localStorage.setItem(`menu-order-${schoolCode}`, JSON.stringify(currentPaths));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredMenuItems.length, schoolCode]); // Only depend on length to avoid infinite loops

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over || active.id === over.id) {
      return;
    }

    // Use sortedMenuItems to get the actual current order
    const currentPaths = sortedMenuItems.map(item => item.path);
    const oldIndex = currentPaths.indexOf(active.id as string);
    const newIndex = currentPaths.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      // Create new order array
      const newOrder = [...currentPaths];
      const [removed] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, removed);
      
      // Update state and localStorage
      setMenuOrder(newOrder);
      localStorage.setItem(`menu-order-${schoolCode}`, JSON.stringify(newOrder));
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    sessionStorage.clear();
    localStorage.removeItem('dashboard_language'); // Optional: keep language preference
    router.push('/login');
  };

  const handleDownloadAttendanceReport = async () => {
    if (!reportFromDate || !reportToDate) {
      alert('Please select both from and to dates');
      return;
    }

    try {
      setDownloadingReport(true);
      const response = await fetch(
        `/api/attendance/report?school_code=${schoolCode}&from_date=${reportFromDate}&to_date=${reportToDate}`
      );
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to generate report');
      }
      
      const result = await response.json();
      const data = result.data || [];
      
      // Generate CSV
      const headers = ['Date', 'Student Name', 'Admission No', 'Class', 'Section', 'Status', 'Marked By'];
      const escapeCsv = (val: unknown) => {
        const s = String(val ?? '');
        if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };
      
      const csvLines = [headers.join(',')];
      data.forEach((record: { 
        attendance_date?: string;
        student_name?: string;
        admission_no?: string;
        class?: string;
        section?: string;
        status?: string;
        marked_by_name?: string;
      }) => {
        csvLines.push([
          record.attendance_date,
          record.student_name,
          record.admission_no,
          record.class,
          record.section,
          record.status,
          record.marked_by_name || 'N/A',
        ].map(escapeCsv).join(','));
      });
      
      const csv = csvLines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `student_attendance_report_${reportFromDate}_to_${reportToDate}.csv`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setAttendanceReportModalOpen(false);
      setReportFromDate('');
      setReportToDate('');
    } catch (err) {
      console.error('Error downloading attendance report:', err);
      alert(err instanceof Error ? err.message : 'Failed to download attendance report');
    } finally {
      setDownloadingReport(false);
    }
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
      if (!target.closest('.sidebar-menu-item')) {
        // Don't close sub-items when clicking outside if sidebar is collapsed
        if (!sidebarCollapsed) {
          // Handle sub-items closing logic if needed
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sidebarCollapsed]);

  // Define all searchable menu items with sub-items
  const searchableMenuItems = [
    { label: 'Home', path: '', category: 'Management', icon: Home },
    { label: 'Institute Info', path: '/institute-info', category: 'Management', icon: Building2 },
    { label: 'Basic Institute Info', path: '/institute-info', category: 'Management', icon: Building2, parent: 'Institute Info' },
    
    { label: 'Role Management', path: '/settings/roles', category: 'Management', icon: Shield },
    { label: 'Academic Year Management', path: '/academic-year-management', category: 'Management', icon: CalendarRange },
    { label: 'Year Setup', path: '/academic-year-management/year-setup', category: 'Management', icon: CalendarRange, parent: 'Academic Year Management' },
    { label: 'Promotion Engine', path: '/academic-year-management/promotion-engine', category: 'Management', icon: CalendarRange, parent: 'Academic Year Management' },
    { label: 'Year Closure', path: '/academic-year-management/year-closure', category: 'Management', icon: CalendarRange, parent: 'Academic Year Management' },
    { label: 'Audit Logs', path: '/academic-year-management/audit-logs', category: 'Management', icon: CalendarRange, parent: 'Academic Year Management' },
    { label: 'Password Manager', path: '/password', category: 'Management', icon: Key },
    
    // Staff Management
    { label: 'Staff Management', path: '/staff-management', category: 'Staff Management', icon: UserCheck },
    { label: 'Staff Directory', path: '/staff-management/directory', category: 'Staff Management', icon: UserCheck, parent: 'Staff Management' },
    { label: 'Add Staff', path: '/staff-management/add', category: 'Staff Management', icon: UserCheck, parent: 'Staff Management' },
    { label: 'Bulk Staff Import', path: '/staff-management/bulk-import', category: 'Staff Management', icon: UserCheck, parent: 'Staff Management' },
    { label: 'Bulk Photo Upload', path: '/staff-management/bulk-photo', category: 'Staff Management', icon: UserCheck, parent: 'Staff Management' },
    { label: 'Staff Attendance', path: '/staff-management/attendance', category: 'Staff Management', icon: UserCheck, parent: 'Staff Management' },
    { label: 'Staff Attendance Marking Report', path: '/staff-management/student-attendance-report', category: 'Staff Management', icon: UserCheck, parent: 'Staff Management' },
    
    // Classes
    { label: 'Classes', path: '/classes', category: 'Classes', icon: BookOpen },
    { label: 'Classes Overview', path: '/classes/overview', category: 'Classes', icon: BookOpen, parent: 'Classes' },
    { label: 'Modify Classes', path: '/classes/modify', category: 'Classes', icon: BookOpen, parent: 'Classes' },
    { label: 'Subject Teachers', path: '/classes/subject-teachers', category: 'Classes', icon: BookOpen, parent: 'Classes' },
    { label: 'Add/Modify Subjects', path: '/classes/subjects', category: 'Classes', icon: BookOpen, parent: 'Classes' },
    
    // Student Management
    { label: 'Student Management', path: '/students', category: 'Student Management', icon: Users },
    { label: 'Add Student', path: '/students/add', category: 'Student Management', icon: Users, parent: 'Student Management' },
    { label: 'Student Directory', path: '/students/directory', category: 'Student Management', icon: Users, parent: 'Student Management' },
    
    { label: 'Mark Attendance', path: '/students/mark-attendance', category: 'Student Management', icon: Users, parent: 'Student Management' },
    { label: 'Student Attendance Report', path: '/students/attendance-report', category: 'Student Management', icon: Users, parent: 'Student Management' },
    { label: 'Bulk Import Students', path: '/students/bulk-import', category: 'Student Management', icon: Users, parent: 'Student Management' },
    { label: 'Student Siblings', path: '/students/siblings', category: 'Student Management', icon: Users, parent: 'Student Management' },
    
    // Timetable
    { label: 'Timetable', path: '/timetable', category: 'Timetable', icon: CalendarDays },
    { label: 'Timetable Builder', path: '/timetable', category: 'Timetable', icon: CalendarDays, parent: 'Timetable' },
    { label: 'Class Timetable', path: '/timetable/class', category: 'Timetable', icon: CalendarDays, parent: 'Timetable' },
    { label: 'Teacher Timetable', path: '/timetable/teacher', category: 'Timetable', icon: CalendarDays, parent: 'Timetable' },
    { label: 'Group Wise Timetable', path: '/timetable/group-wise', category: 'Timetable', icon: CalendarDays, parent: 'Timetable' },
    
    // Event/Calendar
    { label: 'Event/Calendar', path: '/calendar', category: 'Event/Calendar', icon: CalendarDays },
    { label: 'Academic Calendar', path: '/calendar/academic', category: 'Event/Calendar', icon: CalendarDays, parent: 'Event/Calendar' },
    { label: 'Events', path: '/calendar/events', category: 'Event/Calendar', icon: CalendarDays, parent: 'Event/Calendar' },
    
    // Examinations
    { label: 'Examinations', path: '/examinations', category: 'Examinations', icon: FileText },
    { label: 'Examination Dashboard', path: '/examinations/dashboard', category: 'Examinations', icon: BarChart3, parent: 'Examinations' },
    { label: 'Create Examination', path: '/examinations/create', category: 'Examinations', icon: FileText, parent: 'Examinations' },
    { label: 'Grade Scale', path: '/examinations/grade-scale', category: 'Examinations', icon: GraduationCap, parent: 'Examinations' },
    { label: 'Examination Reports', path: '/examinations/reports', category: 'Examinations', icon: BarChart3, parent: 'Examinations' },
    { label: 'Report Card', path: '/report-card', category: 'Report Card', icon: Award },
    { label: 'Generate Report Card', path: '/report-card/generate', category: 'Report Card', icon: Award, parent: 'Report Card' },
    { label: 'Report Card Dashboard', path: '/report-card/dashboard', category: 'Report Card', icon: BarChart3, parent: 'Report Card' },
    { label: 'Customize Template', path: '/report-card/templates', category: 'Report Card', icon: Settings2, parent: 'Report Card' },
    // Note: Exam Schedule and View Marks are dynamic routes and cannot be included in sidebar navigation
    // They are accessible from individual exam pages
    
    // Marks
    { label: 'Marks', path: '/marks', category: 'Marks', icon: GraduationCap },
    { label: 'Marks Dashboard', path: '/marks', category: 'Marks', icon: FileBarChart, parent: 'Marks' },
    { label: 'Mark Entry', path: '/marks-entry', category: 'Marks', icon: ClipboardList, parent: 'Marks' },
    
    // Fees - V2 System (Primary) + Legacy
    { label: 'Fees', path: '/fees', category: 'Fees', icon: IndianRupee },
    { label: 'Fee Dashboard', path: '/fees/v2/dashboard', category: 'Fees', icon: BarChart3, parent: 'Fees' },
    { label: 'Fee Heads', path: '/fees/v2/fee-heads', category: 'Fees', icon: Tag, parent: 'Fees' },
    { label: 'Fee Structures', path: '/fees/v2/fee-structures', category: 'Fees', icon: FileText, parent: 'Fees' },
    { label: 'Collect Payment', path: '/fees/v2/collection', category: 'Fees', icon: CreditCard, parent: 'Fees' },

    { label: 'Student Fee Statements', path: '/fees/statements', category: 'Fees', icon: Receipt, parent: 'Fees' },
    { label: 'Discounts & Fines', path: '/fees/discounts-fines', category: 'Fees', icon: Tag, parent: 'Fees' },
    { label: 'Fee Reports', path: '/fees/reports', category: 'Fees', icon: BarChart3, parent: 'Fees' },
    
    // Library
    { label: 'Library', path: '/library', category: 'Library', icon: Library },
    { label: 'Library Dashboard', path: '/library/dashboard', category: 'Library', icon: Library, parent: 'Library' },
    { label: 'Library Basics', path: '/library/basics', category: 'Library', icon: Library, parent: 'Library' },
    { label: 'Library Catalogue', path: '/library/catalogue', category: 'Library', icon: Library, parent: 'Library' },
    { label: 'Library Transactions', path: '/library/transactions', category: 'Library', icon: Library, parent: 'Library' },
    
    // Transport
    { label: 'Transport', path: '/transport', category: 'Transport', icon: Bus },
    { label: 'Transport Dashboard', path: '/transport/dashboard', category: 'Transport', icon: Bus, parent: 'Transport' },
    { label: 'Vehicles', path: '/transport/vehicles', category: 'Transport', icon: Bus, parent: 'Transport' },
    { label: 'Stops', path: '/transport/stops', category: 'Transport', icon: Bus, parent: 'Transport' },
    { label: 'Routes', path: '/transport/routes', category: 'Transport', icon: Bus, parent: 'Transport' },
    { label: 'Student Route Mapping', path: '/transport/route-students', category: 'Transport', icon: Bus, parent: 'Transport' },
  
    
    // Leave Management
    { label: 'Leave Management', path: '/leave', category: 'Leave Management', icon: CalendarDays },
    { label: 'Leave Dashboard', path: '/leave/dashboard', category: 'Leave Management', icon: CalendarDays, parent: 'Leave Management' },
    { label: 'Student Leave', path: '/leave/student-leave', category: 'Leave Management', icon: Users, parent: 'Leave Management' },
    { label: 'Staff Leave', path: '/leave/staff-leave', category: 'Leave Management', icon: User, parent: 'Leave Management' },
    { label: 'Leave Basics', path: '/leave/basics', category: 'Leave Management', icon: CalendarDays, parent: 'Leave Management' },
    
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
    { label: 'Front Office Dashboard', path: '/front-office', category: 'Security', icon: DoorOpen, parent: 'Front Office management' },
    { label: 'Gate pass', path: '/gate-pass', category: 'Security', icon: DoorOpen, parent: 'Front Office management' },
    { label: 'Visitor Management', path: '/visitor-management', category: 'Security', icon: DoorOpen, parent: 'Front Office management' },
    
    // Copy Checking
    { label: 'Copy Checking', path: '/copy-checking', category: 'Academic', icon: FileText },
    
    // Certificate Management
    { label: 'Certificate Dashboard', path: '/certificates/dashboard', category: 'Academic', icon: Award, parent: 'Certificate Management' },
    { label: 'New Certificate', path: '/certificates/new', category: 'Academic', icon: Award, parent: 'Certificate Management' },
    
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
        // Role Management and Academic Year Management are only for admin/principal
        if (item.path === '/settings/roles' || item.path === '/academic-year-management') {
          return isAdmin;
        }
        return true;
      }
      
      // For staff, check permissions
      return permissions.includes(mainMenuItem.permission);
    });
  };

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      if (item.path === '/classes') {
        setClassModalOpen(true);
      } else if (item.path === '/timetable') {
        setTimetableModalOpen(true);
      } else if (item.path === '/students') {
        setStudentModalOpen(true);
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
    
    // Check if this menu item corresponds to a dynamic module
    if (userInfo.id && !userInfo.isAdmin && dynamicMenuItems.length > 0) {
      // Find matching dynamic module
      const matchingModule = dynamicMenuItems.find(module => {
        const moduleBasePath = module.sub_modules[0]?.route.replace('/dashboard/[school]', '') || `/${module.module_key}`;
        return moduleBasePath === mainMenuItem.path || module.module_name === mainMenuItem.label;
      });
      
      if (matchingModule) {
        // Return sub-modules from dynamic menu
        return matchingModule.sub_modules
          .filter(sm => sm.has_view_access)
          .map(sm => ({
            label: sm.name,
            path: sm.route.replace('/dashboard/[school]', ''),
            icon: mainMenuItem.icon || DefaultSubItemIcon,
          }));
      }
    }
    
    // Front Office management should have sub-items
    if (mainMenuItem.path === '/front-office') {
      return searchableItems
        .filter(item => item.parent === 'Front Office management')
        .map(item => ({
          label: item.label,
          path: item.path,
          icon: item.icon || mainMenuItem.icon || DefaultSubItemIcon,
        }));
    }
    
    // Institute Info should have sub-items
    if (mainMenuItem.path === '/institute-info') {
      return searchableItems
        .filter(item => item.parent === 'Institute Info')
        .map(item => ({
          label: item.label,
          path: item.path,
          icon: item.icon || mainMenuItem.icon || DefaultSubItemIcon,
        }));
    }
    
    // Classes should have sub-items
    if (mainMenuItem.path === '/classes') {
      return searchableItems
        .filter(item => item.parent === 'Classes')
        .map(item => ({
          label: item.label,
          path: item.path,
          icon: item.icon || mainMenuItem.icon || DefaultSubItemIcon,
        }));
    }
    
    // Examinations should have sub-items (filter out dynamic routes)
    if (mainMenuItem.path === '/examinations') {
      return searchableItems
        .filter(item => 
          item.parent === 'Examinations' && 
          !item.path.includes('[') && 
          !item.path.includes(']')
        )
        .map(item => ({
          label: item.label,
          path: item.path,
          icon: item.icon || mainMenuItem.icon || DefaultSubItemIcon,
        }));
    }

    // Report Card should have sub-items
    if (mainMenuItem.path === '/report-card') {
      return searchableItems
        .filter(item => item.parent === 'Report Card')
        .map(item => ({
          label: item.label,
          path: item.path,
          icon: item.icon || mainMenuItem.icon || DefaultSubItemIcon,
        }));
    }
    
    // Marks should have sub-items
    if (mainMenuItem.path === '/marks') {
      return searchableItems
        .filter(item => item.parent === 'Marks')
        .map(item => ({
          label: item.label,
          path: item.path,
          icon: item.icon || mainMenuItem.icon || DefaultSubItemIcon,
        }));
    }
    
    // Leave Management should have sub-items
    if (mainMenuItem.path === '/leave') {
      return searchableItems
        .filter(item => item.parent === 'Leave Management')
        .map(item => ({
          label: item.label,
          path: item.path,
          icon: item.icon || mainMenuItem.icon || DefaultSubItemIcon,
        }));
    }
    
    // Fees should have sub-items
    if (mainMenuItem.path === '/fees') {
      return searchableItems
        .filter(item => item.parent === 'Fees')
        .map(item => ({
          label: item.label,
          path: item.path,
          icon: item.icon || mainMenuItem.icon || DefaultSubItemIcon,
        }));
    }
    
    return searchableItems
      .filter((item) => {
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
      })
      .map(item => ({
        label: item.label,
        path: item.path,
        icon: item.icon || mainMenuItem.icon || DefaultSubItemIcon,
      }));
  };

  const toggleSection = (sectionLabel: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionLabel]: !prev[sectionLabel]
    }));
  };

  // Filter sidebar menu items by search (main label, path, and sub-item labels/paths)
  const sidebarFilteredItems = useMemo(() => {
    const q = sidebarSearchQuery.trim().toLowerCase();
    if (!q) return sortedMenuItems;
    return sortedMenuItems.filter((item) => {
      const labelMatch = (item.label || '').toLowerCase().includes(q);
      const pathMatch = (item.path || '').toLowerCase().includes(q);
      if (labelMatch || pathMatch) return true;
      const subItems = getSubItems(item);
      return subItems.some((sub) => {
        const subLabelMatch = (sub.label || '').toLowerCase().includes(q);
        const subPathMatch = (sub.path || '').toLowerCase().includes(q);
        return subLabelMatch || subPathMatch;
      });
    });
    // getSubItems is stable per render; omitting to avoid unnecessary recompute
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedMenuItems, sidebarSearchQuery, userInfoLoaded]);

  // Auto-expand sections that have active sub-items, or when search matches a sub-item
  useEffect(() => {
    if (!userInfoLoaded) return;

    const q = sidebarSearchQuery.trim().toLowerCase();

    if (q) {
      // When searching: expand any section that is shown and has sub-items (so user sees matching submodules)
      sidebarFilteredItems.forEach((item) => {
        const subItems = getSubItems(item);
        if (subItems.length > 0) {
          setExpandedSections(prev => ({ ...prev, [item.label]: true }));
        }
      });
      return;
    }

    // No search: expand sections that have the active sub-item
    filteredMenuItems.forEach((item) => {
      const subItems = getSubItems(item);
      const hasActiveSubItem = subItems.some(subItem => isActive(subItem.path));
      if (hasActiveSubItem) {
        setExpandedSections(prev => (prev[item.label] ? prev : { ...prev, [item.label]: true }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, userInfo, userInfoLoaded, sidebarSearchQuery, sidebarFilteredItems]);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log to error reporting service in production
        if (process.env.NODE_ENV === 'production') {
          // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
          console.error('DashboardLayout Error:', error, errorInfo);
        }
      }}
    >
      <div className="min-h-screen bg-[#F5EFEB] dark:bg-[#0f172a]">
      {/* Top Navigation - Modern and Vibrant */}
      <nav className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl border-b border-white/60 dark:border-gray-700/50 sticky top-0 z-40 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-xl hover:bg-[#F0F5F9] dark:hover:bg-[#2F4156] transition-all"
              >
                {sidebarOpen ? <X size={24} className="text-[#2C3E50] dark:text-[#5A879A]" /> : <Menu size={24} className="text-[#2C3E50] dark:text-[#5A879A]" />}
              </button>
              <Link href={schoolCode ? `/dashboard/${schoolCode}` : '/'} className="text-xl font-bold bg-gradient-to-r from-[#5A7A95] to-[#6B9BB8] bg-clip-text text-transparent">
                EduCore
              </Link>
              <div className="hidden sm:block h-6 w-px bg-gray-300 dark:bg-gray-600" />
              <span className="hidden sm:block text-[#2C3E50] dark:text-[#F8FAFC] font-semibold">{schoolName}</span>
              <div className="hidden sm:block h-6 w-px bg-gray-300 dark:bg-gray-600" />
              <span className="hidden sm:block text-sm text-gray-600 dark:text-gray-400 font-medium">ID: {schoolCode}</span>
              <div className="hidden md:block h-6 w-px bg-gray-300 dark:bg-gray-600" />
              <span className="hidden md:block text-sm text-gray-600 dark:text-gray-400 font-medium">{getTodayDate()}</span>
              <div className="hidden md:block h-6 w-px bg-gray-300 dark:bg-gray-600" />
              <span className="hidden md:block text-sm text-navy dark:text-skyblue font-semibold">{getCurrentMenuName()}</span>
            </div>
            <div className="flex items-center space-x-[0.5cm]">

              {/* Search – Quick jump to Student or Staff directory */}
              <div className="relative search-container">
                <button
                  type="button"
                  onClick={() => setSearchDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8] transition-all"
                  aria-label="Search"
                  aria-expanded={searchDropdownOpen}
                >
                  <Search size={18} className="text-gray-500 dark:text-gray-400" />
                  Search
                  <ChevronDown size={16} className={`text-gray-500 dark:text-gray-400 transition-transform ${searchDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {searchDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute top-full left-0 mt-2 min-w-[200px] bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSearchDropdownOpen(false);
                        router.push(`${basePath}/students/directory`);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-left text-sm font-medium text-gray-800 dark:text-gray-200 transition-colors"
                    >
                      <GraduationCap size={18} className="text-[#5A7A95] dark:text-[#6B9BB8]" />
                      Quick search student
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchDropdownOpen(false);
                        router.push(`${basePath}/staff-management/directory`);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-left text-sm font-medium text-gray-800 dark:text-gray-200 transition-colors"
                    >
                      <UserCheck size={18} className="text-[#5A7A95] dark:text-[#6B9BB8]" />
                      Quick search staff
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Quick Actions Button */}
              <div className="relative quick-actions-menu-container">
                <button
                  id="quick-actions-navbar-button"
                  onClick={() => router.push(basePath)}
                  className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
                  aria-label="Quick Actions"
                  title="Go to Dashboard for Quick Actions"
                >
                  <div className="w-10 h-10 rounded-full bg-[#F0F5F9] dark:bg-[#2F4156] flex items-center justify-center">
                    <ChevronUp className="text-[#2C3E50] dark:text-[#5A879A]" size={18} />
                  </div>
                  <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Quick</span>
                </button>
              </div>

              {/* Notifications Button */}
              <div className="relative notifications-dropdown-container">
                <button
                  onClick={() => setNotificationsDropdownOpen(!notificationsDropdownOpen)}
                  className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
                  title="Notifications"
                >
                  <div className="w-10 h-10 rounded-full bg-[#F0F5F9] dark:bg-[#2F4156] flex items-center justify-center">
                    <Bell className="text-[#2C3E50] dark:text-[#5A879A]" size={18} />
                  </div>
                  <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Notifications</span>
                </button>

                {notificationsDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-80 bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur-xl rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-white/60 dark:border-gray-700/50 z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="font-semibold text-foreground">Notifications</h3>
                    </div>
                    <div className="p-8 text-center">
                      <Bell className="mx-auto mb-3 text-slate-300 dark:text-[#6B9BB8]" size={32} />
                      <p className="text-[#5A7A95] dark:text-[#6B9BB8] font-medium">No new notifications are there</p>
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
                <div className="w-10 h-10 rounded-full bg-[#F0F5F9] dark:bg-[#2F4156] flex items-center justify-center">
                  <HelpCircle className="text-[#5A7A95] dark:text-[#6B9BB8]" size={18} />
                </div>
                <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Help</span>
              </button>

              {/* Settings Button */}
              <Link
                href={`${basePath}/settings`}
                className={`flex flex-col items-center gap-1 hover:opacity-80 transition-opacity ${
                  isActive('/settings') ? 'opacity-100' : ''
                }`}
                title="Settings"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isActive('/settings') ? 'bg-gradient-to-r from-[#5A7A95] to-[#6B9BB8]' : 'bg-[#F0F5F9] dark:bg-[#2F4156]'
                }`}>
                  <Settings className={isActive('/settings') ? 'text-white' : 'text-[#5A7A95] dark:text-[#6B9BB8]'} size={18} />
                </div>
                <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Settings</span>
              </Link>

              {/* Language Selector */}
              <div className="relative language-dropdown-container">
                <button
                  onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                  className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
                >
                  <div className="w-10 h-10 rounded-full bg-[#F0F5F9] dark:bg-[#2F4156] flex items-center justify-center">
                    <Languages className="text-[#5A7A95] dark:text-[#6B9BB8]" size={18} />
                  </div>
                  <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Translate</span>
                </button>
                
                {languageDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 top-12 w-48 bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur-xl rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-white/60 dark:border-gray-700/50 z-50 overflow-hidden"
                  >
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                          setLanguageDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-[#F0F5F9] dark:hover:bg-[#2F4156] transition-all flex items-center gap-3 ${
                          language === lang.code ? 'bg-gradient-to-r from-[#5A7A95] to-[#6B9BB8] font-semibold text-white' : 'text-navy dark:text-skyblue'
                        }`}
                      >
                        <span className="text-xl">{lang.flag}</span>
                        <span className="flex-1">{lang.name}</span>
                        {language === lang.code && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Profile Dropdown */}
              <div className="relative profile-dropdown-container">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
                >
                  <div className="w-10 h-10 rounded-full bg-[#F0F5F9] dark:bg-[#2F4156] flex items-center justify-center">
                    <User className="text-[#5A7A95] dark:text-[#6B9BB8]" size={18} />
                  </div>
                  <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Profile</span>
                </button>

                <AnimatePresence>
                  {profileDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 top-12 w-64 bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur-xl rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-white/60 dark:border-gray-700/50 z-50 overflow-hidden"
                    >
                    {/* My Profile Section */}
                    <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#5A7A95] to-[#6B9BB8] flex items-center justify-center">
                        <User size={18} className="text-white" />
                      </div>
                      <span className="text-[#5A7A95] dark:text-[#6B9BB8] font-semibold">My Profile</span>
                    </div>

                    {/* Logout */}
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F0F5F9] dark:hover:bg-[#2F4156] transition-colors"
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
                initial={{ x: -240 }}
                animate={{ 
                  x: 0,
                  width: sidebarCollapsed ? 100 : 240
                }}
                exit={{ x: -240 }}
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
                className="fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] bg-[#1e293b] dark:bg-[#0f172a] border-r border-slate-600/30 z-50 lg:z-auto overflow-y-auto overflow-x-hidden shadow-xl"
                style={{ 
                  willChange: 'width',
                  marginLeft: 0
                }}
              >
                <nav className={`py-3 ${sidebarCollapsed ? 'px-2' : 'px-1.5'} space-y-1.5 overflow-visible transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]`}>
                  {/* School logo + name above search */}
                  {!sidebarCollapsed && (schoolName || sidebarSchoolLogo) && (
                    <div className="px-2 pb-3 flex items-center gap-2 border-b border-slate-600/40 mb-2">
                      <div className="w-14 h-14 rounded-lg bg-white shrink-0 flex items-center justify-center overflow-hidden p-0.5 border border-slate-500/30 relative">
                        {sidebarSchoolLogo ? (
                          <NextImage
                            src={sidebarSchoolLogo}
                            alt=""
                            fill
                            className="rounded-md object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <span className="text-slate-700 text-lg font-bold">
                            {(schoolName || 'S').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-white font-medium text-sm truncate" title={schoolName || ''}>
                        {schoolName || 'School'}
                      </span>
                    </div>
                  )}
                  {/* Sidebar search – filter modules */}
                  {!sidebarCollapsed && (
                    <div className="px-2 pb-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          placeholder="Search modules..."
                          value={sidebarSearchQuery}
                          onChange={(e) => setSidebarSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-[#5A7A95] focus:border-transparent"
                          aria-label="Search modules"
                        />
                      </div>
                    </div>
                  )}
                  {/* Menu Items */}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={sidebarFilteredItems.map(item => item.path)}
                      strategy={verticalListSortingStrategy}
                      key={`menu-${userInfoLoaded}-${Object.keys(userInfo).length}`}
                    >
                      {(!userInfoLoaded || (menuLoading && !userInfo.isAdmin)) ? (
                        <MenuSkeletonLoader count={6} collapsed={sidebarCollapsed} />
                      ) : sidebarFilteredItems.length === 0 && sidebarSearchQuery.trim() ? (
                        <div className="px-3 py-4 text-center text-slate-400 text-xs">
                          No modules match &quot;{sidebarSearchQuery.trim()}&quot;
                        </div>
                      ) : (
                        sidebarFilteredItems.map((item, index) => {
                    const active = isActive(item.path);
                    // Only calculate subItems if userInfo is loaded
                    const subItems = userInfoLoaded ? getSubItems(item) : [];
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
                        setClassModalOpen={setClassModalOpen}
                        setTimetableModalOpen={setTimetableModalOpen}
                        setStudentModalOpen={setStudentModalOpen}
                        setCalendarModalOpen={setCalendarModalOpen}
                        setLibraryModalOpen={setLibraryModalOpen}
                        setTransportModalOpen={setTransportModalOpen}
                        setLeaveModalOpen={setLeaveModalOpen}
                        isDragEnabled={isDragEnabled}
                        t={t}
                      />
                                );
                              })
                      )}
                    </SortableContext>
                    <DragOverlay>
                      {activeDragId ? (
                        <div className="opacity-50">
                          <div className="p-3 bg-slate-700/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-xl border border-slate-600/40">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                <GripVertical size={16} className="text-slate-400" />
                            </div>
                              <span className="text-sm font-semibold text-white">
                                {sidebarFilteredItems.find(item => item.path === activeDragId)?.label || sortedMenuItems.find(item => item.path === activeDragId)?.label}
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

        {/* Main Content */}
        <main className="flex-1 lg:ml-0 bg-background min-h-[calc(100vh-4rem)]">
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Back button - show on all module pages except home */}
            {pathname !== basePath && pathname !== `${basePath}/` && (
              <div className="mb-4 -mt-1 -ml-1">
                <button
                  onClick={() => {
                    const segments = pathname.split('/').filter(Boolean);
                    if (segments.length > 3) {
                      const parentPath = '/' + segments.slice(0, -1).join('/');
                      router.push(parentPath);
                    } else {
                      router.push(basePath);
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#5A7A95] dark:text-[#6B9BB8] hover:text-[#4A6A85] dark:hover:text-[#5A8BA8] hover:bg-[#F0F5F9] dark:hover:bg-[#2F4156] rounded-lg transition-colors"
                  aria-label="Go back"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
      
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

      {/* Student Attendance Report Modal */}
      <AnimatePresence>
        {attendanceReportModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setAttendanceReportModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Student Attendance Report
                </h2>
                <button
                  onClick={() => setAttendanceReportModalOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={reportFromDate}
                    onChange={(e) => setReportFromDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={reportToDate}
                    onChange={(e) => setReportToDate(e.target.value)}
                    min={reportFromDate}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setAttendanceReportModalOpen(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDownloadAttendanceReport}
                  disabled={!reportFromDate || !reportToDate || downloadingReport}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {downloadingReport ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      Download Report
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}
