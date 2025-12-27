import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('student_id');
    const schoolCode = searchParams.get('school_code');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!studentId || !schoolCode) {
      return NextResponse.json(
        { error: 'Student ID and school code are required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('student_attendance')
      .select('*')
      .eq('student_id', studentId)
      .eq('school_code', schoolCode)
      .order('attendance_date', { ascending: false });

    // Apply date filters if provided
    if (startDate) {
      query = query.gte('attendance_date', startDate);
    }
    if (endDate) {
      query = query.lte('attendance_date', endDate);
    }

    const { data: attendance, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch attendance', details: error.message },
        { status: 500 }
      );
    }

    // Fetch staff names for marked_by
    interface AttendanceRecord {
      marked_by?: string;
      [key: string]: unknown;
    }
    const attendanceWithStaff = await Promise.all(
      (attendance || []).map(async (record: AttendanceRecord) => {
        if (record.marked_by) {
          const { data: staffData } = await supabase
            .from('staff')
            .select('full_name, staff_id')
            .eq('id', record.marked_by)
            .single();
          
          return {
            ...record,
            staff: staffData || null,
          };
        }
        return record;
      })
    );

    // Calculate statistics
    const stats = {
      total: attendanceWithStaff.length,
      present: attendanceWithStaff.filter(a => a.status === 'present').length,
      absent: attendanceWithStaff.filter(a => a.status === 'absent').length,
      late: attendanceWithStaff.filter(a => a.status === 'late').length,
      percentage: attendanceWithStaff.length > 0
        ? Math.round((attendanceWithStaff.filter(a => a.status === 'present').length / attendanceWithStaff.length) * 100)
        : 0,
    };

    return NextResponse.json({ 
      data: attendanceWithStaff,
      stats
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

