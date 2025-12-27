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

    // Fetch all staff
    const { data: staff, error } = await supabase
      .from('staff')
      .select('*')
      .eq('school_code', schoolCode)
      .order('full_name', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch staff', details: error.message },
        { status: 500 }
      );
    }

    // Prepare data for Excel
    interface StaffMember {
      staff_id?: string;
      full_name?: string;
      role?: string;
      department?: string;
      email?: string;
      phone?: string;
      [key: string]: unknown;
    }
    const excelData = (staff || []).map((member: StaffMember) => ({
      'Staff ID': member.staff_id || '',
      'Full Name': member.full_name || '',
      'Email': member.email || '',
      'Phone': member.phone || '',
      'Role': member.role || '',
      'Department': member.department || '',
      'Designation': member.designation || '',
      'Date of Birth': member.date_of_birth || '',
      'Date of Joining': member.date_of_joining || '',
      'Address': member.address || '',
      'Status': member.status || '',
      'Created At': member.created_at ? new Date(String(member.created_at)).toLocaleDateString() : '',
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, 'Staff');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return Excel file
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="staff_${schoolCode}_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error generating staff Excel:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

