'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Bus,
  Calendar,
  CalendarDays,
  CalendarX,
  ChevronDown,
  ChevronRight,
  DoorOpen,
  FileBarChart,
  FileText,
  GraduationCap,
  Image,
  IndianRupee,
  Library,
  MessageSquare,
  TrendingUp,
  UserCheck,
  BookMarked,
} from 'lucide-react';
import {
  isTeacherClassTeacherIntrinsicPath,
  isTeacherDashboardIntrinsicPath,
} from '@/lib/rbac/teacher-intrinsic-paths';
import { evaluateTeacherSlugAgainstMenu, teacherPathnameToSlug } from '@/lib/rbac/teacher-menu-matching';

const INTRINSIC_MENU_IDS = new Set([
  'home',
  'my-attendance',
  'my-timetable',
  'apply-leave',
  'my-leaves',
  'institute-info',
  'settings',
  'change-password',
  'communication',
]);

const CLASS_TEACHER_MENU_IDS = new Set(['my-class', 'student-leave-approvals']);

export type TeacherPortalBaseItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  requiresClassTeacher?: boolean;
  allowsSubjectTeacher?: boolean;
};

export type TeacherRbacSubModule = {
  name: string;
  key: string;
  route: string;
  has_view_access: boolean;
  has_edit_access: boolean;
};

export type TeacherRbacModule = {
  module_name: string;
  module_key: string;
  sub_modules: TeacherRbacSubModule[];
};

export function teacherHrefFromModuleRoute(route: string, schoolCode: string): string {
  const prefix = '/dashboard/[school]/';
  const sc = (schoolCode || '').trim();
  if (route.startsWith(prefix)) {
    const rel = route.slice(prefix.length).replace(/^\/+|\/+$/g, '');
    if (!sc) {
      return `/teacher/dashboard/${rel}`;
    }
    return `/teacher/dashboard/${encodeURIComponent(sc)}/${rel}`;
  }
  if (route === '/dashboard/[school]') {
    return '/teacher/dashboard';
  }
  return route;
}

const MODULE_ICONS: Record<string, LucideIcon> = {
  fee_management: IndianRupee,
  classes: BookOpen,
  examination: FileText,
  timetable: CalendarDays,
  student_management: GraduationCap,
  staff_management: UserCheck,
  library: Library,
  transport: Bus,
  leave_management: CalendarX,
  communication: MessageSquare,
  reports: FileBarChart,
  gallery: Image,
  certificate_management: FileText,
  digital_diary: BookMarked,
  expense_income: TrendingUp,
  front_office: DoorOpen,
  copy_checking: FileText,
  event_calendar: CalendarDays,
  marks: FileText,
  attendance: Calendar,
};

type TeacherRbacSidebarProps = {
  pathname: string;
  setSidebarOpen: (v: boolean) => void;
  teacherBaseItems: TeacherPortalBaseItem[];
  dynamicModules: TeacherRbacModule[];
  /** Staff's school_code — RBAC module links are `/teacher/dashboard/<school>/...`. */
  teacherSchoolCode: string;
  isRestrictedNonTeaching: boolean;
  isClassTeacher: boolean;
  hasTimetableTeaching: boolean;
  isActive: (path: string) => boolean;
};

