import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get academic calendar - fetches from both events table and academic_calendar table
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const academicYear = searchParams.get('academic_year');
    const includeEventsParam = searchParams.get('include_events');
    const includeEvents = includeEventsParam == null ? true : includeEventsParam !== 'false';

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Fetch from events table (where new events are created) - optional
    let events: Array<{ [key: string]: unknown }> = [];
    if (includeEvents) {
      let eventsQuery = supabase
        .from('events')
        .select('id,event_date,title,event_type,description,color')
        .eq('school_code', schoolCode)
        .eq('is_active', true);

      // Filter by academic year if provided (extract year from event_date)
      if (academicYear) {
        const yearStart = `${academicYear}-01-01`;
        const yearEnd = `${academicYear}-12-31`;
        eventsQuery = eventsQuery
          .gte('event_date', yearStart)
          .lte('event_date', yearEnd);
      }

      const { data: eventsData, error: eventsError } = await eventsQuery
        .order('event_date', { ascending: true });

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        // Continue even if events fetch fails, try academic_calendar
      } else {
        events = eventsData || [];
      }
    }

    // Fetch examinations and expand to one entry per day (start_date to end_date)
    const yearStart = academicYear ? `${academicYear}-01-01` : '';
    const yearEnd = academicYear ? `${academicYear}-12-31` : '';
    const examEntries: Array<{ event_date: string; title: string; event_type: string; source: string; exam_id?: string; [key: string]: unknown }> = [];
    if (schoolCode) {
      let examQuery = supabase
        .from('examinations')
        .select('id, exam_name, start_date, end_date')
        .eq('school_code', schoolCode);
      if (yearStart && yearEnd) {
        examQuery = examQuery.lte('start_date', yearEnd).gte('end_date', yearStart);
      }
      const { data: examinations, error: examError } = await examQuery;
      if (!examError && examinations) {
        for (const exam of examinations) {
          const name = (exam.exam_name || 'Examination') as string;
          const start = exam.start_date ? new Date(String(exam.start_date).split('T')[0]) : null;
          const end = exam.end_date ? new Date(String(exam.end_date).split('T')[0]) : null;
          if (!start || !end) continue;
          for (let d = new Date(start.getTime()); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            if (academicYear && (dateStr < yearStart || dateStr > yearEnd)) continue;
            examEntries.push({
              event_date: dateStr,
              title: name,
              event_type: 'examination',
              source: 'examinations',
              exam_id: exam.id,
            });
          }
        }
      }
    }

    // Also fetch from academic_calendar table (legacy/backward compatibility)
    let academicCalendarQuery = supabase
      .from('academic_calendar')
      .select('id,event_date,title,event_type,description,academic_year')
      .eq('school_code', schoolCode)
      .eq('is_active', true);

    if (academicYear) {
      academicCalendarQuery = academicCalendarQuery.eq('academic_year', academicYear);
    }

    const { data: academicCalendar, error: academicCalendarError } = await academicCalendarQuery
      .order('event_date', { ascending: true });

    if (academicCalendarError) {
      console.error('Error fetching academic calendar:', academicCalendarError);
      // Continue even if academic_calendar fetch fails
    }

    // Combine both results and remove duplicates (by event_date and title)
    const allEntries = [
      ...(events || []).map((event: { [key: string]: unknown }) => ({
        id: event.id,
        event_date: event.event_date,
        title: event.title,
        event_type: event.event_type || 'event',
        description: event.description,
        color: event.color ?? undefined,
        academic_year: event.event_date ? new Date(String(event.event_date)).getFullYear().toString() : null,
        source: 'events',
      })),
      ...examEntries.map((e) => ({
        ...e,
        id: e.exam_id ? `exam-${e.exam_id}-${e.event_date}` : undefined,
        academic_year: academicYear ?? undefined,
      })),
      ...(academicCalendar || []).map((entry: { [key: string]: unknown }) => ({
        ...entry,
        source: 'academic_calendar',
      })),
    ];

    // Remove duplicates based on event_date and title
    const uniqueEntries = allEntries.reduce((acc: Array<{ event_date?: string; title?: string; [key: string]: unknown }>, entry: { event_date?: string; title?: string; [key: string]: unknown }) => {
      const exists = acc.find(
        (e) => e.event_date === entry.event_date && e.title === entry.title
      );
      if (!exists) {
        acc.push(entry);
      }
      return acc;
    }, []);

    // Sort by event_date
    uniqueEntries.sort((a, b) => {
      const dateA = a.event_date ? new Date(String(a.event_date)).getTime() : 0;
      const dateB = b.event_date ? new Date(String(b.event_date)).getTime() : 0;
      return dateA - dateB;
    });

    return NextResponse.json({ data: uniqueEntries }, {
      status: 200,
      headers: { 'Cache-Control': 'private, s-maxage=120, stale-while-revalidate=180' },
    });
  } catch (error) {
    console.error('Error fetching academic calendar:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

