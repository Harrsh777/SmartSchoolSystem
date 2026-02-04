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
    const schoolCode = searchParams.get('school_code');
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
      .eq('school_code', schoolCode)
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

    console.log(`Found ${data?.length || 0} report cards for school ${schoolCode}`);
    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Error listing report cards:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
