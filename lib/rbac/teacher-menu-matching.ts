/**
 * Pure helpers: match teacher-dashboard URL paths against RBAC menu modules
 * (same route templates as admin: `/dashboard/[school]/...`).
 */

export type RbacMenuSubModule = {
  key: string;
  name?: string;
  route?: string;
  has_view_access: boolean;
  has_edit_access: boolean;
};

export type RbacMenuModule = {
  module_key: string;
  module_name?: string;
  display_order?: number;
  sub_modules: RbacMenuSubModule[];
};

function trimSlashes(s: string): string {
  return s.replace(/^\/+/g, '').replace(/\/+$/g, '');
}

/** Normalize DB route_path to slug under `/teacher/dashboard/`. */
export function normalizeRoutePathToTeacherDashboardSlug(routePath: string): string {
  const r = (routePath || '').trim();
  if (!r) return '';
  let m = r.match(/^\/dashboard\/\[[^\]]+\]\/(.*)$/);
  if (m?.[1]) return trimSlashes(m[1]);
  m = r.match(/^\/dashboard\/[A-Za-z0-9_-]+\/(.*)$/);
  if (m?.[1]) return trimSlashes(m[1]);
  m = r.match(/^\/teacher\/dashboard\/?(.*)$/);
  if (m) return trimSlashes(m[1] || '');
  return trimSlashes(r.replace(/^\//, ''));
}

export type TeacherSlugAccess = {
  allowed: boolean;
  canView: boolean;
  canEdit: boolean;
  matchedSubModuleKey?: string;
  matchedModuleKey?: string;
};

function submoduleHasAccess(sm: RbacMenuSubModule): boolean {
  return Boolean(sm.has_view_access || sm.has_edit_access);
}

/**
 * Resolve whether a path under `/teacher/dashboard/<slug>` is covered by the staff menu,
 * and aggregate view/edit flags for the best matching submodule.
 */
export function evaluateTeacherSlugAgainstMenu(
  menu: RbacMenuModule[] | null | undefined,
  slug: string
): TeacherSlugAccess {
  const normalizedSlug = slug.replace(/^\/+|\/+$/g, '').split('?')[0];
  if (!menu?.length || normalizedSlug === '') {
    return { allowed: false, canView: false, canEdit: false };
  }

  let canView = false;
  let canEdit = false;
  let matchedSubModuleKey: string | undefined;
  let matchedModuleKey: string | undefined;

  for (const mod of menu) {
    for (const sm of mod.sub_modules || []) {
      if (!submoduleHasAccess(sm)) continue;
      const route = typeof sm.route === 'string' ? sm.route : '';
      if (!route) continue;
      const rel = normalizeRoutePathToTeacherDashboardSlug(route);
      if (!rel) continue;

      const same = rel === normalizedSlug;
      const slugUnderRoute = normalizedSlug.startsWith(`${rel}/`);
      const routeUnderSlug = rel.startsWith(`${normalizedSlug}/`);
      if (!same && !slugUnderRoute && !routeUnderSlug) continue;

      if (sm.has_view_access) canView = true;
      if (sm.has_edit_access) canEdit = true;
      matchedSubModuleKey = sm.key;
      matchedModuleKey = mod.module_key;
    }
  }

  return {
    allowed: canView || canEdit,
    canView,
    canEdit,
    matchedSubModuleKey,
    matchedModuleKey,
  };
}

/**
 * Path under `/teacher/dashboard` used for RBAC menu matching (same relative paths as
 * `/dashboard/[school]/...` in the database).
 *
 * When the URL is school-scoped (`/teacher/dashboard/<school_code>/fees/...`), the first
 * segment is stripped only if it matches the signed-in teacher's `school_code` from session.
 * Legacy flat URLs (`/teacher/dashboard/fees/...`) keep the full tail as the slug.
 */
export function teacherPathnameToSlug(
  pathname: string,
  sessionSchoolCode?: string | null
): string {
  const prefix = '/teacher/dashboard';
  if (!pathname.startsWith(prefix)) return '';
  let rest = pathname.slice(prefix.length).replace(/^\//, '');
  rest = rest.split('?')[0].replace(/\/+$/g, '');
  if (!rest) return '';
  const parts = rest.split('/').filter(Boolean);
  const sc = sessionSchoolCode?.trim();
  if (sc && parts[0]?.toUpperCase() === sc.toUpperCase()) {
    return parts.slice(1).join('/');
  }
  return parts.join('/');
}
