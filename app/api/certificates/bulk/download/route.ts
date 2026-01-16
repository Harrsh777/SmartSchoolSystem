import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * POST /api/certificates/bulk/download
 * Download certificates as ZIP file
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, certificate_ids, zip_name } = body;

    if (!school_code || !certificate_ids || !Array.isArray(certificate_ids) || certificate_ids.length === 0) {
      return NextResponse.json(
        { error: 'School code and certificate_ids are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Get certificates
    const { data: certificates, error: certError } = await supabase
      .from('certificates_issued')
      .select('*, certificate_templates(name)')
      .eq('school_code', school_code)
      .in('id', certificate_ids);

    if (certError || !certificates || certificates.length === 0) {
      return NextResponse.json(
        { error: 'Certificates not found' },
        { status: 404 }
      );
    }

    // Add certificates to ZIP
    // Note: This is a simplified version. In production, you'd need to:
    // 1. Generate PDFs from templates if not already generated
    // 2. Download PDFs from storage
    // 3. Add them to the ZIP
    
    // For now, return the certificate data as JSON
    // In a full implementation, you would generate/retrieve PDFs and add them to the archive

    const zipFileName = zip_name || `Certificates_${Date.now()}.zip`;
    
    // Return certificate data (full implementation would stream ZIP)
    return NextResponse.json({
      data: {
        certificates: certificates.map(cert => ({
          id: cert.id,
          certificate_number: cert.certificate_number,
          pdf_url: cert.pdf_url,
        })),
        zip_name: zipFileName,
        count: certificates.length,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error in POST /api/certificates/bulk/download:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
