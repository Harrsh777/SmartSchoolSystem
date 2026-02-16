import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const classId = searchParams.get('class_id');
    const date = searchParams.get('date');

    if (!schoolCode || !classId || !date) {
      return NextResponse.json(
        { error: 'school_code, class_id, and date are required' },
        { status: 400 }
      );
    }

    // Fetch attendance for the class on the specified date
    // First try with relationships, if that fails, fetch without relationships
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('student_attendance')
      .select('*')
      .eq('school_code', schoolCode)
      .eq('class_id', classId)
      .eq('attendance_date', date)
      .order('created_at', { ascending: true });

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch attendance', 
          details: attendanceError.message,
          code: attendanceError.code,
          hint: attendanceError.hint
        },
        { status: 500 }
      );
    }

    let attendance = attendanceData;
    let meta: { last_marked_at?: string; marked_by_name?: string } | undefined;
    if (attendance && attendance.length > 0) {
      try {
        const studentIds = [...new Set(attendance.map((a: { student_id: string }) => a.student_id).filter(Boolean))];
        if (studentIds.length > 0) {
          const { data: studentsData } = await supabase
            .from('students')
            .select('id, admission_no, student_name, first_name, last_name, class, section')
            .in('id', studentIds);
          if (studentsData) {
            const studentsMap = new Map(studentsData.map((s: { id: string }) => [s.id, s]));
            attendance = attendance.map((record: { student_id: string; [key: string]: unknown }) => ({
              ...record,
              student: studentsMap.get(record.student_id) || null,
            }));
          }
        }
        const first = attendanceData![0] as { created_at?: string; updated_at?: string; marked_by?: string };
        const lastMarkedAt = first.updated_at || first.created_at;
        if (lastMarkedAt && first.marked_by) {
          const { data: staffData } = await supabase
            .from('staff')
            .select('full_name')
            .eq('id', first.marked_by)
            .single();
          meta = {
            last_marked_at: lastMarkedAt,
            marked_by_name: (staffData as { full_name?: string } | null)?.full_name || 'Staff',
          };
        } else if (lastMarkedAt) {
          meta = { last_marked_at: lastMarkedAt, marked_by_name: 'Staff' };
        }
      } catch (err) {
        console.warn('Error enriching attendance with student data:', err);
      }
    }

    return NextResponse.json({ data: attendance || [], meta: meta ?? null }, { status: 200 });
  } catch (error) {
    console.error('Error fetching class attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

