import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, class_id, attendance_date, attendance_records, marked_by } = body;

    if (!school_code || !class_id || !attendance_date || !marked_by) {
      return NextResponse.json(
        { error: 'Missing required fields: school_code, class_id, attendance_date, marked_by' },
        { status: 400 }
      );
    }

    if (!attendance_records || !Array.isArray(attendance_records) || attendance_records.length === 0) {
      return NextResponse.json(
        { error: 'Attendance records are required' },
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

    // Verify the teacher is the class teacher for this class
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
    const { data: teacherData, error: teacherError } = await supabase
      .from('staff')
      .select('id, staff_id')
      .eq('id', marked_by)
      .eq('school_code', school_code)
      .single();

    if (teacherError || !teacherData) {
      console.error('Teacher not found:', teacherError);
      return NextResponse.json(
        { error: 'Teacher not found', details: teacherError?.message },
        { status: 404 }
      );
    }

    // Check if teacher is the class teacher by either class_teacher_id or class_teacher_staff_id
    const isClassTeacher = 
      classData.class_teacher_id === marked_by ||
      (teacherData.staff_id && classData.class_teacher_staff_id === teacherData.staff_id);

    if (!isClassTeacher) {
      console.error('Class teacher verification failed:', {
        marked_by,
        class_teacher_id: classData.class_teacher_id,
        class_teacher_staff_id: classData.class_teacher_staff_id,
        teacher_staff_id: teacherData.staff_id,
      });
      return NextResponse.json(
        { 
          error: 'Only the assigned class teacher can mark attendance for this class',
          details: 'You are not assigned as the class teacher for this class'
        },
        { status: 403 }
      );
    }

    // Check if attendance already exists for this date
    interface AttendanceRecord {
      student_id?: string;
      status?: string;
      remarks?: string;
      [key: string]: unknown;
    }
    const studentIds = attendance_records.map((r: AttendanceRecord) => r.student_id).filter((id): id is string => typeof id === 'string');
    const { data: existingAttendance } = await supabase
      .from('student_attendance')
      .select('student_id')
      .eq('class_id', class_id)
      .eq('attendance_date', attendance_date)
      .in('student_id', studentIds);

    if (existingAttendance && existingAttendance.length > 0) {
      return NextResponse.json(
        { error: 'Attendance already marked for this date. Please update existing records instead.' },
        { status: 400 }
      );
    }

    // Prepare attendance records for insertion
    // If status is 'holiday', store as 'leave' with notes 'Holiday' (DB may not allow 'holiday' in status CHECK)
    const VALID_STATUSES = ['present', 'absent', 'holiday', 'leave', 'half_day', 'halfday', 'late'];
    const recordsToInsert = attendance_records.map((record: AttendanceRecord) => {
      const rawStatus = (record.status || 'present').toLowerCase();
      const isHoliday = rawStatus === 'holiday';
      const status = isHoliday ? 'leave' : (VALID_STATUSES.includes(rawStatus) ? rawStatus : 'present');
      const baseRecord: {
        school_id: string;
        school_code: string;
        attendance_date: string;
        student_id?: string;
        status?: string;
        remarks?: string;
        [key: string]: unknown;
      } = {
        school_id: schoolData.id,
        school_code: school_code,
        class_id: class_id,
        student_id: record.student_id,
        attendance_date: attendance_date,
        status,
        marked_by: marked_by,
      };
      if (!isHoliday && record.notes !== undefined && record.notes !== null) baseRecord.notes = record.notes;
      return baseRecord;
    });

    // Insert attendance records
    const { data: insertedRecords, error: insertError } = await supabase
      .from('student_attendance')
      .insert(recordsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting attendance:', insertError);
      console.error('Insert data:', JSON.stringify(recordsToInsert, null, 2));
      return NextResponse.json(
        { 
          error: 'Failed to mark attendance', 
          details: insertError.message,
          code: insertError.code,
          hint: insertError.hint
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Attendance marked successfully',
      data: {
        date: attendance_date,
        total_marked: insertedRecords?.length || 0,
        records: insertedRecords,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error marking attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

