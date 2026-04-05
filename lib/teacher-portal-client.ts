/**
 * Client helpers for the teacher portal when embedding or mirroring admin school modules.
 */

export type TeacherMenuSubModule = {
  key: string;
  has_view_access: boolean;
  has_edit_access: boolean;
};

export type TeacherMenuModule = {
  module_key: string;
  sub_modules: TeacherMenuSubModule[];
};

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
  const response = await fetch(`/api/staff/${teacherId}/menu`);
  const result = await response.json();
  if (!response.ok || !result.data) return null;
  return result.data as TeacherMenuModule[];
}

/** True if the menu grants view access to any of the given sub_module keys. */
export function menuHasSubmoduleView(menu: TeacherMenuModule[], subModuleKeys: string[]): boolean {
  return menu.some((module) =>
    module.sub_modules.some(
      (sm) => subModuleKeys.includes(sm.key) && sm.has_view_access
    )
  );
}
