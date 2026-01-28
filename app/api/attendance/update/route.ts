import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, class_id, attendance_date, attendance_records, marked_by } = body;

    if (!school_code || !class_id || !attendance_date || !marked_by) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the teacher is the class teacher
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('class_teacher_id, class_teacher_staff_id')
      .eq('id', class_id)
      .eq('school_code', school_code)
      .single();

    if (classError || !classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    // Get teacher's staff_id to verify
    const { data: teacherData } = await supabase
      .from('staff')
      .select('id, staff_id')
      .eq('id', marked_by)
      .eq('school_code', school_code)
      .single();

    // Check if teacher is the class teacher by either class_teacher_id or class_teacher_staff_id
    const isClassTeacher = 
      classData.class_teacher_id === marked_by ||
      (teacherData?.staff_id && classData.class_teacher_staff_id === teacherData.staff_id);

    if (!isClassTeacher) {
      return NextResponse.json(
        { error: 'Only the assigned class teacher can update attendance' },
        { status: 403 }
      );
    }

    // Update each attendance record – only set status (table has no updated_at or notes)
    const updates = [];
    for (const record of attendance_records) {
      const { error: updateError } = await supabase
        .from('student_attendance')
        .update({ status: record.status })
        .eq('student_id', record.student_id)
        .eq('attendance_date', attendance_date)
        .eq('class_id', class_id);

      if (updateError) {
        console.error(`Error updating attendance for student ${record.student_id}:`, updateError);
      } else {
        updates.push(record.student_id);
      }
    }

    return NextResponse.json({
      message: 'Attendance updated successfully',
      data: {
        date: attendance_date,
        updated_count: updates.length,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

