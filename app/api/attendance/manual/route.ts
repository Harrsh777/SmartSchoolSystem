import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { verifyManualAttendanceOrSchoolSession } from '@/lib/manual-attendance-access';

/**
 * GET /api/attendance/manual?school_code=&class_id=&academic_year=&marked_by=
 * Loads saved manual attendance rows for a class and academic year.
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const school_code = sp.get('school_code')?.trim() || '';
    const class_id = sp.get('class_id')?.trim() || '';
    const academic_year = sp.get('academic_year')?.trim() || '';
    const marked_by = sp.get('marked_by')?.trim() || '';

    if (!school_code || !class_id || !academic_year || !marked_by) {
      return NextResponse.json(
        { error: 'school_code, class_id, academic_year, and marked_by are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    const access = await verifyManualAttendanceOrSchoolSession(
      request,
      supabase,
      school_code,
      class_id,
      marked_by
    );
    if (!access.ok) return access.response;

    const { data, error } = await supabase
      .from('student_manual_attendance')
      .select(
        'student_id, total_working_days, attended_days, attendance_percentage, updated_at, updated_by'
      )
      .eq('school_code', school_code)
      .eq('class_id', class_id)
      .eq('academic_year', academic_year);

    if (error) {
      const msg = error.message || '';
      if (msg.includes('student_manual_attendance') && msg.includes('does not exist')) {
        return NextResponse.json(
          {
            error: 'Manual attendance is not set up',
            details: 'Run sql/student_manual_attendance.sql on your database.',
          },
          { status: 503 }
        );
      }
      console.error('GET manual attendance:', error);
      return NextResponse.json(
        { error: 'Failed to load manual attendance', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] }, { status: 200 });
  } catch (e) {
    console.error('GET manual attendance:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
