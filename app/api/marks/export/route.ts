import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

/**
 * GET /api/marks/export
 * Export marks to Excel or CSV
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const examId = searchParams.get('exam_id');
    const classId = searchParams.get('class_id');
    const section = searchParams.get('section');
    const format = searchParams.get('format') || 'excel'; // 'excel' or 'csv'

    if (!schoolCode || !examId) {
      return NextResponse.json(
        { error: 'School code and exam ID are required' },
        { status: 400 }
      );
    }

    // Removed unused supabase variable - using fetch instead

    // Fetch marks data using the view API logic
    const params = new URLSearchParams({
      school_code: schoolCode,
      exam_id: examId,
      ...(classId && { class_id: classId }),
      ...(section && { section }),
    });

    // Fetch from our view API (use getAppUrl for server-side base URL)
    const { getAppUrl } = await import('@/lib/env');
    const baseUrl = getAppUrl();
    if (!baseUrl) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_APP_URL is not set. Required for server-side export.' },
        { status: 500 }
      );
    }
    const viewResponse = await fetch(`${baseUrl}/api/marks/view?${params}`);
    const viewData = await viewResponse.json();

    if (!viewResponse.ok || !viewData.data) {
      return NextResponse.json(
        { error: 'Failed to fetch marks data' },
        { status: 500 }
      );
    }

    const marks = viewData.data || [];

    interface MarkData {
      student?: {
        roll_number?: string;
        student_name?: string;
        full_name?: string;
        admission_no?: string;
        class?: string;
        section?: string;
      };
      exam?: {
        exam_name?: string;
        name?: string;
      };
      total_marks?: number;
      total_max_marks?: number;
      percentage?: number;
      grade?: string;
      subject_marks?: Array<{
        subject?: { name?: string };
        marks_obtained?: number;
        max_marks?: number;
        percentage?: number;
        grade?: string;
      }>;
    }

    // Prepare data for export
    const exportData = marks.map((mark: MarkData) => {
      const row: Record<string, string | number> = {
        'Roll Number': mark.student?.roll_number || '',
        'Student Name': mark.student?.student_name || mark.student?.full_name || '',
        'Admission No': mark.student?.admission_no || '',
        'Class': mark.student?.class || '',
        'Section': mark.student?.section || '',
        'Exam Name': mark.exam?.exam_name || mark.exam?.name || '',
        'Total Marks': mark.total_marks || 0,
        'Max Marks': mark.total_max_marks || 0,
        'Percentage': mark.percentage?.toFixed(2) || 0,
        'Grade': mark.grade || 'N/A',
        'Result Status': (mark.percentage || 0) >= 40 ? 'Pass' : 'Fail',
      };

      // Add subject-wise marks
      if (mark.subject_marks && Array.isArray(mark.subject_marks)) {
        mark.subject_marks.forEach((sm) => {
          row[`${sm.subject?.name || 'Subject'} (Obtained)`] = sm.marks_obtained || 0;
          row[`${sm.subject?.name || 'Subject'} (Max)`] = sm.max_marks || 0;
          row[`${sm.subject?.name || 'Subject'} (%)`] = sm.percentage?.toFixed(2) || 0;
          row[`${sm.subject?.name || 'Subject'} (Grade)`] = sm.grade || 'N/A';
        });
      }

      return row;
    });

    if (format === 'csv') {
      // Generate CSV
      if (exportData.length === 0) {
        return new NextResponse('No data available', {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="marks_export_${new Date().toISOString().split('T')[0]}.csv"`,
          },
        });
      }

      const headers = Object.keys(exportData[0]);
      const csvRows = [
        headers.join(','),
        ...exportData.map((row: Record<string, string | number>) =>
          headers.map((header) => {
            const value = row[header];
            const stringValue = String(value || '');
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          }).join(',')
        ),
      ];

      const csvContent = csvRows.join('\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="marks_export_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else {
      // Generate Excel
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Marks');

      // Generate buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="marks_export_${new Date().toISOString().split('T')[0]}.xlsx"`,
        },
      });
    }
  } catch (error) {
    console.error('Error exporting marks:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
