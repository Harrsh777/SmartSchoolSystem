import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCached, cacheKeys, DASHBOARD_REDIS_TTL } from '@/lib/cache';

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

    const uniqueEntries = await getCached(
      cacheKeys.calendarAcademic(schoolCode, academicYear, includeEvents),
      async () => {
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

    // Examination days: one calendar entry per scheduled exam date (not start–end range)
    const yearStart = academicYear ? `${academicYear}-01-01` : '';
    const yearEnd = academicYear ? `${academicYear}-12-31` : '';
    const examEntries: Array<{ event_date: string; title: string; event_type: string; source: string; exam_id?: string; [key: string]: unknown }> = [];
    if (schoolCode) {
      let schedQuery = supabase
        .from('exam_schedules')
        .select('exam_id, exam_date')
        .eq('school_code', schoolCode);
      if (yearStart && yearEnd) {
        schedQuery = schedQuery.gte('exam_date', yearStart).lte('exam_date', yearEnd);
      }
      const { data: scheduleRows, error: schedError } = await schedQuery;
      if (!schedError && scheduleRows && scheduleRows.length > 0) {
        const examIds = Array.from(
          new Set(
            (scheduleRows as Array<{ exam_id?: string }>)
              .map((r) => String(r.exam_id || '').trim())
              .filter(Boolean)
          )
        );
        const { data: examMeta } =
          examIds.length > 0
            ? await supabase
                .from('examinations')
                .select('id, exam_name')
                .eq('school_code', schoolCode)
                .in('id', examIds)
            : { data: [] as Array<{ id: string; exam_name?: string | null }> };
        const nameById = new Map(
          (examMeta || []).map((e) => [String((e as { id: string }).id), String((e as { exam_name?: string | null }).exam_name || 'Examination')])
        );
        const seenDateExam = new Set<string>();
        for (const row of scheduleRows as Array<{ exam_id?: string; exam_date?: string }>) {
          const examId = String(row.exam_id || '').trim();
          const raw = row.exam_date ? String(row.exam_date).split('T')[0] : '';
          if (!examId || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) continue;
          if (academicYear && (raw < yearStart || raw > yearEnd)) continue;
          const dedupeKey = `${examId}|${raw}`;
          if (seenDateExam.has(dedupeKey)) continue;
          seenDateExam.add(dedupeKey);
          examEntries.push({
            event_date: raw,
            title: nameById.get(examId) || 'Examination',
            event_type: 'examination',
            source: 'exam_schedules',
            exam_id: examId,
          });
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

    return uniqueEntries;
      },
      { ttlSeconds: DASHBOARD_REDIS_TTL.calendarAcademic }
    );

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

