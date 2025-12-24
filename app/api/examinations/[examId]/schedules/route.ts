import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Verify exam belongs to school
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id')
      .eq('id', examId)
      .eq('school_code', schoolCode)
      .single();

    if (examError || !exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    // Fetch schedules
    const { data: schedules, error: schedulesError } = await supabase
      .from('exam_schedules')
      .select('*')
      .eq('exam_id', examId)
      .eq('school_code', schoolCode)
      .order('exam_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (schedulesError) {
      return NextResponse.json(
        { error: 'Failed to fetch schedules', details: schedulesError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: schedules || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const body = await request.json();
    const { school_code, class: className, section, subject, exam_date, start_time, end_time, room, notes } = body;

    if (!school_code || !className || !section || !subject || !exam_date || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    // Get school ID
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

    // Verify exam belongs to school
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, start_date, end_date')
      .eq('id', examId)
      .eq('school_code', school_code)
      .single();

    if (examError || !exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    // Validate exam date is within exam date range
    const examDate = new Date(exam_date);
    const examStart = new Date(exam.start_date);
    const examEnd = new Date(exam.end_date);
    
    if (examDate < examStart || examDate > examEnd) {
      return NextResponse.json(
        { error: `Exam date must be between ${exam.start_date} and ${exam.end_date}` },
        { status: 400 }
      );
    }

    // Validate time
    if (end_time <= start_time) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    // Check for conflicts (overlapping exams for same class+section on same date)
    const { data: conflictingSchedules } = await supabase
      .from('exam_schedules')
      .select('id, subject, start_time, end_time')
      .eq('school_code', school_code)
      .eq('class', className)
      .eq('section', section)
      .eq('exam_date', exam_date);

    if (conflictingSchedules) {
      for (const schedule of conflictingSchedules) {
        const existingStart = schedule.start_time;
        const existingEnd = schedule.end_time;
        
        // Check if times overlap
        if (
          (start_time >= existingStart && start_time < existingEnd) ||
          (end_time > existingStart && end_time <= existingEnd) ||
          (start_time <= existingStart && end_time >= existingEnd)
        ) {
          return NextResponse.json(
            { 
              error: `Conflict detected: ${schedule.subject} is already scheduled from ${existingStart} to ${existingEnd} on this date`,
              conflict: true
            },
            { status: 400 }
          );
        }
      }
    }

    // Insert schedule
    const { data: newSchedule, error: insertError } = await supabase
      .from('exam_schedules')
      .insert([{
        exam_id: examId,
        school_id: schoolData.id,
        school_code: school_code,
        class: className.toUpperCase(),
        section: section.toUpperCase(),
        subject: subject,
        exam_date: exam_date,
        start_time: start_time,
        end_time: end_time,
        room: room || null,
        notes: notes || null,
      }])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create schedule', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: newSchedule }, { status: 201 });
  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

