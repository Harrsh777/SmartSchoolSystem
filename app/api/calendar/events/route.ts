import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const d = new Date(start);
  while (d <= end) {
    dates.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

// Create event(s) — supports single day (event_date) or multi-day (start_date + end_date, date only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      event_date,
      start_date,
      end_date,
      title,
      description,
      event_type,
      applicable_for,
      applicable_classes,
      color,
    } = body;

    const singleDate = event_date || start_date;
    const rangeEnd = end_date || start_date || event_date;

    if (!school_code || !title || !event_type || !applicable_for) {
      return NextResponse.json(
        { error: 'Missing required fields: school_code, title, event_type, applicable_for' },
        { status: 400 }
      );
    }
    if (!singleDate) {
      return NextResponse.json(
        { error: 'Provide either event_date or start_date (and optionally end_date for multi-day)' },
        { status: 400 }
      );
    }

    const startStr = singleDate.split('T')[0];
    const endStr = rangeEnd.split('T')[0];
    if (endStr < startStr) {
      return NextResponse.json(
        { error: 'End date must be on or after start date' },
        { status: 400 }
      );
    }

    const datesToInsert = getDateRange(startStr, endStr);

    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    const rows = datesToInsert.map((event_date_val) => ({
      school_id: schoolData.id,
      school_code: school_code,
      event_date: event_date_val,
      title,
      description: description || null,
      event_type,
      applicable_for,
      applicable_classes: applicable_for === 'specific_class' ? applicable_classes : null,
      color: color && /^#([0-9A-Fa-f]{3}){1,2}$/.test(color) ? color : null,
    }));

    const { data: inserted, error: eventError } = await supabase
      .from('events')
      .insert(rows)
      .select();

    if (eventError || !inserted?.length) {
      console.error('Error creating event(s):', eventError);
      return NextResponse.json(
        { error: 'Failed to create event(s)', details: (eventError as Error)?.message },
        { status: 500 }
      );
    }

    for (const event of inserted) {
      await createEventNotifications(event.id, schoolData.id, school_code, applicable_for, applicable_classes);
    }

    return NextResponse.json(
      { data: inserted.length === 1 ? inserted[0] : inserted, created_count: inserted.length },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Get all events
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('events')
      .select('*')
      .eq('school_code', schoolCode)
      .eq('is_active', true);

    if (startDate) {
      query = query.gte('event_date', startDate);
    }
    if (endDate) {
      query = query.lte('event_date', endDate);
    }

    const { data: events, error: eventsError } = await query
      .order('event_date', { ascending: true });

    if (eventsError) {
      return NextResponse.json(
        { error: 'Failed to fetch events', details: eventsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: events || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to create event notifications
async function createEventNotifications(
  eventId: string,
  schoolId: string,
  schoolCode: string,
  applicableFor: string,
  applicableClasses: string[] | null
) {
  try {
    interface NotificationData {
      event_id: string;
      school_id: string;
      school_code: string;
      user_id: string;
      user_type: string;
      [key: string]: unknown;
    }
    const notifications: NotificationData[] = [];

    if (applicableFor === 'all' || applicableFor === 'students' || applicableFor === 'specific_class') {
      // Get all students
      let studentsQuery = supabase
        .from('students')
        .select('id')
        .eq('school_code', schoolCode)
        .eq('status', 'active');

      if (applicableFor === 'specific_class' && applicableClasses && Array.isArray(applicableClasses)) {
        studentsQuery = studentsQuery.in('class', applicableClasses);
      }

      const { data: students } = await studentsQuery;

      if (students) {
        students.forEach((student: { id: string; [key: string]: unknown }) => {
          notifications.push({
            event_id: eventId,
            school_id: schoolId,
            school_code: schoolCode,
            user_type: 'student',
            user_id: student.id,
          });
        });
      }
    }

    if (applicableFor === 'all' || applicableFor === 'staff') {
      // Get all staff
      const { data: staff } = await supabase
        .from('staff')
        .select('id')
        .eq('school_code', schoolCode);

      if (staff) {
        staff.forEach((staffMember: { id: string; [key: string]: unknown }) => {
          notifications.push({
            event_id: eventId,
            school_id: schoolId,
            school_code: schoolCode,
            user_type: 'staff',
            user_id: staffMember.id,
          });
        });
      }
    }

    if (notifications.length > 0) {
      await supabase
        .from('event_notifications')
        .insert(notifications);
    }
  } catch (error) {
    console.error('Error creating event notifications:', error);
    // Don't fail the event creation if notifications fail
  }
}

