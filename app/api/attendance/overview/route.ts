import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const classId = searchParams.get('class_id');
    const date = searchParams.get('date');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('student_attendance')
      .select(`
        *,
        student:students!student_attendance_student_id_fkey(
          id,
          admission_no,
          student_name,
          first_name,
          last_name,
          class,
          section
        ),
        class:classes!student_attendance_class_id_fkey(
          id,
          class,
          section,
          academic_year
        ),
        marked_by_staff:staff!student_attendance_marked_by_fkey(
          id,
          full_name,
          staff_id
        )
      `)
      .eq('school_code', schoolCode)
      .order('attendance_date', { ascending: false });

    // Apply filters
    if (classId) {
      query = query.eq('class_id', classId);
    }
    if (date) {
      query = query.eq('attendance_date', date);
    }
    if (startDate) {
      query = query.gte('attendance_date', startDate);
    }
    if (endDate) {
      query = query.lte('attendance_date', endDate);
    }

    const { data: attendance, error: attendanceError } = await query.limit(1000);

    if (attendanceError) {
      return NextResponse.json(
        { error: 'Failed to fetch attendance', details: attendanceError.message },
        { status: 500 }
      );
    }

    // Group by class and date for summary
    interface AttendanceRecord {
      class?: { class: string; section: string };
      attendance_date: string;
      status: string;
      [key: string]: unknown;
    }
    interface SummaryData {
      total: number;
      present: number;
      absent: number;
      late: number;
      [key: string]: unknown;
    }
    const summary: Record<string, SummaryData> = {};
    (attendance || []).forEach((record: AttendanceRecord) => {
      const key = `${record.class?.class}-${record.class?.section}_${record.attendance_date}`;
      if (!summary[key]) {
        summary[key] = {
          class: record.class?.class,
          section: record.class?.section,
          date: record.attendance_date,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          marked_by: (() => {
            const staff = record.marked_by_staff as { full_name?: string } | undefined;
            return staff?.full_name || 'Unknown';
          })(),
        };
      }
      summary[key].total++;
      if (record.status === 'present') summary[key].present++;
      else if (record.status === 'absent') summary[key].absent++;
      else if (record.status === 'late') summary[key].late++;
    });

    return NextResponse.json({
      data: attendance || [],
      summary: Object.values(summary),
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching attendance overview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

