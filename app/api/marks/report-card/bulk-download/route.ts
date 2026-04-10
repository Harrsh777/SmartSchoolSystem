import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import archiver from 'archiver';

const MAX_IDS = 200;

function safeFilenamePart(s: string): string {
  return (s || '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * POST /api/marks/report-card/bulk-download
 * Body: { school_code: string, report_card_ids: string[] }
 * Returns: ZIP of HTML files (one per report card), scoped to the school.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const school_code = typeof body.school_code === 'string' ? body.school_code.trim() : '';
    const report_card_ids = body.report_card_ids;

    if (!school_code || !Array.isArray(report_card_ids) || report_card_ids.length === 0) {
      return NextResponse.json(
        { error: 'school_code and report_card_ids (non-empty array) are required' },
        { status: 400 }
      );
    }

    const ids = [...new Set(report_card_ids.map((x: unknown) => String(x)))].filter(Boolean);
    if (ids.length > MAX_IDS) {
      return NextResponse.json(
        { error: `At most ${MAX_IDS} report cards per download` },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    const { data: rows, error } = await supabase
      .from('report_cards')
      .select('id, html_content, student_name, academic_year')
      .ilike('school_code', school_code)
      .in('id', ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: 'No report cards found for the selected IDs and school' },
        { status: 404 }
      );
    }

    const rowsWithHtml = rows.filter((r) => String(r.html_content || '').trim());
    if (rowsWithHtml.length === 0) {
      return NextResponse.json(
        { error: 'Selected report cards have no HTML content to download' },
        { status: 404 }
      );
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    archive.on('data', (chunk: Buffer) => chunks.push(chunk));

    const bufferPromise = new Promise<Buffer>((resolve, reject) => {
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);
    });

    const usedNames = new Set<string>();
    for (const row of rowsWithHtml) {
      const html = row.html_content as string;
      const base = `report_card_${safeFilenamePart(String(row.student_name))}_${safeFilenamePart(String(row.academic_year || ''))}_${String(row.id).slice(0, 8)}`;
      let name = `${base}.html`;
      let n = 1;
      while (usedNames.has(name)) {
        name = `${base}_${n++}.html`;
      }
      usedNames.add(name);
      archive.append(Buffer.from(html, 'utf-8'), name);
    }

    await archive.finalize();
    const zipBuffer = await bufferPromise;

    const dateStr = new Date().toISOString().split('T')[0];
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="report_cards_${safeFilenamePart(school_code)}_${dateStr}.zip"`,
        'Content-Length': String(zipBuffer.length),
        'X-Report-Card-Count': String(rowsWithHtml.length),
      },
    });
  } catch (error) {
    console.error('Error in report card bulk download:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
