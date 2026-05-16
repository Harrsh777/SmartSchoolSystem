import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/session-store';
import { isSchoolAdminStaff } from '@/lib/digital-diary-access';
import { buildAssignmentSubmissionRollup } from '@/lib/digital-diary-submission-stats';

/**
 * GET ?school_code=&academic_year_id=
 * Teacher: own HOMEWORK/ASSIGNMENT postings + submission rollup. Admin staff: school-wide postings.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== 'teacher' || !session.user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const schoolCode = sp.get('school_code');
    const academicYearId = sp.get('academic_year_id') || sp.get('academic_year');
    if (!schoolCode) {
      return NextResponse.json({ error: 'school_code required' }, { status: 400 });
    }

    const payload = session.user_payload as { school_code?: string } | null | undefined;
    const sessionSchool = String(session.school_code || payload?.school_code || '').trim().toUpperCase();
    if (sessionSchool !== schoolCode.trim().toUpperCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = await isSchoolAdminStaff(supabase, session.user_id);

    let dq = supabase
      .from('diaries')
      .select(
        `
        id,
        school_code,
        due_at,
        submissions_allowed,
        created_by,
        diary_targets ( class_name, section_name, class_id )
      `
      )
      .eq('school_code', schoolCode)
      .in('type', ['HOMEWORK', 'ASSIGNMENT'])
      .eq('is_active', true)
      .is('deleted_at', null);

    if (!admin) dq = dq.eq('created_by', session.user_id);
    if (academicYearId) dq = dq.eq('academic_year_id', academicYearId);

    const { data: diaries, error: dErr } = await dq;
    if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

    const assignDiaries = (diaries || []).map(
      (d: {
        id: string;
        school_code: string;
        submissions_allowed?: boolean | null;
        diary_targets?: Array<{ class_name: string; section_name?: string | null; class_id?: string | null }>;
      }) => ({
        id: d.id,
        school_code: d.school_code,
        submissions_allowed: d.submissions_allowed,
        diary_targets: (d.diary_targets || []).map((t) => ({
          class_name: t.class_name,
          section_name: t.section_name ?? null,
          class_id: t.class_id ?? null,
        })),
      })
    );
    const totalAssignments = assignDiaries.length;

    if (totalAssignments === 0) {
      return NextResponse.json({
        data: {
          total_assignments: 0,
          pending_submissions: 0,
          submission_rate_pct: 0,
          late_submissions: 0,
        },
      });
    }

    const rollup = await buildAssignmentSubmissionRollup(supabase, assignDiaries);

    return NextResponse.json({
      data: {
        total_assignments: totalAssignments,
        pending_submissions: rollup.pending_submissions,
        submission_rate_pct: rollup.submission_rate_pct,
        late_submissions: rollup.late_submissions,
      },
    });
  } catch (e) {
    console.error('teacher-analytics', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
