import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionData } from '@/lib/session-store';
import { fetchTeachingByClass, staffTeachesSubject } from '@/lib/teacher-timetable-teaching';
import { isStaffClassTeacherForClass } from '@/lib/staff-class-teacher';
import type { Staff } from '@/lib/supabase';

type DiaryRowMinimal = {
  school_code: string;
  created_by?: string | null;
  subject_id?: string | null;
  mode?: string | null;
  academic_year_id?: string | null;
};

export type DiaryTargetRow = {
  class_name: string;
  section_name?: string | null;
  class_id?: string | null;
};

export async function isSchoolAdminStaff(supabase: SupabaseClient, staffId: string): Promise<boolean> {
  const { data } = await supabase
    .from('staff_roles')
    .select(
      `
      roles!inner(
        role_key,
        role_name
      )
    `
    )
    .eq('staff_id', staffId)
    .eq('is_active', true);

  const roles = data as unknown as Array<{ roles: { role_key?: string; role_name?: string } }>;
  if (!roles?.length) return false;
  const adminSignals = /\b(admin|super)\b/i;
  for (const row of roles) {
    const r = row.roles;
    const text = `${r.role_key ?? ''} ${r.role_name ?? ''}`;
    if (adminSignals.test(text)) return true;
  }
  return false;
}

/**
 * Manual Digital Diary submodule grant via RBAC (`digital_diary_main`).
 * Independent of class-teacher / timetable auto access.
 */
export async function staffHasExplicitDigitalDiaryPermission(
  supabase: SupabaseClient,
  staffId: string
): Promise<boolean> {
  const { data: sm, error: smErr } = await supabase
    .from('sub_modules')
    .select('id')
    .eq('sub_module_key', 'digital_diary_main')
    .maybeSingle();

  if (smErr || !sm?.id) return false;
  const subModuleId = sm.id as string;

  const { data: direct } = await supabase
    .from('staff_permissions')
    .select('view_access, edit_access')
    .eq('staff_id', staffId)
    .eq('sub_module_id', subModuleId)
    .limit(20);

  if (
    (direct || []).some(
      (row: { view_access?: boolean; edit_access?: boolean }) =>
        Boolean(row.view_access) || Boolean(row.edit_access)
    )
  ) {
    return true;
  }

  const { data: sr } = await supabase
    .from('staff_roles')
    .select('role_id')
    .eq('staff_id', staffId)
    .eq('is_active', true);

  const roleIds = (sr || []).map((r: { role_id: string }) => r.role_id).filter(Boolean);
  if (roleIds.length === 0) return false;

  const { data: rp } = await supabase
    .from('role_permissions')
    .select('view_access, edit_access')
    .in('role_id', roleIds)
    .eq('sub_module_id', subModuleId)
    .limit(50);

  return (rp || []).some(
    (row: { view_access?: boolean; edit_access?: boolean }) =>
      Boolean(row.view_access) || Boolean(row.edit_access)
  );
}

/**
 * Resolve class id for diary target (prefer class_id, else classes by name/section/year).
 */
