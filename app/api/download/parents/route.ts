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

    // Fetch all students to get parent information
    const { data: students, error } = await supabase
      .from('students')
      .select('admission_no, student_name, class, section, father_name, mother_name, father_phone, mother_phone, father_email, mother_email, address')
      .eq('school_code', schoolCode)
      .order('class', { ascending: true })
      .order('section', { ascending: true })
      .order('student_name', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch parent data', details: error.message },
        { status: 500 }
      );
    }

    // Prepare data for Excel - create entries for both father and mother
    interface StudentWithParents {
      admission_no?: string;
      student_name?: string;
      class?: string;
      section?: string | null;
      father_name?: string;
      father_phone?: string;
      father_email?: string;
      mother_name?: string;
      mother_phone?: string;
      mother_email?: string;
      address?: string;
      [key: string]: unknown;
    }
    interface ParentExcelRow {
      'Parent Type': string;
      'Parent Name': string;
      'Phone': string;
      'Email': string;
      'Student Admission No': string;
      'Student Name': string;
      'Class': string;
      'Section': string;
      'Address': string;
    }
    const excelData: ParentExcelRow[] = [];
    (students || []).forEach((student: StudentWithParents) => {
      // Father entry
      if (student.father_name) {
        excelData.push({
          'Parent Type': 'Father',
          'Parent Name': String(student.father_name || ''),
          'Phone': String(student.father_phone || ''),
          'Email': String(student.father_email || ''),
          'Student Admission No': String(student.admission_no || ''),
          'Student Name': String(student.student_name || ''),
          'Class': String(student.class || ''),
          'Section': String(student.section || ''),
          'Address': String(student.address || ''),
        });
      }
      // Mother entry
      if (student.mother_name) {
        excelData.push({
          'Parent Type': 'Mother',
          'Parent Name': String(student.mother_name || ''),
          'Phone': String(student.mother_phone || ''),
          'Email': String(student.mother_email || ''),
          'Student Admission No': String(student.admission_no || ''),
          'Student Name': String(student.student_name || ''),
          'Class': String(student.class || ''),
          'Section': String(student.section || ''),
          'Address': String(student.address || ''),
        });
      }
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, 'Parents');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return Excel file
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="parents_${schoolCode}_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error generating parents Excel:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

