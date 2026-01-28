import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * GET /api/marks/report-card
 * Generate PDF report card for a student
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

    const supabase = getServiceRoleClient();

    // Fetch student data
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .eq('school_code', schoolCode)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Fetch exam data
    const { data: exam, error: examError } = await supabase
      .from('examinations')
      .select('*')
      .eq('id', examId)
      .eq('school_code', schoolCode)
      .single();

    if (examError || !exam) {
      return NextResponse.json(
        { error: 'Examination not found' },
        { status: 404 }
      );
    }

    // Fetch marks
    const { data: marks, error: marksError } = await supabase
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
      .eq('student_id', studentId)
      .order('created_at', { ascending: true });

    if (marksError) {
      return NextResponse.json(
        { error: 'Failed to fetch marks', details: marksError.message },
        { status: 500 }
      );
    }

    // Fetch summary
    const { data: summary } = await supabase
      .from('student_exam_summary')
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .single();

    // Fetch school info
    const { data: school } = await supabase
      .from('accepted_schools')
      .select('school_name, logo_url, principal_name')
      .eq('school_code', schoolCode)
      .single();

    // Generate PDF (A4 portrait)
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();

    // Load fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Helper function to draw text
    const drawText = (text: string, x: number, y: number, size: number, font = helveticaFont, color = rgb(0, 0, 0)) => {
      page.drawText(text, {
        x,
        y,
        size,
        font,
        color,
      });
    };

    // ===== Header (colorful, production-ready) =====
    const brandBlue = rgb(0.12, 0.23, 0.54); // #1E3A8A-ish
    const brandLight = rgb(0.23, 0.51, 0.96); // #3B82F6-ish

    // Top band
    page.drawRectangle({
      x: 0,
      y: height - 110,
      width,
      height: 110,
      color: brandBlue,
    });
    // Accent band
    page.drawRectangle({
      x: 0,
      y: height - 118,
      width,
      height: 8,
      color: brandLight,
    });

    const schoolName = String(school?.school_name || 'School');
    const examName = String(exam.exam_name || exam.name || 'Examination');
    const ay = String(exam.academic_year || 'N/A');

    drawText(schoolName.toUpperCase(), 40, height - 55, 16, helveticaBold, rgb(1, 1, 1));
    drawText('REPORT CARD', 40, height - 80, 22, helveticaBold, rgb(1, 1, 1));
    drawText(`${examName}  •  Academic Year: ${ay}`, 40, height - 100, 11, helveticaFont, rgb(1, 1, 1));

    // Card border
    page.drawRectangle({
      x: 30,
      y: 40,
      width: width - 60,
      height: height - 160,
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });

    // Student Information
    let yPos = height - 170;
    drawText('Student Information', 50, yPos, 13, helveticaBold, rgb(0.1, 0.1, 0.1));
    yPos -= 25;
    drawText(`Name: ${student.student_name || 'N/A'}`, 50, yPos, 11, helveticaBold);
    yPos -= 20;
    drawText(`Class: ${student.class || 'N/A'} ${student.section ? `- ${student.section}` : ''}`, 50, yPos, 11);
    yPos -= 20;
    drawText(`Roll Number: ${student.roll_number || 'N/A'}`, 50, yPos, 11);
    yPos -= 20;
    drawText(`Admission No: ${student.admission_no || 'N/A'}`, 50, yPos, 11);

    // Marks Table
    yPos -= 40;
    drawText('Subject-wise Marks', 50, yPos, 13, helveticaBold);
    yPos -= 25;

    // Table Header
    const colWidths = [200, 80, 80, 80, 60, 80];
    const rowHeight = 20;
    let currentX = 50;

    // Draw table header background
    page.drawRectangle({
      x: 50,
      y: yPos - 15,
      width: width - 100,
      height: rowHeight,
      color: rgb(0.94, 0.96, 0.99),
    });
    // Header line
    page.drawLine({
      start: { x: 50, y: yPos - 15 },
      end: { x: width - 50, y: yPos - 15 },
      color: rgb(0.85, 0.88, 0.92),
      thickness: 1,
    });

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

    // Draw marks rows
    let totalObtained = 0;
    let totalMax = 0;

    (marks || []).forEach((mark, idx) => {
      if (yPos < 100) {
        // Add new page if needed
        const newPage = pdfDoc.addPage([595, 842]);
        yPos = newPage.getSize().height - 50;
      }

      const max = Number(mark.max_marks ?? 0) || 0;
      const obtained = mark.marks_obtained === null || mark.marks_obtained === undefined ? null : Number(mark.marks_obtained);
      const isAbsent = String(mark.remarks || '').toLowerCase() === 'absent' || obtained === null;
      const percentage = !isAbsent && max > 0 ? ((obtained || 0) / max) * 100 : 0;
      const isPass = percentage >= 40;

      if (!isAbsent) {
        totalMax += max;
        totalObtained += (obtained || 0);
      } else {
        // still count max marks for total? keep consistent with summary if available
        totalMax += max;
      }

      // Zebra rows
      if (idx % 2 === 0) {
        page.drawRectangle({
          x: 50,
          y: yPos - 5,
          width: width - 100,
          height: rowHeight,
          color: rgb(0.99, 0.99, 1),
        });
      }

      currentX = 50;
      drawText(mark.subject?.name || 'N/A', currentX + 5, yPos, 10);
      currentX += colWidths[0];
      drawText(String(max), currentX + 5, yPos, 10);
      currentX += colWidths[1];
      drawText(isAbsent ? 'AB' : String(obtained ?? 0), currentX + 5, yPos, 10, helveticaFont, isAbsent ? rgb(0.6, 0, 0) : rgb(0, 0, 0));
      currentX += colWidths[2];
      drawText(isAbsent ? '-' : `${percentage.toFixed(2)}%`, currentX + 5, yPos, 10, helveticaFont, isPass ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0));
      currentX += colWidths[3];
      drawText(mark.grade || 'N/A', currentX + 5, yPos, 10, helveticaFont, isPass ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0));

      yPos -= rowHeight;
    });

    // Summary
    const computedPercentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    const finalTotal = summary?.total_marks ?? totalObtained;
    const finalMax = summary?.total_max_marks ?? totalMax;
    const finalPercentage = summary?.percentage ?? computedPercentage;
    const finalGrade = summary?.grade ?? null;

    if (marks && marks.length > 0) {
      yPos -= 30;
      drawText('Summary', 50, yPos, 14, helveticaBold);
      yPos -= 25;
      drawText(`Total Marks: ${Number(finalTotal || 0)} / ${Number(finalMax || 0)}`, 50, yPos, 11);
      yPos -= 20;
      drawText(`Percentage: ${Number(finalPercentage || 0).toFixed(2)}%`, 50, yPos, 11);
      yPos -= 20;
      drawText(`Grade: ${finalGrade || 'N/A'}`, 50, yPos, 11);
      yPos -= 20;
      const isPass = Number(finalPercentage || 0) >= 40;
      drawText(`Result: ${isPass ? 'PASS' : 'FAIL'}`, 50, yPos, 11, helveticaBold, isPass ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0));
    }

    // Signatures
    yPos = 150;
    drawText('Class Teacher', 100, yPos, 10);
    drawText('Principal', width / 2 - 30, yPos, 10);
    drawText('Date', width - 150, yPos, 10);
    yPos -= 60;
    page.drawLine({
      start: { x: 100, y: yPos },
      end: { x: 200, y: yPos },
    });
    page.drawLine({
      start: { x: width / 2 - 50, y: yPos },
      end: { x: width / 2 + 50, y: yPos },
    });
    page.drawLine({
      start: { x: width - 150, y: yPos },
      end: { x: width - 50, y: yPos },
    });

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="report_card_${(student.student_name || '').replace(/\s+/g, '_') || studentId}_${(exam.exam_name || examId || 'exam').replace(/\s+/g, '_')}.pdf"`,
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
