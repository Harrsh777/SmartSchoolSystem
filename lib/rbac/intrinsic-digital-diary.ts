import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchTeachingByClass } from '@/lib/teacher-timetable-teaching';
import type { RbacMenuModule } from '@/lib/rbac/teacher-menu-matching';

/** Matches `app/api/modules/route.ts` — used when staff auto-qualifies as class/subject teacher. */
const DIGITAL_DIARY_MODULE: RbacMenuModule = {
  module_name: 'Digital Diary',
  module_key: 'digital_diary',
  display_order: 16,
  sub_modules: [
    {
      key: 'digital_diary_main',
      name: 'Digital Diary',
      route: '/dashboard/[school]/homework',
      has_view_access: true,
      has_edit_access: true,
    },
  ],
};

/** Client-only menu shape aligned with {@link TeacherRbacModule} — no `display_order`. */
export const INTRINSIC_DIGITAL_DIARY_SIDEBAR_MODULE = {
  module_name: 'Digital Diary',
  module_key: 'digital_diary',
  sub_modules: DIGITAL_DIARY_MODULE.sub_modules.map((s) => ({
    name: s.name ?? 'Digital Diary',
    key: s.key,
    route: s.route ?? '',
    has_view_access: s.has_view_access,
    has_edit_access: s.has_edit_access,
  })),
} as const satisfies {
  module_name: string;
  module_key: string;
  sub_modules: Array<{
    name: string;
    key: string;
    route: string;
    has_view_access: boolean;
    has_edit_access: boolean;
  }>;
};

export function menuHasDigitalDiaryAccess(menu: RbacMenuModule[]): boolean {
  const mod = menu.find((m) => m.module_key === 'digital_diary');
  return Boolean(mod?.sub_modules?.some((s) => s.has_view_access || s.has_edit_access));
}

/**
 * True when the staff member is assigned as class teacher for any section in the school,
 * or appears on the class timetable as a subject teacher (timetable_slots).
 */
export async function staffHasIntrinsicDigitalDiaryAccess(
  supabase: SupabaseClient,
  staffId: string,
  schoolCode: string
): Promise<boolean> {
  const sc = String(schoolCode || '').trim();
  if (!staffId || !sc) return false;

  const { data: staffRow } = await supabase
    .from('staff')
    .select('staff_id')
    .eq('id', staffId)
    .eq('school_code', sc)
    .maybeSingle();

  const empId = staffRow?.staff_id != null ? String(staffRow.staff_id).trim() : '';
  const parts: string[] = [`class_teacher_id.eq.${staffId}`];
  if (empId) parts.push(`class_teacher_staff_id.eq.${empId}`);

  const { data: clsRows, error: clsError } = await supabase
    .from('classes')
    .select('id')
    .eq('school_code', sc)
    .or(parts.join(','))
    .limit(1);

  if (!clsError && clsRows && clsRows.length > 0) return true;

  const teaching = await fetchTeachingByClass(supabase, sc, staffId);
  return teaching.size > 0;
}

/** Injects Digital Diary into the staff menu when RBAC did not already grant it. */
export function mergeIntrinsicDigitalDiaryModule(
  menu: RbacMenuModule[],
  includeIntrinsic: boolean
): RbacMenuModule[] {
  if (!includeIntrinsic || menuHasDigitalDiaryAccess(menu)) {
    return menu;
  }
  return [...menu, DIGITAL_DIARY_MODULE].sort((a, b) => (a.display_order ?? 99) - (b.display_order ?? 99));
}
