import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/attendance/admin-mark
 * Admin endpoint to mark student attendance for any class (bypasses class teacher restriction)
 */
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

    // Verify class exists (no class teacher restriction for admin)
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, class, section')
      .eq('id', class_id)
      .eq('school_code', school_code)
      .single();

    if (classError || !classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    // Verify marked_by staff exists
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .eq('id', marked_by)
      .eq('school_code', school_code)
      .single();

    if (staffError || !staffData) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    // Prepare attendance records for upsert
    interface AttendanceRecord {
      student_id?: string;
      status?: string;
      remarks?: string;
      [key: string]: unknown;
    }

    const recordsToUpsert = attendance_records.map((record: AttendanceRecord) => ({
      school_id: schoolData.id,
      school_code: school_code,
      class_id: class_id,
      student_id: record.student_id,
      attendance_date: attendance_date,
      status: record.status || 'present',
      marked_by: marked_by,
      remarks: record.remarks || null,
    }));

    // Upsert attendance records (update if exists, insert if new)
    const { data: savedAttendance, error: upsertError } = await supabase
      .from('student_attendance')
      .upsert(recordsToUpsert, {
        onConflict: 'student_id,attendance_date',
        ignoreDuplicates: false,
      })
      .select();

    if (upsertError) {
      console.error('Error upserting attendance:', upsertError);
      return NextResponse.json(
        { error: 'Failed to save attendance', details: upsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: savedAttendance, message: 'Attendance saved successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST /api/attendance/admin-mark:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
