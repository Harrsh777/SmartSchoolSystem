import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Fetch all students
    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .eq('school_code', schoolCode)
      .order('class', { ascending: true })
      .order('section', { ascending: true })
      .order('student_name', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch students', details: error.message },
        { status: 500 }
      );
    }

    // Prepare data for Excel
    interface StudentData {
      admission_no?: string;
      student_name?: string;
      class?: string;
      section?: string;
      gender?: string;
      parent_name?: string;
      parent_phone?: string;
      [key: string]: unknown;
    }
    const excelData = (students || []).map((student: StudentData) => ({
      'Admission No': student.admission_no || '',
      'Student Name': student.student_name || '',
      'Class': student.class || '',
      'Section': student.section || '',
      'Gender': student.gender || '',
      'Date of Birth': student.date_of_birth || '',
      'Father Name': student.father_name || '',
      'Mother Name': student.mother_name || '',
      'Father Phone': student.father_phone || '',
      'Mother Phone': student.mother_phone || '',
      'Address': student.address || '',
      'Email': student.email || '',
      'Status': student.status || '',
      'Created At': student.created_at ? new Date(String(student.created_at)).toLocaleDateString() : '',
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, 'Students');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return Excel file
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="students_${schoolCode}_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error generating students Excel:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

