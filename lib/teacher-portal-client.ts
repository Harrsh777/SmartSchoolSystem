/**
 * Client helpers for the teacher portal (RBAC menu matching, session helpers).
 * School-scoped module screens live under `/teacher/dashboard/<school_code>/...`
 * and reuse implementations from `@/shared/modules/...`.
 */

import type { RbacMenuModule, RbacMenuSubModule } from '@/lib/rbac/teacher-menu-matching';
import {
  evaluateTeacherSlugAgainstMenu,
  normalizeRoutePathToTeacherDashboardSlug,
  teacherPathnameToSlug,
} from '@/lib/rbac/teacher-menu-matching';

export type TeacherMenuSubModule = RbacMenuSubModule;
export type TeacherMenuModule = RbacMenuModule;

export {
  normalizeRoutePathToTeacherDashboardSlug,
  evaluateTeacherSlugAgainstMenu,
  teacherPathnameToSlug,
};

function submoduleHasAccess(sm: TeacherMenuSubModule): boolean {
  return Boolean(sm.has_view_access || sm.has_edit_access);
}

/** True if the staff menu includes this module with at least one accessible sub-module. */
export function menuHasModuleKey(
  menu: TeacherMenuModule[] | null | undefined,
  moduleKeys: string[]
): boolean {
  if (!menu?.length || !moduleKeys.length) return false;
  const wanted = new Set(moduleKeys.map((k) => k.toLowerCase()));
  return menu.some(
    (m) =>
      wanted.has((m.module_key || '').toLowerCase()) &&
      (m.sub_modules || []).some((sm) => submoduleHasAccess(sm))
  );
}

export function menuGrantsTeacherDashboardSlug(
  menu: TeacherMenuModule[] | null | undefined,
  slug: string
): boolean {
  return evaluateTeacherSlugAgainstMenu(menu, slug).allowed;
}

export function getSessionStaffOrTeacherProfile(): {
  id: string;
  full_name?: string;
} | null {
  if (typeof window === 'undefined') return null;
  for (const storageKey of ['staff', 'teacher'] as const) {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) continue;
    try {
      const data = JSON.parse(raw) as { id?: string; full_name?: string };
      if (data?.id) {
        return { id: String(data.id), full_name: data.full_name };
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export async function fetchTeacherMenu(teacherId: string): Promise<TeacherMenuModule[] | null> {
  const response = await fetch(`/api/staff/${teacherId}/menu`, { credentials: 'include' });
  const result = await response.json();
  if (!response.ok || !result.data) return null;
  return result.data as TeacherMenuModule[];
}

/**
 * True if the menu grants view or edit access on a sub-module whose key matches
 * any of the given keys (exact, or `sm.key` extends `key` with `_`, e.g. gate_pass → gate_pass_management).
 */
export function menuHasSubmoduleView(
  menu: TeacherMenuModule[] | null | undefined,
  subModuleKeys: string[]
): boolean {
  if (!menu?.length || !subModuleKeys.length) return false;
  return menu.some((module) =>
    module.sub_modules.some((sm) => {
      if (!submoduleHasAccess(sm)) return false;
      const smKey = (sm.key || '').toLowerCase();
      return subModuleKeys.some((req) => {
        const k = req.toLowerCase();
        return smKey === k || smKey.startsWith(`${k}_`) || k.startsWith(`${smKey}_`);
      });
    })
  );
}