export function TeacherRbacSidebar({
  pathname,
  setSidebarOpen,
  teacherBaseItems,
  dynamicModules,
  teacherSchoolCode,
  isRestrictedNonTeaching,
  isClassTeacher,
  hasTimetableTeaching,
  isActive,
}: TeacherRbacSidebarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const portalItems = useMemo(() => {
    return teacherBaseItems.filter((item) => {
      if (INTRINSIC_MENU_IDS.has(item.id)) return true;
      if (CLASS_TEACHER_MENU_IDS.has(item.id)) {
        if (isRestrictedNonTeaching) return false;
        if (item.requiresClassTeacher) {
          if (item.allowsSubjectTeacher) {
            return isClassTeacher || hasTimetableTeaching;
          }
          return isClassTeacher;
        }
      }
      return false;
    });
  }, [teacherBaseItems, isRestrictedNonTeaching, isClassTeacher, hasTimetableTeaching]);

  useEffect(() => {
    if (!dynamicModules.length) return;
    setExpanded((prev) => {
      const next = { ...prev };
      for (const mod of dynamicModules) {
        for (const sm of mod.sub_modules || []) {
          const href = teacherHrefFromModuleRoute(sm.route, teacherSchoolCode);
          if (pathname === href || pathname.startsWith(`${href}/`)) {
            next[mod.module_key] = true;
          }
        }
      }
      return next;
    });
  }, [pathname, dynamicModules, teacherSchoolCode]);

  return (
    <nav className="p-5 space-y-4 overflow-visible">
      <div>
        <p className="px-3.5 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
          Portal
        </p>
        <div className="space-y-1">
          {portalItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.id}
                href={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-300 ${
                  active
                    ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-700/30'
                    : 'text-emerald-100 hover:text-white hover:bg-emerald-800/80'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    active ? 'bg-emerald-700 shadow-lg' : 'bg-transparent group-hover:bg-emerald-900'
                  }`}
                >
                  <Icon size={20} className={active ? 'text-white' : 'text-emerald-200 group-hover:text-white'} />
                </div>
                <span className="font-semibold text-sm tracking-wide flex-1 text-left">{item.label}</span>
                {active ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" /> : null}
              </Link>
            );
          })}
        </div>
      </div>

      {dynamicModules.length > 0 ? (
        <div>
          <p className="px-3.5 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
            School modules
          </p>
          <div className="space-y-1">
            {dynamicModules.map((mod) => {
              const Icon = MODULE_ICONS[mod.module_key] || FileText;
              const open = expanded[mod.module_key] ?? false;
              const moduleActive = (mod.sub_modules || []).some((sm) => {
                const href = teacherHrefFromModuleRoute(sm.route, teacherSchoolCode);
                return pathname === href || pathname.startsWith(`${href}/`);
              });

              return (
                <div key={mod.module_key} className="rounded-xl">
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((prev) => ({
                        ...prev,
                        [mod.module_key]: !open,
                      }))
                    }
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-300 ${
                      moduleActive
                        ? 'bg-emerald-800/90 text-white'
                        : 'text-emerald-100 hover:text-white hover:bg-emerald-800/80'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        moduleActive ? 'bg-emerald-700' : 'bg-emerald-900/60'
                      }`}
                    >
                      <Icon size={20} className="text-emerald-50" />
                    </div>
                    <span className="font-semibold text-sm tracking-wide flex-1 text-left">{mod.module_name}</span>
                    {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>

                  {open ? (
                    <div className="mt-1 ml-2 border-l border-emerald-700/60 pl-2 space-y-0.5">
                      {(mod.sub_modules || []).map((sm) => {
                        const href = teacherHrefFromModuleRoute(sm.route, teacherSchoolCode);
                        const subActive = pathname === href || pathname.startsWith(`${href}/`);
                        const canView = sm.has_view_access;
                        const canEdit = sm.has_edit_access;
                        return (
                          <Link
                            key={sm.key}
                            href={href}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                              subActive
                                ? 'bg-emerald-600 text-white'
                                : 'text-emerald-100/90 hover:bg-emerald-800/80 hover:text-white'
                            }`}
                          >
                            <span className="flex-1 text-left">{sm.name}</span>
                            <span className="text-[10px] uppercase tracking-wide opacity-80 shrink-0">
                              {canEdit ? 'Edit' : canView ? 'View' : ''}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </nav>
  );
}

/** Client-side guard aligned with middleware + class-teacher portal rules. */
export function isPathAllowedOnTeacherDashboardClient(
  pathname: string,
  dynamicModules: TeacherRbacModule[],
  isRestrictedNonTeaching: boolean,
  sessionSchoolCode?: string | null
): boolean {
  if (!pathname.startsWith('/teacher/dashboard')) return true;
  if (isTeacherDashboardIntrinsicPath(pathname)) return true;
  if (isTeacherClassTeacherIntrinsicPath(pathname)) {
    return !isRestrictedNonTeaching;
  }
  if (!dynamicModules.length) return true;
  const slug = teacherPathnameToSlug(pathname, sessionSchoolCode);
  return evaluateTeacherSlugAgainstMenu(dynamicModules, slug).allowed;
}
