import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/certificates/simple
 * Get all certificates for a school (simplified version)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Fetch certificates from the simple_certificates table
    const { data: certificates, error } = await supabase
      .from('simple_certificates')
      .select('*')
      .eq('school_code', schoolCode)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching certificates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch certificates', details: error.message },
        { status: 500 }
      );
    }

    // Fetch student details for each certificate
    const certificatesWithDetails = await Promise.all(
      (certificates || []).map(async (cert) => {
        const { data: student } = await supabase
          .from('students')
          .select('id, student_name, full_name, class, section')
          .eq('id', cert.student_id)
          .single();

        return {
          id: cert.id,
          student_id: cert.student_id,
          student_name: student?.full_name || student?.student_name || 'Unknown',
          student_class: student?.class || '',
          student_section: student?.section || '',
          certificate_image_url: cert.certificate_image_url,
          certificate_title: cert.certificate_title,
          submitted_at: cert.submitted_at,
          submitted_by: cert.submitted_by,
        };
      })
    );

    return NextResponse.json({ data: certificatesWithDetails }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/certificates/simple:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
