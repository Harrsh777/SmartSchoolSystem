import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/session-store';
import { isSchoolAdminStaff } from '@/lib/digital-diary-access';
import { buildAssignmentSubmissionRollup } from '@/lib/digital-diary-submission-stats';

/**
 * GET /api/diary/stats?school_code=&academic_year_id=
 * Returns total diary count + assignment submission analytics for the teacher portal.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const academicYearId = searchParams.get('academic_year_id');

    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    const session = await getSessionFromRequest(request);
    if (!session || session.role !== 'teacher' || !session.user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = session.user_payload as { school_code?: string } | null | undefined;
    const sessionSchool = String(session.school_code || payload?.school_code || '').trim().toUpperCase();
    if (sessionSchool !== schoolCode.trim().toUpperCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = await isSchoolAdminStaff(supabase, session.user_id);

    let countQuery = supabase
      .from('diaries')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .is('deleted_at', null);

    if (!admin) countQuery = countQuery.eq('created_by', session.user_id);
    if (academicYearId) countQuery = countQuery.eq('academic_year_id', academicYearId);

    const { count, error } = await countQuery;
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch diary stats', details: error.message }, { status: 500 });
    }

    let assignQuery = supabase
      .from('diaries')
      .select(
        `
        id,
        school_code,
        submissions_allowed,
        diary_targets ( class_name, section_name, class_id )
      `
      )
      .eq('school_code', schoolCode)
      .in('type', ['HOMEWORK', 'ASSIGNMENT'])
      .eq('is_active', true)
      .is('deleted_at', null);

    if (!admin) assignQuery = assignQuery.eq('created_by', session.user_id);
    if (academicYearId) assignQuery = assignQuery.eq('academic_year_id', academicYearId);

    const { data: assignRows } = await assignQuery;
    const assignDiaries = (assignRows || []).map(
      (r: {
        id: string;
        school_code: string;
        submissions_allowed?: boolean | null;
        diary_targets?: Array<{ class_name: string; section_name?: string | null; class_id?: string | null }>;
      }) => ({
        id: r.id,
        school_code: r.school_code,
        submissions_allowed: r.submissions_allowed,
        diary_targets: (r.diary_targets || []).map((t) => ({
          class_name: t.class_name,
          section_name: t.section_name ?? null,
          class_id: t.class_id ?? null,
        })),
      })
    );

    let analytics = {
      total_assignments: assignDiaries.length,
      pending_submissions: 0,
      submission_rate_pct: 0,
      late_submissions: 0,
    };

    if (assignDiaries.length > 0) {
      const rollup = await buildAssignmentSubmissionRollup(supabase, assignDiaries);
      analytics = {
        total_assignments: assignDiaries.length,
        pending_submissions: rollup.pending_submissions,
        submission_rate_pct: rollup.submission_rate_pct,
        late_submissions: rollup.late_submissions,
      };
    }

    return NextResponse.json({
      data: {
        total: count || 0,
        ...analytics,
      },
    });
  } catch (error) {
    console.error('Error fetching diary stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
