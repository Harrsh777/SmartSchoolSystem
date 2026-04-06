import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { verifyManualAttendanceOrSchoolSession } from '@/lib/manual-attendance-access';
import { resolveAcademicYear } from '@/lib/academic-year-id';
import { assertAcademicYearNotLocked } from '@/lib/academic-year-lock';

type ManualAttendanceAccessSupabase = {
  from: (t: string) => {
    select: (c: string) => {
      eq: (a: string, v: string) => {
        single: () => Promise<{ data: unknown; error: { message?: string } | null }>;
        maybeSingle: () => Promise<{ data: unknown; error: { message?: string } | null }>;
      };
    };
  };
};

type RowInput = { student_id?: string; attended_days?: unknown };

const BATCH_SIZE = 45;

function parsePositiveInt(v: unknown, field: string): { ok: true; n: number } | { ok: false; err: string } {
  if (v === '' || v === null || v === undefined) {
    return { ok: false, err: `${field} is required` };
  }
  if (typeof v === 'number') {
    if (!Number.isFinite(v) || !Number.isInteger(v)) {
      return { ok: false, err: `${field} must be a whole number` };
    }
    return { ok: true, n: v };
  }
  if (typeof v === 'string') {
    const t = v.trim();
    if (t === '') return { ok: false, err: `${field} is required` };
    if (!/^-?\d+$/.test(t)) {
      return { ok: false, err: `${field} must be a whole number (no decimals)` };
    }
    const n = parseInt(t, 10);
    if (!Number.isFinite(n)) return { ok: false, err: `${field} is invalid` };
    return { ok: true, n };
  }
  return { ok: false, err: `${field} is invalid` };
}

function computePercentage(attended: number, twd: number): number {
  if (twd <= 0) return 0;
  return Math.round((attended / twd) * 10000) / 100;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function upsertBatch(
  supabase: ReturnType<typeof getServiceRoleClient>,
  rows: Record<string, unknown>[],
  retries: number
): Promise<{ error: { message?: string } | null }> {
  let last: { message?: string } | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    const { error } = await supabase
      .from('student_manual_attendance')
      .upsert(rows, {
        onConflict: 'school_code,class_id,academic_year,student_id',
        ignoreDuplicates: false,
      });
    if (!error) return { error: null };
    last = error;
    const msg = error.message || '';
    if (msg.includes('does not exist') && msg.includes('student_manual_attendance')) {
      return { error };
    }
    await sleep(200 * (attempt + 1));
  }
  return { error: last };
}

