import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/student/upcoming-items
 * Fetch upcoming exams and events for a student
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const studentId = searchParams.get('student_id');
    const limit = parseInt(searchParams.get('limit') || '3');

    if (!schoolCode || !studentId) {
      return NextResponse.json(
        { error: 'school_code and student_id are required' },
        { status: 400 }
      );
    }

    // Get upcoming exams
    const today = new Date().toISOString().split('T')[0];
    const { data: exams } = await supabase
      .from('examinations')
      .select('id, exam_name, start_date, end_date, status')
      .eq('school_code', schoolCode)
      .in('status', ['upcoming', 'ongoing'])
      .gte('end_date', today)
      .order('start_date', { ascending: true })
      .limit(limit);

    // Get upcoming events
    const { data: events } = await supabase
      .from('events')
      .select('id, title, description, event_date, event_type')
      .eq('school_code', schoolCode)
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(limit);

    const upcomingItems: Array<{
      id: string;
      title: string;
      subtitle: string;
      month: string;
      day: string;
    }> = [];

    // Add exams
    exams?.forEach(exam => {
      const examDate = new Date(exam.start_date || exam.end_date || '');
      if (!isNaN(examDate.getTime())) {
        upcomingItems.push({
          id: exam.id,
          title: exam.exam_name || 'Exam',
          subtitle: 'Examination',
          month: examDate.toLocaleDateString('en-US', { month: 'short' }),
          day: examDate.getDate().toString(),
        });
      }
    });

    // Add events
    events?.forEach(event => {
      const eventDate = new Date(event.event_date || '');
      if (!isNaN(eventDate.getTime())) {
        upcomingItems.push({
          id: event.id,
          title: event.title || 'Event',
          subtitle: event.event_type === 'holiday' ? 'Holiday' : 'Event',
          month: eventDate.toLocaleDateString('en-US', { month: 'short' }),
          day: eventDate.getDate().toString(),
        });
      }
    });

    // Sort by date and limit
    upcomingItems.sort((a, b) => {
      const monthMap: Record<string, number> = {
        'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
        'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
      };
      const aMonth = monthMap[a.month] || 0;
      const bMonth = monthMap[b.month] || 0;
      if (aMonth !== bMonth) return aMonth - bMonth;
      return parseInt(a.day) - parseInt(b.day);
    });

    return NextResponse.json({ data: upcomingItems.slice(0, limit) }, { status: 200 });
  } catch (error) {
    console.error('Error fetching upcoming items:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
