import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * POST /api/certificates/bulk/generate
 * Generate bulk certificates from CSV data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      template_id,
      csv_data, // Array of objects with mapped fields
      field_mapping, // Map of CSV column -> placeholder key
      issued_by,
    } = body;

    if (!school_code || !template_id || !csv_data || !Array.isArray(csv_data) || csv_data.length === 0) {
      return NextResponse.json(
        { error: 'School code, template_id, and csv_data are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Get school ID
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('certificate_templates')
      .select('*')
      .eq('id', template_id)
      .eq('school_code', school_code)
      .is('deleted_at', null)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Generate certificates
    const generatedCertificates = [];
    const errors = [];

    for (let i = 0; i < csv_data.length; i++) {
      try {
        const rowData = csv_data[i];
        
        // Generate certificate number and code
        const { data: certNumberData } = await supabase.rpc('generate_certificate_number');
        const { data: certCodeData } = await supabase.rpc('generate_certificate_code');
        
        const certificateNumber = certNumberData || `CERT-${Date.now()}-${i}`;
        const certificateCode = certCodeData || `CODE${Date.now()}${i}`;

        // Create metadata from mapped fields
        const metadata: Record<string, string> = {};
        if (field_mapping) {
          Object.entries(field_mapping as Record<string, string>).forEach(([csvColumn, placeholderKey]) => {
            if (rowData[csvColumn as keyof typeof rowData]) {
              metadata[placeholderKey] = String(rowData[csvColumn as keyof typeof rowData] || '');
            }
          });
        }

        // Store certificate record
        const { data: certificate, error: certError } = await supabase
          .from('certificates_issued')
          .insert([
            {
              school_id: schoolData.id,
              school_code,
              template_id,
              recipient_type: template.type,
              recipient_id: metadata.recipient_id || `temp-${i}`,
              certificate_number: certificateNumber,
              certificate_code: certificateCode,
              status: 'ISSUED',
              metadata,
              issued_by: issued_by || null,
            },
          ])
          .select()
          .single();

        if (certError) {
          errors.push({ row: i + 1, error: certError.message });
          continue;
        }

        generatedCertificates.push(certificate);
      } catch (err) {
        errors.push({ row: i + 1, error: (err as Error).message });
      }
    }

    return NextResponse.json({
      data: {
        generated_count: generatedCertificates.length,
        total_count: csv_data.length,
        errors: errors.length > 0 ? errors : undefined,
        certificates: generatedCertificates,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error in POST /api/certificates/bulk/generate:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