/**
 * POST /api/attendance/manual/bulk
 * Body: school_code, class_id, academic_year, total_working_days, marked_by,
 *       fill_unfilled_with_zero (boolean, default true),
 *       records: [{ student_id, attended_days }]
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const school_code = String(body.school_code ?? '').trim();
    const class_id = String(body.class_id ?? '').trim();
    const academic_year = String(body.academic_year ?? '').trim();
    const marked_by = String(body.marked_by ?? '').trim();
    const fill_unfilled_with_zero = body.fill_unfilled_with_zero !== false;
    const records = body.records as RowInput[] | undefined;

    if (!school_code || !class_id || !academic_year || !marked_by) {
      return NextResponse.json(
        { error: 'school_code, class_id, academic_year, and marked_by are required' },
        { status: 400 }
      );
    }

    const twdParsed = parsePositiveInt(body.total_working_days, 'total_working_days');
    if (!twdParsed.ok) {
      return NextResponse.json({ error: twdParsed.err }, { status: 400 });
    }
    const total_working_days = twdParsed.n;
    if (total_working_days <= 0) {
      return NextResponse.json(
        { error: 'total_working_days must be greater than 0' },
        { status: 400 }
      );
    }

    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'records must be a non-empty array' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    // Avoid deep generic instantiation from the full Supabase client type at this boundary.
    const access = await verifyManualAttendanceOrSchoolSession(
      request,
      supabase as unknown as ManualAttendanceAccessSupabase,
      school_code,
      class_id,
      marked_by
    );
    if (!access.ok) return access.response;

    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const { data: classRow, error: classError } = await supabase
      .from('classes')
      .select('id, class, section, academic_year')
      .eq('id', class_id)
      .eq('school_code', school_code)
      .maybeSingle();

    if (classError || !classRow) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const classYear = String(classRow.academic_year ?? '').trim();
    if (classYear && classYear !== academic_year) {
      return NextResponse.json(
        { error: 'academic_year must match the selected class record' },
        { status: 400 }
      );
    }

    let resolvedAcademicYearId: string | null = null;
    try {
      resolvedAcademicYearId = (
        await resolveAcademicYear({
          schoolCode: school_code,
          academic_year,
        })
      ).yearId;
    } catch {
      /* optional lock */
    }

    const adminOverride = request.headers.get('x-admin-override') === 'true';
    if (resolvedAcademicYearId) {
      const lockCheck = await assertAcademicYearNotLocked({
        schoolCode: school_code,
        academic_year_id: resolvedAcademicYearId,
        adminOverride,
      });
      if (lockCheck) return lockCheck;
    }

    const sectionVal = classRow.section;
    let studentQuery = supabase
      .from('students')
      .select('id')
      .eq('school_code', school_code)
      .eq('class', classRow.class)
      .eq('status', 'active');

    if (sectionVal == null || String(sectionVal).trim() === '') {
      studentQuery = studentQuery.is('section', null);
    } else {
      studentQuery = studentQuery.eq('section', sectionVal);
    }

    if (academic_year) {
      studentQuery = studentQuery.or(`academic_year.eq.${academic_year},academic_year.is.null`);
    }

    const { data: roster, error: rosterError } = await studentQuery;

    if (rosterError) {
      console.error('Manual bulk roster:', rosterError);
      return NextResponse.json(
        { error: 'Failed to load class roster', details: rosterError.message },
        { status: 500 }
      );
    }

    const rosterIds = new Set((roster || []).map((r: { id: string }) => r.id).filter(Boolean));

    const seen = new Set<string>();
    const parsed: { student_id: string; attended_days: number }[] = [];

    for (const raw of records) {
      const sid = String(raw?.student_id ?? '').trim();
      if (!sid) {
        return NextResponse.json({ error: 'Each record must include student_id' }, { status: 400 });
      }
      if (seen.has(sid)) {
        return NextResponse.json(
          { error: 'Duplicate student_id in request', details: sid },
          { status: 400 }
        );
      }
      seen.add(sid);

      const ad = parsePositiveInt(raw?.attended_days, 'attended_days');
      if (!ad.ok) {
        return NextResponse.json({ error: ad.err, details: { student_id: sid } }, { status: 400 });
      }
      if (ad.n < 0) {
        return NextResponse.json(
          { error: 'attended_days must be >= 0', details: { student_id: sid } },
          { status: 400 }
        );
      }
      if (ad.n > total_working_days) {
        return NextResponse.json(
          {
            error: 'attended_days cannot exceed total_working_days',
            details: { student_id: sid, attended_days: ad.n, total_working_days },
          },
          { status: 400 }
        );
      }
      if (!rosterIds.has(sid)) {
        return NextResponse.json(
          { error: 'Student is not in this class/section for this school', details: { student_id: sid } },
          { status: 400 }
        );
      }
      parsed.push({ student_id: sid, attended_days: ad.n });
    }

    if (fill_unfilled_with_zero) {
      for (const id of rosterIds) {
        if (!seen.has(id)) {
          parsed.push({ student_id: id, attended_days: 0 });
          seen.add(id);
        }
      }
    }

    if (parsed.length === 0) {
      return NextResponse.json(
        { error: 'No records to save. Enable fill missing with zero or enter at least one student.' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const upsertRows = parsed.map((r) => ({
      school_id: schoolData.id,
      school_code,
      class_id,
      academic_year,
      student_id: r.student_id,
      total_working_days,
      attended_days: r.attended_days,
      attendance_percentage: computePercentage(r.attended_days, total_working_days),
      created_by: marked_by,
      updated_by: marked_by,
      updated_at: nowIso,
    }));

    let saved = 0;
    for (let i = 0; i < upsertRows.length; i += BATCH_SIZE) {
      const chunk = upsertRows.slice(i, i + BATCH_SIZE);
      const { error } = await upsertBatch(supabase, chunk, 3);
      if (error) {
        const msg = error.message || '';
        if (msg.includes('student_manual_attendance') && msg.includes('does not exist')) {
          return NextResponse.json(
            {
              error: 'Manual attendance is not set up',
              details: 'Run sql/student_manual_attendance.sql on your database.',
            },
            { status: 503 }
          );
        }
        console.error('Manual bulk upsert:', error);
        return NextResponse.json(
          { error: 'Failed to save manual attendance', details: error.message, saved_so_far: saved },
          { status: 500 }
        );
      }
      saved += chunk.length;
    }

    return NextResponse.json(
      {
        message: 'Manual attendance saved',
        data: {
          updated_count: saved,
          total_working_days,
          academic_year,
          class_id,
        },
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('POST manual bulk:', e);
    return NextResponse.json(
      { error: 'Internal server error', details: e instanceof Error ? e.message : undefined },
      { status: 500 }
    );
  }
}
