import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/student/weekly-completion
 * Calculate weekly completion percentage and pending assignments
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

    // Get current week (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekStart = monday.toISOString().split('T')[0];
    const weekEnd = sunday.toISOString().split('T')[0];

    // Get completed diary entries (assignments/homework) for this week
    const { data: completedDiaries } = await supabase
      .from('diaries')
      .select('id')
      .eq('school_code', schoolCode)
      .contains('target_students', [studentId])
      .gte('due_date', weekStart)
      .lte('due_date', weekEnd)
      .eq('status', 'completed');

    // Get total diary entries (assignments) for this week
    const { data: totalDiaries } = await supabase
      .from('diaries')
      .select('id')
      .eq('school_code', schoolCode)
      .contains('target_students', [studentId])
      .gte('due_date', weekStart)
      .lte('due_date', weekEnd)
      .neq('status', 'cancelled');

    const completedCount = completedDiaries?.length || 0;
    const totalCount = totalDiaries?.length || 0;
    const weeklyCompletion = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const assignmentsToComplete = totalCount - completedCount;

    return NextResponse.json({
      data: {
        weekly_completion: weeklyCompletion,
        assignments_to_complete: Math.max(assignmentsToComplete, 0),
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching weekly completion:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
