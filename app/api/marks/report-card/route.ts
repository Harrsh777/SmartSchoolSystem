import { NextRequest, NextResponse } from 'next/server';
import { fetchReportCardData } from './html/route';
import { generateReportCardHTML } from '@/lib/report-card-html';

/**
 * GET /api/marks/report-card
 * Generate HTML report card for a student (on-the-fly)
 * Query: school_code, student_id, exam_id
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const studentId = searchParams.get('student_id');
    const examId = searchParams.get('exam_id');

    if (!schoolCode || !studentId || !examId) {
      return NextResponse.json(
        { error: 'School code, student ID, and exam ID are required' },
        { status: 400 }
      );
    }

    const data = await fetchReportCardData(schoolCode, studentId, examId);
    if (!data) {
      return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    }

    const html = generateReportCardHTML(data);

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="report_card_${(data.student.student_name || '').replace(/\s+/g, '_')}_${(data.exam.exam_name || '').replace(/\s+/g, '_')}.html"`,
      },
    });
  } catch (error) {
    console.error('Error generating report card:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
