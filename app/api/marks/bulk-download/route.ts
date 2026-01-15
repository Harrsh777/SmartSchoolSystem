import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import archiver from 'archiver';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * GET /api/marks/bulk-download
 * Download all report cards as ZIP
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const examId = searchParams.get('exam_id');
    const classId = searchParams.get('class_id');
    const section = searchParams.get('section');

    if (!schoolCode || !examId) {
      return NextResponse.json(
        { error: 'School code and exam ID are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Fetch exam data
    const { data: exam } = await supabase
      .from('examinations')
      .select('*')
      .eq('id', examId)
      .eq('school_code', schoolCode)
      .single();

    if (!exam) {
      return NextResponse.json(
        { error: 'Examination not found' },
        { status: 404 }
      );
    }

    // Fetch school info
    const { data: school } = await supabase
      .from('accepted_schools')
      .select('school_name, logo_url, principal_name')
      .eq('school_code', schoolCode)
      .single();

    // Fetch all students with marks for this exam
    const { data: summaries } = await supabase
      .from('student_exam_summary')
      .select(`
        *,
        student:students!inner (
          id,
          student_name,
          full_name,
          admission_no,
          roll_number,
          class,
          section
        )
      `)
      .eq('exam_id', examId)
      .eq('school_code', schoolCode);

    if (!summaries || summaries.length === 0) {
      return NextResponse.json(
        { error: 'No marks found for this examination' },
        { status: 404 }
      );
    }

    // Filter by class and section if provided
    let filteredSummaries = summaries;
    if (classId || section) {
      filteredSummaries = summaries.filter((s: any) => {
        const student = s.student;
        if (classId && student?.class !== classId) return false;
        if (section && student?.section !== section) return false;
        return true;
      });
    }

    // Create archiver
    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    // Generate PDF for each student
    for (const summary of filteredSummaries) {
      try {
        const student = summary.student;
        if (!student) continue;

        // Fetch marks for this student
        const { data: marks } = await supabase
          .from('student_subject_marks')
          .select(`
            *,
            subject:subjects (
              id,
              name,
              color
            )
          `)
          .eq('exam_id', examId)
          .eq('student_id', student.id)
          .order('created_at', { ascending: true });

        if (!marks || marks.length === 0) continue;

        // Generate PDF
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595, 842]);
        const { width, height } = page.getSize();

        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const drawText = (text: string, x: number, y: number, size: number, font: any = helveticaFont, color: any = rgb(0, 0, 0)) => {
          page.drawText(text, { x, y, size, font, color });
        };

        // Header
        drawText('REPORT CARD', width / 2 - 60, height - 50, 24, helveticaBold);
        drawText(school?.school_name || 'School Name', width / 2 - 80, height - 80, 14, helveticaBold);
        drawText(exam.exam_name || exam.name || 'Examination', width / 2 - 60, height - 100, 12);

        // Student Info
        let yPos = height - 180;
        drawText('Student Information', 50, yPos, 14, helveticaBold);
        yPos -= 25;
        drawText(`Name: ${student.student_name || student.full_name || 'N/A'}`, 50, yPos, 11);
        yPos -= 20;
        drawText(`Class: ${student.class || 'N/A'} ${student.section ? `- ${student.section}` : ''}`, 50, yPos, 11);
        yPos -= 20;
        drawText(`Roll Number: ${student.roll_number || 'N/A'}`, 50, yPos, 11);

        // Marks Table
        yPos -= 40;
        drawText('Subject-wise Marks', 50, yPos, 14, helveticaBold);
        yPos -= 25;

        const rowHeight = 20;
        const colWidths = [200, 80, 80, 80, 60];

        // Table Header
        page.drawRectangle({
          x: 50,
          y: yPos - 15,
          width: width - 100,
          height: rowHeight,
          color: rgb(0.9, 0.9, 0.9),
        });

        let currentX = 50;
        drawText('Subject', currentX + 5, yPos, 10, helveticaBold);
        currentX += colWidths[0];
        drawText('Max', currentX + 5, yPos, 10, helveticaBold);
        currentX += colWidths[1];
        drawText('Obtained', currentX + 5, yPos, 10, helveticaBold);
        currentX += colWidths[2];
        drawText('%', currentX + 5, yPos, 10, helveticaBold);
        currentX += colWidths[3];
        drawText('Grade', currentX + 5, yPos, 10, helveticaBold);

        yPos -= rowHeight;

        // Marks rows
        marks.forEach((mark) => {
          if (yPos < 100) {
            const newPage = pdfDoc.addPage([595, 842]);
            yPos = newPage.getSize().height - 50;
          }

          const percentage = mark.max_marks > 0 ? (mark.marks_obtained / mark.max_marks) * 100 : 0;
          const isPass = percentage >= 40;

          currentX = 50;
          drawText(mark.subject?.name || 'N/A', currentX + 5, yPos, 10);
          currentX += colWidths[0];
          drawText(String(mark.max_marks), currentX + 5, yPos, 10);
          currentX += colWidths[1];
          drawText(String(mark.marks_obtained), currentX + 5, yPos, 10);
          currentX += colWidths[2];
          drawText(`${percentage.toFixed(2)}%`, currentX + 5, yPos, 10, helveticaFont, isPass ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0));
          currentX += colWidths[3];
          drawText(mark.grade || 'N/A', currentX + 5, yPos, 10, helveticaFont, isPass ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0));

          yPos -= rowHeight;
        });

        // Summary
        if (summary) {
          yPos -= 30;
          drawText('Summary', 50, yPos, 14, helveticaBold);
          yPos -= 25;
          drawText(`Total: ${summary.total_marks || 0} / ${summary.total_max_marks || 0}`, 50, yPos, 11);
          yPos -= 20;
          drawText(`Percentage: ${summary.percentage?.toFixed(2) || 0}%`, 50, yPos, 11);
          yPos -= 20;
          drawText(`Grade: ${summary.grade || 'N/A'}`, 50, yPos, 11);
        }

        // Generate PDF bytes
        const pdfBytes = await pdfDoc.save();
        const fileName = `${student.student_name || student.full_name || student.id}_${student.roll_number || student.admission_no || ''}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');
        
        archive.append(Buffer.from(pdfBytes), fileName);
      } catch (err) {
        console.error(`Error processing student ${summary.student_id}:`, err);
        // Continue with next student
      }
    }

    // Finalize archive
    await archive.finalize();

    // Return streaming response
    return new NextResponse(archive as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="report_cards_${examId}_${new Date().toISOString().split('T')[0]}.zip"`,
      },
    });
  } catch (error) {
    console.error('Error in bulk download:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
