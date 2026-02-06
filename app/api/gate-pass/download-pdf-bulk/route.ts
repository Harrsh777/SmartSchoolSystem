import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseFetchOptions } from '@/lib/supabase-fetch';
import archiver from 'archiver';
import { generateGatePassPdf, getGatePassPdfFilename } from '@/lib/gate-pass-pdf';

const getServiceRoleClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    getSupabaseFetchOptions()
  );
};

/**
 * POST /api/gate-pass/download-pdf-bulk
 * Body: { ids: string[] } - gate pass IDs
 * Returns: ZIP of PDFs, each named "{Person Name} Gate Pass.pdf"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const ids = body.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids array is required and must not be empty' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    const { data: passes, error: fetchError } = await supabase
      .from('gate_passes')
      .select('*')
      .in('id', ids);

    if (fetchError || !passes || passes.length === 0) {
      return NextResponse.json(
        { error: 'No gate passes found for the given ids' },
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

    for (const pass of passes) {
      try {
        const pdfBytes = await generateGatePassPdf(pass);
        const filename = getGatePassPdfFilename(pass.person_name || 'GatePass');
        archive.append(Buffer.from(pdfBytes), filename);
      } catch (err) {
        console.error(`Error generating PDF for gate pass ${pass.id}:`, err);
      }
    }

    await archive.finalize();
    const zipBuffer = await bufferPromise;

    const filename = `Gate_Passes_${new Date().toISOString().split('T')[0]}.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(zipBuffer.length),
      },
    });
  } catch (error) {
    console.error('Error in gate pass bulk PDF download:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
