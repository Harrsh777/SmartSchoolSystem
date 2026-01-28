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

    // Fetch marks from new student_subject_marks table
    const { data: marksData, error } = await supabase
      .from('student_subject_marks')
      .select(`
        *,
        student:students!student_subject_marks_student_id_fkey(
          student_name,
          admission_no,
          class,
          section
        ),
        exam:examinations!student_subject_marks_exam_id_fkey(
          exam_name,
          academic_year,
          start_date,
          end_date
        )
      `)
      .eq('school_code', schoolCode)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch marks data', details: error.message },
        { status: 500 }
      );
    }

    // Convert to CSV
    if (!marksData || marksData.length === 0) {
      return new NextResponse('No marks data available', {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="marks_report_${schoolCode}.csv"`,
        },
      });
    }

    // Create CSV with relevant columns
    const csvHeader = [
      'Student Name',
      'Admission Number',
      'Class',
      'Section',
      'Exam Name',
      'Academic Year',
      'Subject',
      'Marks Obtained',
      'Maximum Marks',
      'Pass Marks',
      'Percentage',
      'Grade',
      'Remarks',
      'Entered By',
      'Date',
    ].join(',') + '\n';

    const escapeCsvValue = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      const stringVal = String(val);
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      return stringVal;
    };

    interface MarkWithRelations {
      student?: { admission_no?: string; student_name?: string; class?: string; section?: string };
      exam?: { exam_name?: string; academic_year?: string; start_date?: string; end_date?: string };
      marks_obtained?: number;
      max_marks?: number;
      pass_marks?: number;
      subject?: string;
      grade?: string;
      remarks?: string;
      entered_by?: string;
      created_at?: string;
      [key: string]: unknown;
    }

    const csvRows = marksData.map((mark: MarkWithRelations) => {
      const student = mark.student as { admission_no?: string; student_name?: string; class?: string; section?: string } | undefined;
      const exam = mark.exam as { exam_name?: string; academic_year?: string; start_date?: string; end_date?: string } | undefined;
      
      const marksObtained = mark.marks_obtained || 0;
      const maxMarks = mark.max_marks || 100;
      const passMarks = mark.pass_marks || 0;
      const percentage = maxMarks > 0 ? ((Number(marksObtained) / Number(maxMarks)) * 100).toFixed(2) : '0.00';
      
      return [
        student?.student_name || '',
        student?.admission_no || '',
        student?.class || '',
        student?.section || '',
        exam?.exam_name || '',
        exam?.academic_year || '',
        mark.subject || '',
        marksObtained,
        maxMarks,
        passMarks,
        percentage,
        mark.grade || '',
        mark.remarks || '',
        mark.entered_by || '',
        exam?.start_date || mark.created_at || '',
      ].map(escapeCsvValue).join(',');
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="marks_report_${schoolCode}_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error generating marks report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

