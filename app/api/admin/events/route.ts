import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(_request: NextRequest) {
  try {
    // Fetch exams as events
    const { data: exams } = await supabase
      .from('exams')
      .select('exam_name, exam_date, exam_type, school_id')
      .order('exam_date', { ascending: true })
      .limit(50);

    // Fetch notices as events
    const { data: notices } = await supabase
      .from('notices')
      .select('title, created_at, priority, category, school_id')
      .order('created_at', { ascending: false })
      .limit(20);

    // Combine and format events
    const events: Array<{
      id: string;
      title: string;
      date: string;
      type: 'exam' | 'holiday' | 'meeting' | 'announcement';
      color: string;
    }> = [];

    // Add exams
    exams?.forEach(exam => {
      if (exam.exam_date) {
        events.push({
          id: `exam-${exam.exam_name}-${exam.exam_date}`,
          title: exam.exam_name || 'Exam',
          date: exam.exam_date,
          type: 'exam',
          color: 'red',
        });
      }
    });

    // Add notices as announcements
    notices?.forEach(notice => {
      if (notice.created_at) {
        const noticeDate = new Date(notice.created_at).toISOString().split('T')[0];
        events.push({
          id: `notice-${notice.title}-${notice.created_at}`,
          title: notice.title || 'Announcement',
          date: noticeDate,
          type: notice.category?.toLowerCase() === 'holiday' ? 'holiday' : 
                notice.category?.toLowerCase() === 'meeting' ? 'meeting' : 'announcement',
          color: notice.category?.toLowerCase() === 'holiday' ? 'green' : 
                 notice.category?.toLowerCase() === 'meeting' ? 'blue' : 'purple',
        });
      }
    });

    // Get upcoming events (next 30 days)
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setDate(nextMonth.getDate() + 30);

    const upcomingEvents = events
      .filter(e => {
        const eventDate = new Date(e.date);
        return eventDate >= today && eventDate <= nextMonth;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 10);

    return NextResponse.json({
      data: {
        allEvents: events,
        upcomingEvents,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching events:', error);
    
    // Return sample events if error
    const sampleEvents = [
      { id: '1', title: 'Mid-Term Exams', date: new Date().toISOString().split('T')[0], type: 'exam' as const, color: 'red' },
      { id: '2', title: 'Holiday', date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], type: 'holiday' as const, color: 'green' },
      { id: '3', title: 'Parent Meeting', date: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0], type: 'meeting' as const, color: 'blue' },
    ];

    return NextResponse.json({
      data: {
        allEvents: sampleEvents,
        upcomingEvents: sampleEvents,
      },
    }, { status: 200 });
  }
}

