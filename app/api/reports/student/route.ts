import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

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

    const supabase = getServiceRoleClient();

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
        { error: 'Failed to fetch student data', details: error.message },
        { status: 500 }
      );
    }

    // Convert to CSV
    if (!students || students.length === 0) {
      return new NextResponse('No student data available', {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="student_report_${schoolCode}.csv"`,
        },
      });
    }

    // Get all column names
    const columns = Object.keys(students[0]);
    
    // Create CSV header
    const csvHeader = columns.join(',') + '\n';
    
    // Create CSV rows
    const csvRows = students.map(student => {
      return columns.map(col => {
        const value = student[col as keyof typeof student];
        // Handle null, undefined, and objects
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        // Escape commas and quotes in values
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',');
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="student_report_${schoolCode}_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error generating student report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

