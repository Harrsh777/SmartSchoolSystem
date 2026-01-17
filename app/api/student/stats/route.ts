import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/student/stats
 * Fetch comprehensive student statistics for dashboard
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

    // Get current month attendance
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startDate = firstDay.toISOString().split('T')[0];
    const endDate = lastDay.toISOString().split('T')[0];

    // Get previous month for comparison
    const prevFirstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevLastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    const prevStartDate = prevFirstDay.toISOString().split('T')[0];
    const prevEndDate = prevLastDay.toISOString().split('T')[0];

    const { data: currentAttendance } = await supabase
      .from('student_attendance')
      .select('status, date')
      .eq('school_code', schoolCode)
      .eq('student_id', studentId)
      .gte('date', startDate)
      .lte('date', endDate);

    const { data: prevAttendance } = await supabase
      .from('student_attendance')
      .select('status, date')
      .eq('school_code', schoolCode)
      .eq('student_id', studentId)
      .gte('date', prevStartDate)
      .lte('date', prevEndDate);

    const currentPresent = currentAttendance?.filter(a => a.status === 'present' || a.status === 'half_day').length || 0;
    const currentTotal = currentAttendance?.length || 0;
    const prevPresent = prevAttendance?.filter(a => a.status === 'present' || a.status === 'half_day').length || 0;
    const prevTotal = prevAttendance?.length || 0;
    
    const currentPercentage = currentTotal > 0 ? Math.round((currentPresent / currentTotal) * 100) : 0;
    const prevPercentage = prevTotal > 0 ? Math.round((prevPresent / prevTotal) * 100) : 0;
    const attendanceChange = currentPercentage - prevPercentage;

    // Calculate GPA from exam marks
    const { data: marks } = await supabase
      .from('student_subject_marks')
      .select('marks_obtained, max_marks, percentage, grade')
      .eq('school_code', schoolCode)
      .eq('student_id', studentId)
      .not('marks_obtained', 'is', null);

    let gpa = 0;
    let gpaRank = 'TOP 5%';
    if (marks && marks.length > 0) {
      const totalPercentage = marks.reduce((sum, m) => sum + (m.percentage || 0), 0);
      const avgPercentage = totalPercentage / marks.length;
      // Convert percentage to GPA (0-4 scale)
      gpa = parseFloat((avgPercentage / 25).toFixed(2)); // 100% = 4.0 GPA
      
      // Calculate rank (simplified - would need class average for real rank)
      if (avgPercentage >= 90) gpaRank = 'TOP 5%';
      else if (avgPercentage >= 80) gpaRank = 'TOP 15%';
      else if (avgPercentage >= 70) gpaRank = 'TOP 25%';
      else gpaRank = 'TOP 50%';
    }

    // Merit points (could be calculated from achievements, awards, etc.)
    // For now, using a simple calculation based on attendance and GPA
    const meritPoints = Math.round((currentPercentage * 0.3) + (gpa * 10));

    // Progress (completed exams / total exams for current term)
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    // Assume term 1: Jan-Jun, term 2: Jul-Dec
    const term = currentMonth < 6 ? `Term 1 (${currentYear})` : `Term 2 (${currentYear})`;
    
    const termStart = currentMonth < 6 
      ? `${currentYear}-01-01`
      : `${currentYear}-07-01`;
    const termEnd = currentMonth < 6
      ? `${currentYear}-06-30`
      : `${currentYear}-12-31`;

    const { data: termExams } = await supabase
      .from('student_subject_marks')
      .select('exam_id')
      .eq('school_code', schoolCode)
      .eq('student_id', studentId)
      .gte('created_at', termStart)
      .lte('created_at', termEnd);

    const { data: allTermExams } = await supabase
      .from('examinations')
      .select('id')
      .eq('school_code', schoolCode)
      .gte('start_date', termStart)
      .lte('end_date', termEnd);

    const progressCurrent = termExams ? new Set(termExams.map(e => e.exam_id)).size : 0;
    const progressTotal = allTermExams?.length || 0;

    return NextResponse.json({
      data: {
        attendance: currentPercentage,
        attendance_change: attendanceChange,
        gpa: gpa.toFixed(2),
        gpa_rank: gpaRank,
        merit_points: meritPoints,
        progress_current: progressCurrent,
        progress_total: progressTotal,
        term: term,
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
