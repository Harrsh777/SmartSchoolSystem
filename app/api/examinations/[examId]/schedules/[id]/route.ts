import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string; id: string }> }
) {
  try {
    const { examId, id } = await params;
    const body = await request.json();
    const { school_code, ...updateData } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Verify schedule belongs to exam and school
    const { data: existingSchedule, error: fetchError } = await supabase
      .from('exam_schedules')
      .select('id, exam_id, school_code, exam_date, class, section, start_time, end_time')
      .eq('id', id)
      .eq('exam_id', examId)
      .eq('school_code', school_code)
      .single();

    if (fetchError || !existingSchedule) {
      return NextResponse.json(
        { error: 'Schedule not found or access denied' },
        { status: 404 }
      );
    }

    // If updating date/time, validate conflicts
    if (updateData.exam_date || updateData.start_time || updateData.end_time) {
      const { data: exam } = await supabase
        .from('exams')
        .select('start_date, end_date')
        .eq('id', examId)
        .single();

      if (exam) {
        const examDate = updateData.exam_date ? new Date(String(updateData.exam_date)) : new Date(String((existingSchedule as { exam_date?: string }).exam_date || ''));
        const examStart = new Date(exam.start_date);
        const examEnd = new Date(exam.end_date);
        
        if (examDate < examStart || examDate > examEnd) {
          return NextResponse.json(
            { error: `Exam date must be between ${exam.start_date} and ${exam.end_date}` },
            { status: 400 }
          );
        }
      }

      // Check for conflicts (excluding current schedule)
      const classToCheck = updateData.class || existingSchedule.class;
      const sectionToCheck = updateData.section || existingSchedule.section;
      const dateToCheck = updateData.exam_date || existingSchedule.exam_date;
      const startToCheck = updateData.start_time || existingSchedule.start_time;
      const endToCheck = updateData.end_time || existingSchedule.end_time;

      if (endToCheck <= startToCheck) {
        return NextResponse.json(
          { error: 'End time must be after start time' },
          { status: 400 }
        );
      }

      const { data: conflictingSchedules } = await supabase
        .from('exam_schedules')
        .select('id, subject, start_time, end_time')
        .eq('school_code', school_code)
        .eq('class', classToCheck)
        .eq('section', sectionToCheck)
        .eq('exam_date', dateToCheck)
        .neq('id', id);

      if (conflictingSchedules) {
        for (const schedule of conflictingSchedules) {
          const existingStart = schedule.start_time;
          const existingEnd = schedule.end_time;
          
          if (
            (startToCheck >= existingStart && startToCheck < existingEnd) ||
            (endToCheck > existingStart && endToCheck <= existingEnd) ||
            (startToCheck <= existingStart && endToCheck >= existingEnd)
          ) {
            return NextResponse.json(
              { 
                error: `Conflict detected: ${schedule.subject} is already scheduled from ${existingStart} to ${existingEnd}`,
                conflict: true
              },
              { status: 400 }
            );
          }
        }
      }
    }

    // Update schedule
    const { data: updatedSchedule, error: updateError } = await supabase
      .from('exam_schedules')
      .update({
        ...updateData,
        class: updateData.class ? updateData.class.toUpperCase() : undefined,
        section: updateData.section ? updateData.section.toUpperCase() : undefined,
      })
      .eq('id', id)
      .eq('exam_id', examId)
      .eq('school_code', school_code)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update schedule', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedSchedule }, { status: 200 });
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string; id: string }> }
) {
  try {
    const { examId, id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Verify schedule belongs to exam and school
    const { data: existingSchedule, error: fetchError } = await supabase
      .from('exam_schedules')
      .select('id, exam_id, school_code')
      .eq('id', id)
      .eq('exam_id', examId)
      .eq('school_code', schoolCode)
      .single();

    if (fetchError || !existingSchedule) {
      return NextResponse.json(
        { error: 'Schedule not found or access denied' },
        { status: 404 }
      );
    }

    // Delete schedule
    const { error: deleteError } = await supabase
      .from('exam_schedules')
      .delete()
      .eq('id', id)
      .eq('exam_id', examId)
      .eq('school_code', schoolCode);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete schedule', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Schedule deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

