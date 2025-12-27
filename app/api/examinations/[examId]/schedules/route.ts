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
      .from('examinations')
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
      .order('exam_date', { ascending: true });

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
    const { school_code, schedules } = body;

    if (!school_code || !schedules || !Array.isArray(schedules)) {
      return NextResponse.json(
        { error: 'School code and schedules array are required' },
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
      .from('examinations')
      .select('id')
      .eq('id', examId)
      .eq('school_code', school_code)
      .single();

    if (examError || !exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    // Prepare schedule records
    interface ScheduleData {
      class_id?: string;
      subject_id?: string;
      exam_date?: string;
      start_time?: string;
      end_time?: string;
      max_marks?: number;
      [key: string]: unknown;
    }
    const recordsToInsert = schedules.map((schedule: ScheduleData) => ({
      exam_id: examId,
      school_id: schoolData.id,
      school_code: school_code,
      exam_date: schedule.exam_date,
      exam_name: schedule.exam_name,
      start_time: schedule.start_time || null,
      end_time: schedule.end_time || null,
      duration_minutes: schedule.duration_minutes || null,
      max_marks: schedule.max_marks || null,
      instructions: schedule.instructions || null,
    }));

    // Insert schedules (using upsert to handle duplicates)
    const { data: insertedSchedules, error: insertError } = await supabase
      .from('exam_schedules')
      .upsert(recordsToInsert, {
        onConflict: 'exam_id,exam_date',
      })
      .select();

    if (insertError) {
      console.error('Error inserting schedules:', insertError);
      return NextResponse.json(
        { error: 'Failed to save schedules', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Schedules saved successfully',
      data: insertedSchedules,
    }, { status: 201 });
  } catch (error) {
    console.error('Error saving schedules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Delete all schedules for this exam
    const { error: deleteError } = await supabase
      .from('exam_schedules')
      .delete()
      .eq('exam_id', examId)
      .eq('school_code', schoolCode);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete schedules', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Schedules deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting schedules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
