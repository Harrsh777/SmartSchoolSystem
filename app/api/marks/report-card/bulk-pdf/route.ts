import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { mergeReportCardHtmlDocuments } from '@/lib/report-card-bulk-merge';
import {
  renderReportCardHtmlToPdfBuffer,
  requireAppUrlForPdf,
} from '@/lib/report-card-pdf';

export const runtime = 'nodejs';

const MAX_IDS = 200;

function safeFilenamePart(s: string): string {
  return (s || '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * POST /api/marks/report-card/bulk-pdf
 * Body: { school_code: string, report_card_ids: string[], filename_hint?: string }
 * Returns: one combined PDF (A4 landscape, one student per page).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const school_code = typeof body.school_code === 'string' ? body.school_code.trim() : '';
    const report_card_ids = body.report_card_ids;
    const filename_hint =
      typeof body.filename_hint === 'string' ? body.filename_hint.trim().slice(0, 120) : '';

    if (!school_code || !Array.isArray(report_card_ids) || report_card_ids.length === 0) {
      return NextResponse.json(
        { error: 'school_code and report_card_ids (non-empty array) are required' },
        { status: 400 }
      );
    }

    const ids = report_card_ids.map((x: unknown) => String(x)).filter(Boolean);
    const uniqueOrdered: string[] = [];
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      uniqueOrdered.push(id);
    }
    if (uniqueOrdered.length > MAX_IDS) {
      return NextResponse.json(
        { error: `At most ${MAX_IDS} report cards per download` },
        { status: 400 }
      );
    }

    let appUrl: string;
    try {
      appUrl = requireAppUrlForPdf();
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }

    const supabase = getServiceRoleClient();
    const { data: rows, error } = await supabase
      .from('report_cards')
      .select('id, html_content, student_name, academic_year')
      .ilike('school_code', school_code)
      .in('id', uniqueOrdered);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const byId = new Map((rows || []).map((r) => [String(r.id), r]));
    const htmlParts: string[] = [];
    for (const id of uniqueOrdered) {
      const row = byId.get(id);
      const html = row ? String(row.html_content || '').trim() : '';
      if (html) htmlParts.push(html);
    }

    if (htmlParts.length === 0) {
      return NextResponse.json(
        { error: 'No report cards with HTML content found for the selected IDs and school' },
        { status: 404 }
      );
    }

    const merged = mergeReportCardHtmlDocuments(htmlParts, 'server-pdf', appUrl);
    const pdfBuffer = await renderReportCardHtmlToPdfBuffer(merged);

    const baseName = filename_hint
      ? `${safeFilenamePart(filename_hint)}_ReportCards`
      : `ReportCards_${safeFilenamePart(school_code)}_${new Date().toISOString().split('T')[0]}`;

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}.pdf"`,
        'Content-Length': String(pdfBuffer.byteLength),
        'X-Report-Card-Count': String(htmlParts.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error in report card bulk PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
