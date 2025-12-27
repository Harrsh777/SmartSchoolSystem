import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
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
          admission_no,
          student_name,
          class,
          section
        )
      `)
      .eq('school_code', schoolCode)
      .order('attendance_date', { ascending: false })
      .order('created_at', { ascending: false });

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

    // Prepare data for Excel
    interface AttendanceRecord {
      attendance_date?: string;
      student_name?: string;
      admission_no?: string;
      class?: string;
      section?: string;
      status?: string;
      [key: string]: unknown;
    }
    interface Student {
      admission_no?: string;
      student_name?: string;
      class?: string;
      section?: string | null;
    }
    const excelData = (attendance || []).map((record: AttendanceRecord) => {
      const student = record.student as Student | undefined;
      return {
        'Date': String(record.attendance_date || ''),
        'Admission No': student?.admission_no || '',
        'Student Name': student?.student_name || '',
        'Class': student?.class || '',
        'Section': student?.section || '',
        'Status': String(record.status || ''),
        'Remarks': String(record.remarks || ''),
        'Marked By': String(record.marked_by_name || ''),
        'Marked At': record.created_at ? new Date(String(record.created_at)).toLocaleString() : '',
      };
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return Excel file
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="attendance_${schoolCode}_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error generating attendance Excel:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

