import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get('class_id');
    const date = searchParams.get('date');
    const schoolCode = searchParams.get('school_code');

    if (!classId || !date || !schoolCode) {
      return NextResponse.json(
        { error: 'Class ID, date, and school code are required' },
        { status: 400 }
      );
    }

    // Fetch attendance records
    const { data: attendance, error: attendanceError } = await supabase
      .from('student_attendance')
      .select('*')
      .eq('class_id', classId)
      .eq('attendance_date', date)
      .eq('school_code', schoolCode);

    if (attendanceError) {
      return NextResponse.json(
        { error: 'Failed to fetch attendance', details: attendanceError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: attendance || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, class_id, date, attendance, marked_by } = body;

    if (!school_code || !class_id || !date || !attendance || !marked_by) {
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

    // Verify teacher is the class teacher
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
        { error: 'Only the assigned class teacher can mark attendance' },
        { status: 403 }
      );
    }

    // Prepare attendance records for upsert
    interface AttendanceInput {
      student_id: string;
      status: string;
      remarks?: string;
      [key: string]: unknown;
    }
    const attendanceRecords = attendance.map((record: AttendanceInput) => ({
      school_id: schoolData.id,
      school_code: school_code,
      class_id: class_id,
      student_id: record.student_id,
      attendance_date: date,
      status: record.status,
      marked_by: marked_by,
    }));

    // Upsert attendance (using unique constraint on student_id + attendance_date)
    const { data: savedAttendance, error: insertError } = await supabase
      .from('student_attendance')
      .upsert(attendanceRecords, {
        onConflict: 'student_id,attendance_date',
        ignoreDuplicates: false,
      })
      .select();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to save attendance', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: savedAttendance, message: 'Attendance saved successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

