import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/marks/report-card/student
 * List report cards that have been sent to a student (sent_at is set).
 * Query: school_code, student_id
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const studentId = searchParams.get('student_id');

    if (!schoolCode || !studentId) {
      return NextResponse.json(
        { error: 'school_code and student_id are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    const { data, error } = await supabase
      .from('report_cards')
      .select('id, student_name, admission_no, class_name, section, academic_year, created_at, sent_at')
      .eq('school_code', schoolCode)
      .eq('student_id', studentId)
      .not('sent_at', 'is', null)
      .order('sent_at', { ascending: false });

    if (error) {
      console.error('Error fetching student report cards:', error);
      if (error.code === '42P01') {
        return NextResponse.json({ data: [], message: 'Report cards table not found.' });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Error in student report cards list:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
