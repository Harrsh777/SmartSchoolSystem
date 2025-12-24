import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const search = searchParams.get('search');

    // Build query - fetch all exams or filter by school
    let query = supabase
      .from('exams')
      .select(`
        *,
        accepted_schools:school_id (
          school_name,
          school_code
        )
      `)
      .order('start_date', { ascending: false });

    // Apply filters
    if (schoolCode) {
      query = query.eq('school_code', schoolCode);
    }

    const { data: exams, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch exams', details: error.message },
        { status: 500 }
      );
    }

    // Get schedule counts for each exam
    const examsWithCounts = await Promise.all(
      (exams || []).map(async (exam: any) => {
        const { count } = await supabase
          .from('exam_schedules')
          .select('*', { count: 'exact', head: true })
          .eq('exam_id', exam.id);

        return {
          ...exam,
          schedule_count: count || 0,
        };
      })
    );

    // Apply search filter if provided
    let filteredExams = examsWithCounts;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredExams = filteredExams.filter((e: any) =>
        e.name?.toLowerCase().includes(searchLower) ||
        e.school_code?.toLowerCase().includes(searchLower) ||
        e.academic_year?.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({ data: filteredExams }, { status: 200 });
  } catch (error) {
    console.error('Error fetching exams:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

