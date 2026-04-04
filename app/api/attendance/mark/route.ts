import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { resolveAcademicYear } from '@/lib/academic-year-id';
import { assertAcademicYearNotLocked } from '@/lib/academic-year-lock';
import {
  isMissingStudentAttendanceAcademicYearIdColumn,
  stripAcademicYearIdFromAttendanceRows,
} from '@/lib/student-attendance-compat';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, class_id, attendance_date, attendance_records, marked_by, academic_year, academic_year_id } = body;
    const supabase = getServiceRoleClient();
    const normalizedClassId = String(class_id ?? '').trim();

    if (!school_code || !normalizedClassId || !attendance_date || !marked_by) {
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

    // Verify the teacher is the class teacher for this class.
    // Use academic_year (text) — not academic_year_id — so the query works on schemas without classes.academic_year_id.
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('class_teacher_id, class_teacher_staff_id, academic_year')
      .eq('id', normalizedClassId)
      .eq('school_code', school_code)
      .maybeSingle();

    if (classError || !classData) {
      console.error('Attendance mark: class lookup failed', {
        classError,
        normalizedClassId,
        school_code,
      });
      return NextResponse.json(
        { error: 'Class not found', details: classError?.message },
        { status: 404 }
      );
    }

    let resolvedAcademicYearId: string | null = null;
    try {
      if (academic_year_id || academic_year) {
        resolvedAcademicYearId = (
          await resolveAcademicYear({
            schoolCode: school_code,
            academic_year,
            academic_year_id,
          })
        ).yearId;
      } else if (classData.academic_year) {
        resolvedAcademicYearId = (
          await resolveAcademicYear({
            schoolCode: school_code,
            academic_year: String(classData.academic_year),
          })
        ).yearId;
      }
    } catch (e) {
      console.warn('Attendance mark: academic year not resolved', e);
    }

    const adminOverride = request.headers.get('x-admin-override') === 'true';
    if (resolvedAcademicYearId) {
      const lockCheck = await assertAcademicYearNotLocked({
        schoolCode: school_code,
        academic_year_id: resolvedAcademicYearId,
        adminOverride,
      });
      if (lockCheck) return lockCheck;
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
      .eq('class_id', normalizedClassId)
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
        academic_year_id?: string | null;
        [key: string]: unknown;
      } = {
        school_id: schoolData.id,
        school_code: school_code,
        class_id: normalizedClassId,
        student_id: record.student_id,
        attendance_date: attendance_date,
        status,
        marked_by: marked_by,
        academic_year_id: resolvedAcademicYearId,
      };
      if (!isHoliday && record.notes !== undefined && record.notes !== null) baseRecord.notes = record.notes;
      return baseRecord;
    });

    // Insert attendance records (retry without academic_year_id if column does not exist)
    let insertedRecords: unknown[] | null = null;
    let insertError: { message?: string; code?: string; hint?: string } | null = null;

    const tryInsert = async (rows: Record<string, unknown>[]) => {
      return supabase.from('student_attendance').insert(rows).select();
    };

    const first = await tryInsert(recordsToInsert as Record<string, unknown>[]);
    if (!first.error) {
      insertedRecords = first.data as unknown[];
    } else if (isMissingStudentAttendanceAcademicYearIdColumn(first.error)) {
      const stripped = stripAcademicYearIdFromAttendanceRows(
        recordsToInsert as Record<string, unknown>[]
      );
      const second = await tryInsert(stripped);
      if (!second.error) {
        insertedRecords = second.data as unknown[];
      } else {
        insertError = second.error;
      }
    } else {
      insertError = first.error;
    }

    if (insertError || insertedRecords == null) {
      const err = insertError || { message: 'Insert failed' };
      console.error('Error inserting attendance:', err);
      console.error('Insert data:', JSON.stringify(recordsToInsert, null, 2));
      return NextResponse.json(
        {
          error: 'Failed to mark attendance',
          details: err.message,
          code: err.code,
          hint: err.hint,
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

