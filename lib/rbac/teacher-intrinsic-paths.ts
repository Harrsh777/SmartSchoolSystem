/**
 * Teacher portal routes that are not tied to school RBAC sub-modules
 * (personal / account). Everything else under `/teacher/dashboard` must match the staff menu.
 */
export const TEACHER_DASHBOARD_INTRINSIC_PREFIXES: readonly string[] = [
  '/teacher/dashboard/settings',
  '/teacher/dashboard/change-password',
  '/teacher/dashboard/institute-info',
  '/teacher/dashboard/attendance-staff',
  '/teacher/dashboard/my-timetable',
  '/teacher/dashboard/apply-leave',
  '/teacher/dashboard/my-leaves',
  '/teacher/dashboard/communication',
];

export function isTeacherDashboardIntrinsicPath(pathname: string): boolean {
  const p = pathname.split('?')[0];
  if (p === '/teacher/dashboard' || p === '/teacher/dashboard/') {
    return true;
  }
  return TEACHER_DASHBOARD_INTRINSIC_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`)
  );
}

/** Class-teacher–only portal pages (allowed without a matching admin submodule route). */
export const TEACHER_CLASS_TEACHER_INTRINSIC_PREFIXES: readonly string[] = [
  '/teacher/dashboard/my-class',
  '/teacher/dashboard/student-leave-approvals',
];

export function isTeacherClassTeacherIntrinsicPath(pathname: string): boolean {
  const p = pathname.split('?')[0];
  return TEACHER_CLASS_TEACHER_INTRINSIC_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`)
  );
}

/** Intrinsic + class-teacher-only paths (middleware: no menu match required). */
export function isTeacherDashboardPathExemptFromRbacMenu(pathname: string): boolean {
  return isTeacherDashboardIntrinsicPath(pathname) || isTeacherClassTeacherIntrinsicPath(pathname);
}
