import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session-store';

type QueryResult = Promise<{ data: unknown; error: { message?: string } | null }>;

/** Chained filters: `.eq().eq().single()` etc. */
type FilterChain = {
  eq: (a: string, v: string) => FilterChain;
  single: () => QueryResult;
  maybeSingle: () => QueryResult;
};

export type SupabaseLike = {
  from: (t: string) => {
    select: (c: string) => FilterChain;
  };
};

type StaffRow = {
  id: string;
  staff_id?: string | null;
  role?: string | null;
  designation?: string | null;
};

type ClassTeacherRow = {
  class_teacher_id?: string | null;
  class_teacher_staff_id?: string | null;
};

function isPrivilegedStaff(staff: StaffRow): boolean {
  const role = (staff.role || '').toLowerCase();
  const des = (staff.designation || '').toLowerCase();
  return (
    role.includes('admin') ||
    role.includes('principal') ||
    des.includes('admin') ||
    des.includes('principal')
  );
}

export async function verifyManualAttendanceAccess(
  /** Real Supabase client is fine; typed as `unknown` to avoid deep generic instantiation at call sites. */
  supabase: unknown,
  school_code: string,
  class_id: string,
  marked_by: string
): Promise<
  | { ok: true; staff: StaffRow; isPrivileged: boolean }
  | { ok: false; response: NextResponse }
> {
  const db = supabase as SupabaseLike;
  const { data: staffRaw, error: staffError } = await db
    .from('staff')
    .select('id, staff_id, role, designation')
    .eq('id', marked_by)
    .eq('school_code', school_code)
    .single();

  if (staffError || !staffRaw) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Staff not found', details: staffError?.message },
        { status: 404 }
      ),
    };
  }

  const staff = staffRaw as StaffRow;

  if (isPrivilegedStaff(staff)) {
    return { ok: true, staff, isPrivileged: true };
  }

  const { data: clsRaw, error: classError } = await db
    .from('classes')
    .select('class_teacher_id, class_teacher_staff_id')
    .eq('id', class_id)
    .eq('school_code', school_code)
    .maybeSingle();

  if (classError || !clsRaw) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Class not found', details: classError?.message },
        { status: 404 }
      ),
    };
  }

  const cls = clsRaw as ClassTeacherRow;
  const isClassTeacher =
    cls.class_teacher_id === marked_by ||
    (staff.staff_id != null &&
      String(staff.staff_id) !== '' &&
      cls.class_teacher_staff_id === staff.staff_id);

  if (!isClassTeacher) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Only administrators or the class teacher can edit manual attendance',
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true, staff, isPrivileged: false };
}

/**
 * School dashboard login uses role `school` and does not store a staff row in session.
 * If the request has a valid school session for this `school_code`, allow manual attendance
 * when `marked_by` is any staff UUID belonging to that school (audit trail).
 */
export async function verifyManualAttendanceOrSchoolSession(
  request: NextRequest,
  /** Real Supabase client is fine; typed as `unknown` to avoid deep generic instantiation at call sites. */
  supabase: unknown,
  school_code: string,
  class_id: string,
  marked_by: string
): Promise<
  | { ok: true; staff: StaffRow; isPrivileged: boolean }
  | { ok: false; response: NextResponse }
> {
  const db = supabase as SupabaseLike;
  const session = await getSessionFromRequest(request);
  const want = String(school_code || '')
    .trim()
    .toUpperCase();
  const have = String(session?.school_code || '')
    .trim()
    .toUpperCase();

  if (session && session.role === 'school' && want !== '' && have === want) {
    const { data: staffRaw, error: staffError } = await db
      .from('staff')
      .select('id, staff_id, role, designation')
      .eq('id', marked_by)
      .eq('school_code', school_code)
      .maybeSingle();

    if (staffError || !staffRaw) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Staff not found for this school', details: staffError?.message },
          { status: 404 }
        ),
      };
    }

    return { ok: true, staff: staffRaw as StaffRow, isPrivileged: true };
  }

  return verifyManualAttendanceAccess(db, school_code, class_id, marked_by);
}
