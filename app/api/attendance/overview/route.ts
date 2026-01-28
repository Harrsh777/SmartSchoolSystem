import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseFetchOptions } from '@/lib/supabase-fetch';

// Use service role client to bypass RLS if needed
const getServiceRoleClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    getSupabaseFetchOptions()
  );
};

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

    // Use service role client to bypass RLS
    const supabase = getServiceRoleClient();

    // Build query - try with explicit foreign key names first
    let query = supabase
      .from('student_attendance')
      .select(`
        *,
        students!student_attendance_student_id_fkey(
          id,
          admission_no,
          student_name,
          first_name,
          last_name,
          class,
          section
        ),
        classes!student_attendance_class_id_fkey(
          id,
          class,
          section,
          academic_year
        ),
        staff!student_attendance_marked_by_fkey(
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
      console.error('Attendance query error:', attendanceError);
      // Try a simpler query without joins if the foreign key names are wrong
      const simpleQuery = supabase
        .from('student_attendance')
        .select('*')
        .eq('school_code', schoolCode)
        .order('attendance_date', { ascending: false });
      
      if (classId) {
        simpleQuery.eq('class_id', classId);
      }
      if (date) {
        simpleQuery.eq('attendance_date', date);
      }
      if (startDate) {
        simpleQuery.gte('attendance_date', startDate);
      }
      if (endDate) {
        simpleQuery.lte('attendance_date', endDate);
      }

      const { data: simpleData, error: simpleError } = await simpleQuery.limit(1000);
      
      if (simpleError) {
        return NextResponse.json(
          { error: 'Failed to fetch attendance', details: simpleError.message, originalError: attendanceError.message },
          { status: 500 }
        );
      }

      // Fetch related data separately
      const attendanceWithRelations = await Promise.all(
        (simpleData || []).map(async (record) => {
          const [studentResult, classResult, staffResult] = await Promise.all([
            supabase.from('students').select('id, admission_no, student_name, first_name, last_name, class, section').eq('id', record.student_id).single(),
            supabase.from('classes').select('id, class, section, academic_year').eq('id', record.class_id).single(),
            supabase.from('staff').select('id, full_name, staff_id').eq('id', record.marked_by).single(),
          ]);

          return {
            ...record,
            students: studentResult.data || null,
            classes: classResult.data || null,
            staff: staffResult.data || null,
          };
        })
      );

      // Group by class and date for summary
      interface AttendanceRecord {
        classes?: { class: string; section: string } | null;
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
      (attendanceWithRelations || []).forEach((record: AttendanceRecord) => {
        const key = `${record.classes?.class || 'Unknown'}-${record.classes?.section || ''}_${record.attendance_date}`;
        if (!summary[key]) {
          summary[key] = {
            class: record.classes?.class || 'Unknown',
            section: record.classes?.section || '',
            date: record.attendance_date,
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            marked_by: (() => {
              const staff = record.staff as { full_name?: string } | undefined;
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
        data: attendanceWithRelations || [],
        summary: Object.values(summary),
      }, { status: 200 });
    }

    // Group by class and date for summary
    interface AttendanceRecord {
      classes?: { class: string; section: string } | null;
      class?: { class: string; section: string } | null;
      attendance_date: string;
      status: string;
      marked_by_staff?: { full_name?: string } | null;
      staff?: { full_name?: string } | null;
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
      const classData = record.classes || record.class;
      const key = `${classData?.class || 'Unknown'}-${classData?.section || ''}_${record.attendance_date}`;
      if (!summary[key]) {
        summary[key] = {
          class: classData?.class || 'Unknown',
          section: classData?.section || '',
          date: record.attendance_date,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          marked_by: (() => {
            const staff = (record.marked_by_staff || record.staff) as { full_name?: string } | undefined;
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

