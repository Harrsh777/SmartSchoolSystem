import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

/** Map of export column key -> Excel header label */
const COLUMN_LABELS: Record<string, string> = {
  admission_no: 'Admission No',
  student_name: 'Student Name',
  class: 'Class',
  section: 'Section',
  academic_year: 'Academic Year',
  roll_number: 'Roll No',
  house: 'House',
  gender: 'Gender',
  date_of_birth: 'Date of Birth',
  email: 'Email',
  student_contact: 'Student Contact',
  father_name: 'Father Name',
  father_contact: 'Father Contact',
  mother_name: 'Mother Name',
  mother_contact: 'Mother Contact',
  address: 'Address',
  city: 'City',
  state: 'State',
  pincode: 'Pincode',
  blood_group: 'Blood Group',
  status: 'Status',
  date_of_admission: 'Date of Admission',
  religion: 'Religion',
  category: 'Category',
  aadhaar_number: 'Aadhaar No',
  rfid: 'RFID',
  transport_type: 'Transport Type',
  created_at: 'Created At',
};

export const EXPORT_COLUMN_KEYS = Object.keys(COLUMN_LABELS);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const classFilter = searchParams.get('class') || '';
    const sectionFilter = searchParams.get('section') || '';
    const academicYearFilter = searchParams.get('academic_year') || '';
    const statusFilter = searchParams.get('status') || 'active';
    const columnsParam = searchParams.get('columns') || '';

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('students')
      .select('*')
      .eq('school_code', schoolCode)
      .order('class', { ascending: true })
      .order('section', { ascending: true })
      .order('student_name', { ascending: true });

    if (classFilter) {
      query = query.eq('class', classFilter);
    }
    if (sectionFilter) {
      query = query.eq('section', sectionFilter);
    }
    if (academicYearFilter) {
      query = query.eq('academic_year', academicYearFilter);
    }
    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'deactivated') {
        query = query.in('status', ['deactivated', 'inactive']);
      } else {
        const statusMap: Record<string, string> = {
          active: 'active',
          transferred: 'transferred',
          alumni: 'alumni',
          graduated: 'graduated',
        };
        const dbStatus = statusMap[statusFilter] || statusFilter;
        query = query.eq('status', dbStatus);
      }
    }

    const { data: students, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch students', details: error.message },
        { status: 500 }
      );
    }

    const selectedKeys = columnsParam
      ? columnsParam.split(',').map((k) => k.trim()).filter((k) => COLUMN_LABELS[k])
      : ['admission_no', 'student_name', 'class', 'section', 'house', 'roll_number', 'email', 'status'];

    const excelData = (students || []).map((student: Record<string, unknown>) => {
      const row: Record<string, string | number> = {};
      for (const key of selectedKeys) {
        const label = COLUMN_LABELS[key];
        if (!label) continue;
        const val = student[key];
        if (val == null || val === '') {
          row[label] = '';
        } else if (key === 'date_of_birth' || key === 'date_of_admission' || key === 'created_at') {
          row[label] = new Date(String(val)).toLocaleDateString();
        } else {
          row[label] = String(val);
        }
      }
      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, 'Students');

    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `students_${schoolCode}_${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
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
