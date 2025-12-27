import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    // Fetch marks/examination data from marks table
    const { data: marksData, error } = await supabase
      .from('marks')
      .select(`
        *,
        students:student_id (
          student_name,
          admission_no,
          class,
          section
        ),
        examinations:exam_id (
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
      'Percentage',
      'Grade',
      'Remarks',
      'Date',
    ].join(',') + '\n';

    interface MarkWithRelations {
      students?: { admission_no?: string; student_name?: string; [key: string]: unknown };
      examinations?: { name?: string; [key: string]: unknown };
      marks_obtained?: number;
      max_marks?: number;
      [key: string]: unknown;
    }
    const csvRows = marksData.map((mark: MarkWithRelations) => {
      const student = mark.students as { admission_no?: string; student_name?: string; [key: string]: unknown };
      const exam = mark.examinations as { name?: string; [key: string]: unknown };
      
      const marksObtained = mark.marks_obtained || 0;
      const maxMarks = mark.max_marks || 100;
      const percentage = mark.percentage && typeof mark.percentage === 'number' 
        ? mark.percentage.toFixed(2) 
        : (maxMarks > 0 ? ((Number(marksObtained) / Number(maxMarks)) * 100).toFixed(2) : '0.00');
      
      return [
        student?.student_name || '',
        student?.admission_no || mark.admission_no || '',
        student?.class || '',
        student?.section || '',
        exam?.exam_name || '',
        exam?.academic_year || '',
        '', // Subject - not in marks table, would need to be added if available
        marksObtained,
        maxMarks,
        percentage,
        mark.grade || '',
        mark.remarks || '',
        exam?.start_date || mark.created_at || '',
      ].map(val => {
        const stringVal = String(val);
        if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
          return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
      }).join(',');
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

