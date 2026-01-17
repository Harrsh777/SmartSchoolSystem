import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Fetch recent student submissions for a teacher
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const teacherId = searchParams.get('teacher_id');

    if (!schoolCode || !teacherId) {
      return NextResponse.json(
        { error: 'school_code and teacher_id are required' },
        { status: 400 }
      );
    }

    // Get classes assigned to this teacher
    const { data: classes } = await supabase
      .from('classes')
      .select('id, class, section')
      .eq('school_code', schoolCode)
      .or(`class_teacher_id.eq.${teacherId},class_teacher_staff_id.eq.${teacherId}`);

    if (!classes || classes.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Fetch recent submissions
    // Note: This assumes you have a submissions table or can derive from assignment/exam submissions
    // For now, we'll return an empty array with a placeholder structure
    // You'll need to implement based on your actual submission/assignment data structure

    // Placeholder: If you have a submissions table, query it here
    // const { data: submissions } = await supabase
    //   .from('submissions')
    //   .select(`
    //     *,
    //     student:students!submissions_student_id_fkey(
    //       id,
    //       student_name,
    //       admission_no
    //     )
    //   `)
    //   .in('class_id', classIds)
    //   .eq('school_code', schoolCode)
    //   .order('submitted_at', { ascending: false })
    //   .limit(limit);

    // For now, return empty array - implement based on your actual submission structure
    const submissions: Array<{
      id: string;
      file_name: string;
      file_type: string;
      student_name: string;
      admission_no: string;
      submitted_at: string;
    }> = [];

    return NextResponse.json({ data: submissions }, { status: 200 });
  } catch (error) {
    console.error('Error fetching recent submissions:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