export async function resolveClassIdForDiaryTarget(
  supabase: SupabaseClient,
  schoolCode: string,
  target: DiaryTargetRow,
  academicYearId?: string | null
): Promise<string | null> {
  const cidRaw = target.class_id != null ? String(target.class_id).trim() : '';
  if (cidRaw) return cidRaw;

  let q = supabase
    .from('classes')
    .select('id')
    .eq('school_code', schoolCode)
    .eq('class', target.class_name);
  if (academicYearId) {
    q = q.eq('academic_year', academicYearId);
  }
  if (target.section_name != null && String(target.section_name).trim() !== '') {
    q = q.eq('section', target.section_name);
  }
  const { data, error } = await q.limit(1).maybeSingle();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

export async function staffCanManageDiary(
  supabase: SupabaseClient,
  diary: DiaryRowMinimal,
  staffId: string,
  targets: DiaryTargetRow[]
): Promise<boolean> {
  const schoolCode = diary.school_code;

  let teachingCached: ReturnType<typeof fetchTeachingByClass> | null = null;
  const teaching = (): ReturnType<typeof fetchTeachingByClass> => {
    if (!teachingCached) teachingCached = fetchTeachingByClass(supabase, schoolCode, staffId);
    return teachingCached;
  };

  const classIds: string[] = [];
  for (const t of targets) {
    const cid = await resolveClassIdForDiaryTarget(supabase, schoolCode, t, diary.academic_year_id);
    if (cid) classIds.push(cid);
  }
  if (classIds.length === 0) return false;

  for (const classId of classIds) {
    const isCt = await isStaffClassTeacherForClass(supabase, schoolCode, staffId, classId);
    if (isCt) return true;

    const map = await teaching();
    if (!staffTeachesSubject(map, classId, diary.subject_id || '')) {
      continue;
    }
    if (diary.mode === 'SUBJECT_WISE') {
      if (!diary.subject_id) continue;
      return true;
    }
    return true;
  }
  return false;
}

/**
 * Caller must pass merged session-school (session.user_payload.school_code or session.school_code).
 */
export async function assertTeacherCanAccessDiary(
  supabase: SupabaseClient,
  session: SessionData,
  diary: DiaryRowMinimal,
  targets: DiaryTargetRow[]
): Promise<boolean> {
  if (session.role !== 'teacher' || !session.user_id) return false;

  const payload = session.user_payload as Staff | null | undefined;
  const diarySc = diary.school_code.trim().toUpperCase();
  const ses1 = session.school_code ? String(session.school_code).trim().toUpperCase() : '';
  const ses2 = payload?.school_code ? String(payload.school_code).trim().toUpperCase() : '';
  const schoolOk = ses1 === diarySc || ses2 === diarySc;
  if (!schoolOk) return false;

  if (await isSchoolAdminStaff(supabase, session.user_id)) return true;

  const createdBy = diary.created_by != null ? String(diary.created_by) : '';
  if (createdBy && createdBy === session.user_id) return true;

  return staffCanManageDiary(supabase, diary, session.user_id, targets);
}

export async function assertTeacherCanCreateDiary(
  supabase: SupabaseClient,
  session: SessionData,
  diary: DiaryRowMinimal,
  targets: DiaryTargetRow[]
): Promise<boolean> {
  if (session.role !== 'teacher' || !session.user_id) return false;

  const payload = session.user_payload as Staff | null | undefined;
  const diarySc = diary.school_code.trim().toUpperCase();
  const ses1 = session.school_code ? String(session.school_code).trim().toUpperCase() : '';
  const ses2 = payload?.school_code ? String(payload.school_code).trim().toUpperCase() : '';
  if (ses1 !== diarySc && ses2 !== diarySc) return false;

  if (await isSchoolAdminStaff(supabase, session.user_id)) return true;

  if (await staffHasExplicitDigitalDiaryPermission(supabase, session.user_id)) return true;

  return staffCanManageDiary(supabase, diary, session.user_id, targets);
}

export type TeacherDiaryClassOption = {
  id: string;
  class: string;
  section: string;
  academic_year: string;
  /** class teacher for this section row */
  is_class_teacher: boolean;
  /** subject teacher on timetable for this section */
  is_subject_teacher: boolean;
};

/**
 * Classes a teacher may target when creating a diary entry.
 * Admin / explicit Digital Diary RBAC → all school classes; otherwise class-teacher + timetable sections only.
 */
export async function getTeacherDiaryClassOptions(
  supabase: SupabaseClient,
  staffRowId: string,
  schoolCode: string,
  academicYear?: string | null
): Promise<{ can_select_all: boolean; data: TeacherDiaryClassOption[] }> {
  const sc = String(schoolCode || '').trim();
  if (!staffRowId || !sc) {
    return { can_select_all: false, data: [] };
  }

  const canSelectAll =
    (await isSchoolAdminStaff(supabase, staffRowId)) ||
    (await staffHasExplicitDigitalDiaryPermission(supabase, staffRowId));

  let query = supabase
    .from('classes')
    .select('id, class, section, academic_year')
    .eq('school_code', sc)
    .order('class', { ascending: true })
    .order('section', { ascending: true });

  if (academicYear) {
    query = query.eq('academic_year', academicYear);
  }

  if (canSelectAll) {
    const { data, error } = await query;
    if (error || !data?.length) {
      return { can_select_all: true, data: [] };
    }
    return {
      can_select_all: true,
      data: data.map((row) => ({
        id: row.id as string,
        class: String(row.class ?? ''),
        section: String(row.section ?? ''),
        academic_year: String(row.academic_year ?? ''),
        is_class_teacher: false,
        is_subject_teacher: false,
      })),
    };
  }

  const { data: staffRow } = await supabase
    .from('staff')
    .select('staff_id')
    .eq('id', staffRowId)
    .eq('school_code', sc)
    .maybeSingle();

  const ctParts: string[] = [`class_teacher_id.eq.${staffRowId}`];
  const empId = staffRow?.staff_id != null ? String(staffRow.staff_id).trim() : '';
  if (empId) ctParts.push(`class_teacher_staff_id.eq.${empId}`);

  let ctQuery = supabase
    .from('classes')
    .select('id, class, section, academic_year')
    .eq('school_code', sc)
    .or(ctParts.join(','));

  if (academicYear) {
    ctQuery = ctQuery.eq('academic_year', academicYear);
  }

  const { data: ctRows } = await ctQuery;
  const teaching = await fetchTeachingByClass(supabase, sc, staffRowId);
  const teachingClassIds = Array.from(teaching.keys());

  let stRows: Array<{ id: string; class: string; section: string; academic_year: string }> = [];
  if (teachingClassIds.length > 0) {
    let stQuery = supabase
      .from('classes')
      .select('id, class, section, academic_year')
      .eq('school_code', sc)
      .in('id', teachingClassIds);
    if (academicYear) {
      stQuery = stQuery.eq('academic_year', academicYear);
    }
    const { data } = await stQuery;
    stRows = (data || []) as typeof stRows;
  }

  const ctIdSet = new Set((ctRows || []).map((r) => r.id as string));
  const byId = new Map<string, TeacherDiaryClassOption>();

  for (const row of ctRows || []) {
    byId.set(row.id as string, {
      id: row.id as string,
      class: String(row.class ?? ''),
      section: String(row.section ?? ''),
      academic_year: String(row.academic_year ?? ''),
      is_class_teacher: true,
      is_subject_teacher: teaching.has(row.id as string),
    });
  }

  for (const row of stRows) {
    const existing = byId.get(row.id);
    if (existing) {
      existing.is_subject_teacher = true;
    } else {
      byId.set(row.id, {
        id: row.id,
        class: String(row.class ?? ''),
        section: String(row.section ?? ''),
        academic_year: String(row.academic_year ?? ''),
        is_class_teacher: false,
        is_subject_teacher: true,
      });
    }
  }

  return {
    can_select_all: false,
    data: Array.from(byId.values()).sort((a, b) => {
      const c = a.class.localeCompare(b.class);
      if (c !== 0) return c;
      return a.section.localeCompare(b.section);
    }),
  };
}

function normDiaryScope(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}

export function studentTargetMatchesDiary(
  diarySchoolCode: string,
  studentSchoolCode: string,
  studentClassName: string,
  studentSection: string | null | undefined,
  targets: DiaryTargetRow[]
): boolean {
  if (studentSchoolCode.trim().toUpperCase() !== diarySchoolCode.trim().toUpperCase()) return false;

  const studentClass = normDiaryScope(studentClassName);
  const studentSec = normDiaryScope(studentSection);

  return targets.some((t) => {
    if (normDiaryScope(t.class_name) !== studentClass) return false;
    const targetSec = normDiaryScope(t.section_name);
    if (!targetSec) return true;
    if (!studentSec) return true;
    return targetSec === studentSec;
  });
}
