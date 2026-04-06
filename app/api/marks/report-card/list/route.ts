import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/marks/report-card/list
 * List all generated report cards for a school
 * Query: school_code, class_name?, section?, exam_id?, student_id?
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCodeRaw = searchParams.get('school_code');
    /** Trim only; URL segment and DB should match. Use ilike so ARUSHI vs arushi still lists rows. */
    const schoolCode = schoolCodeRaw?.trim() || '';
    const classFilter = searchParams.get('class_name');
    const sectionFilter = searchParams.get('section');
    const examFilter = searchParams.get('exam_id');
    const studentFilter = searchParams.get('student_id');

    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    // Order by updated_at desc so re-generated cards appear first; fallback to created_at
    let query = supabase
      .from('report_cards')
      .select('id, school_code, student_id, exam_id, student_name, admission_no, class_name, section, academic_year, created_at, updated_at, sent_at')
      .ilike('school_code', schoolCode)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (classFilter) query = query.eq('class_name', classFilter);
    if (sectionFilter) query = query.eq('section', sectionFilter);
    if (examFilter) query = query.eq('exam_id', examFilter);
    if (studentFilter) query = query.eq('student_id', studentFilter);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching report cards:', error);
      if (error.code === '42P01') {
        return NextResponse.json({
          data: [],
          message: 'Report cards table not found. Run scripts/report_cards-table.sql to create it.',
        });
      }
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    const rows = Array.isArray(data) ? data : [];
    const studentIds = Array.from(new Set(rows.map((r) => String(r.student_id || '')).filter(Boolean)));
    let rollByStudentId = new Map<string, string>();
    if (studentIds.length > 0) {
      const { data: students } = await supabase
        .from('students')
        .select('id, roll_number')
        .ilike('school_code', schoolCode)
        .in('id', studentIds);
      rollByStudentId = new Map(
        (students || []).map((s) => [String(s.id), s.roll_number ? String(s.roll_number) : ''])
      );
    }

    const withRoll = rows.map((r) => ({
      ...r,
      roll_number: rollByStudentId.get(String(r.student_id || '')) || '',
    }));

    console.log(`Found ${withRoll.length || 0} report cards for school ${schoolCode}`);
    return NextResponse.json({ data: withRoll });
  } catch (error) {
    console.error('Error listing report cards:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
