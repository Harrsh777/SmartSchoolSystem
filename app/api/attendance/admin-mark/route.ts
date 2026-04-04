import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { resolveAcademicYear } from '@/lib/academic-year-id';
import { assertAcademicYearNotLocked } from '@/lib/academic-year-lock';
import {
  isMissingStudentAttendanceAcademicYearIdColumn,
  stripAcademicYearIdFromAttendanceRows,
} from '@/lib/student-attendance-compat';

/**
 * POST /api/attendance/admin-mark
 * Admin endpoint to mark student attendance for any class (bypasses class teacher restriction)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, class_id, attendance_date, attendance_records, marked_by, academic_year, academic_year_id } = body;
    const supabase = getServiceRoleClient();

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
      .select('id, class, section, academic_year')
      .eq('id', class_id)
      .eq('school_code', school_code)
      .maybeSingle();

    if (classError || !classData) {
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
      console.warn('Admin attendance mark: academic year not resolved', e);
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
    // If status is 'holiday', store as 'leave' with notes 'Holiday' (DB may not allow 'holiday' in status CHECK)
    interface AttendanceRecord {
      student_id?: string;
      status?: string;
      [key: string]: unknown;
    }

    const VALID_STATUSES = ['present', 'absent', 'holiday', 'leave', 'half_day', 'halfday', 'late'];
    const recordsToUpsert = attendance_records.map((record: AttendanceRecord) => {
      const rawStatus = (record.status || 'present').toLowerCase();
      const isHoliday = rawStatus === 'holiday';
      // Store holiday as 'leave' so DB accepts it (status CHECK may not include 'holiday')
      const status = isHoliday ? 'leave' : (VALID_STATUSES.includes(rawStatus) ? rawStatus : 'present');
      return {
        school_id: schoolData.id,
        school_code: school_code,
        class_id: class_id,
        student_id: record.student_id,
        attendance_date: attendance_date,
        status,
        marked_by: marked_by,
        academic_year_id: resolvedAcademicYearId,
      };
    });

    const upsertRows = (rows: Record<string, unknown>[]) =>
      supabase
        .from('student_attendance')
        .upsert(rows, {
          onConflict: 'student_id,attendance_date',
          ignoreDuplicates: false,
        })
        .select();

    let savedAttendance: unknown[] | null = null;
    let upsertError: { message?: string } | null = null;

    const firstUpsert = await upsertRows(recordsToUpsert as Record<string, unknown>[]);
    if (!firstUpsert.error) {
      savedAttendance = firstUpsert.data as unknown[];
    } else if (isMissingStudentAttendanceAcademicYearIdColumn(firstUpsert.error)) {
      const stripped = stripAcademicYearIdFromAttendanceRows(
        recordsToUpsert as Record<string, unknown>[]
      );
      const second = await upsertRows(stripped);
      if (!second.error) {
        savedAttendance = second.data as unknown[];
      } else {
        upsertError = second.error;
      }
    } else {
      upsertError = firstUpsert.error;
    }

    if (upsertError || savedAttendance == null) {
      const err = upsertError || { message: 'Upsert failed' };
      console.error('Error upserting attendance:', err);
      return NextResponse.json(
        { error: 'Failed to save attendance', details: err.message },
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
