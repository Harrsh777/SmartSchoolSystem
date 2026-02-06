import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseFetchOptions } from '@/lib/supabase-fetch';
import { generateGatePassPdf, getGatePassPdfFilename } from '@/lib/gate-pass-pdf';

const getServiceRoleClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    getSupabaseFetchOptions()
  );
};

/**
 * GET /api/gate-pass/[id]/download-pdf
 * Generate and download a single gate pass as PDF (A4 size), filename: "{Person Name} Gate Pass.pdf"
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceRoleClient();

    const { data: pass, error: fetchError } = await supabase
      .from('gate_passes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !pass) {
      return NextResponse.json(
        { error: 'Gate pass not found' },
        { status: 404 }
      );
    }

    const pdfBytes = await generateGatePassPdf(pass);
    const filename = getGatePassPdfFilename(pass.person_name || 'GatePass');

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBytes.length),
      },
    });
  } catch (error) {
    console.error('Error generating gate pass PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
