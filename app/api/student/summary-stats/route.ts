import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/student/summary-stats
 * Fetch summary statistics (lessons, quizzes, projects, awards)
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

    // For now, calculate from available data:
    // - Lessons: Could be from diary entries or homework
    // - Quizzes: Could be from exam marks (smaller exams)
    // - Projects: Could be from exam marks (project-based assessments)
    // - Awards: Could be from certificates or achievements

    // Get diary entries (lessons/homework)
    const { data: diaries } = await supabase
      .from('diaries')
      .select('id')
      .eq('school_code', schoolCode)
      .contains('target_students', [studentId])
      .neq('status', 'cancelled');

    // Get exam marks (for quizzes/projects - simplified approach)
    const { data: marks } = await supabase
      .from('student_subject_marks')
      .select('exam_id, examinations!inner(exam_type)')
      .eq('school_code', schoolCode)
      .eq('student_id', studentId);

    // Handle Supabase returning examinations as array
    const quizzes = marks?.filter(m => {
      const examination = Array.isArray(m.examinations) ? m.examinations[0] : m.examinations;
      return examination?.exam_type === 'quiz';
    }).length || 0;
    const projects = marks?.filter(m => {
      const examination = Array.isArray(m.examinations) ? m.examinations[0] : m.examinations;
      return examination?.exam_type === 'project';
    }).length || 0;

    // Get certificates (awards)
    const { data: certificates } = await supabase
      .from('certificates_issued')
      .select('id')
      .eq('school_code', schoolCode)
      .eq('student_id', studentId);

    // For lessons, we'll use diary entries as a proxy
    // In a real system, this might come from a lessons/completed_lessons table
    const lessons = diaries?.length || 0;

    return NextResponse.json({
      data: {
        lessons: lessons,
        quizzes: quizzes,
        projects: projects,
        awards: certificates?.length || 0,
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching summary stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
