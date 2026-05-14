import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import {
  injectAbsoluteBaseHref,
  renderReportCardHtmlToPdfBuffer,
  requireAppUrlForPdf,
} from '@/lib/report-card-pdf';

export const runtime = 'nodejs';

/**
 * GET /api/marks/report-card/[id]/pdf
 * Attachment PDF for one saved report card (same layout as print).
 * Optional query: student_id — student portal; only when sent to that student.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const studentIdParam = request.nextUrl.searchParams.get('student_id');

    if (!id) {
      return NextResponse.json({ error: 'Report card ID is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    const { data, error } = await supabase
      .from('report_cards')
      .select('id, html_content, student_name, academic_year, student_id, sent_at')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Report card not found' }, { status: 404 });
    }

    if (studentIdParam) {
      if (data.student_id !== studentIdParam || !data.sent_at) {
        return NextResponse.json({ error: 'Report card not found or not yet sent to you' }, { status: 404 });
      }
    }

    const htmlRaw = String(data.html_content || '').trim();
    if (!htmlRaw) {
      return NextResponse.json({ error: 'Report card has no content' }, { status: 404 });
    }

    let appUrl: string;
    try {
      appUrl = requireAppUrlForPdf();
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }

    const html = injectAbsoluteBaseHref(htmlRaw, appUrl);
    const pdfBuffer = await renderReportCardHtmlToPdfBuffer(html);

    const filename = `report_card_${String(data.student_name || 'student')
      .replace(/\s+/g, '_')
      .replace(/[^\w.-]+/g, '_')}_${String(data.academic_year || '')
      .replace(/\s+/g, '_')
      .replace(/[^\w.-]+/g, '_')}.pdf`;

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.byteLength),
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error generating report card PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
