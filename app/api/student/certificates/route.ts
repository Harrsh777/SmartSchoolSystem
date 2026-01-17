import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/student/certificates
 * Fetch all certificates (both simple and issued) for a specific student
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const studentId = searchParams.get('student_id');

    if (!schoolCode || !studentId) {
      return NextResponse.json(
        { error: 'school_code and student_id are required' },
        { status: 400 }
      );
    }

    // Fetch simple certificates (uploaded images)
    const { data: simpleCertificates, error: simpleError } = await supabase
      .from('simple_certificates')
      .select('*')
      .eq('school_code', schoolCode)
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false });

    if (simpleError) {
      console.error('Error fetching simple certificates:', simpleError);
    }

    // Fetch issued certificates (generated certificates)
    const { data: issuedCertificates, error: issuedError } = await supabase
      .from('certificates_issued')
      .select(`
        *,
        certificate_template:template_id (
          id,
          name,
          description
        )
      `)
      .eq('school_code', schoolCode)
      .eq('student_id', studentId)
      .order('issued_date', { ascending: false });

    if (issuedError) {
      console.error('Error fetching issued certificates:', issuedError);
    }

    // Format simple certificates
    interface SimpleCertificate {
      id: string;
      certificate_title?: string | null;
      certificate_image_url: string;
      submitted_at?: string;
      created_at?: string;
      submitted_by?: string;
      school_code: string;
      student_id: string;
    }
    const formattedSimple = (simpleCertificates || []).map((cert: SimpleCertificate) => ({
      id: cert.id,
      type: 'simple',
      title: cert.certificate_title || 'Certificate',
      image_url: cert.certificate_image_url,
      issued_date: cert.submitted_at || cert.created_at,
      submitted_by: cert.submitted_by,
      school_code: cert.school_code,
      student_id: cert.student_id,
    }));

    // Format issued certificates
    interface IssuedCertificate {
      id: string;
      certificate_name?: string | null;
      certificate_url?: string | null;
      certificate_image_url?: string | null;
      issued_date?: string;
      created_at?: string;
      verification_code?: string | null;
      template_id?: string;
      school_code: string;
      student_id: string;
      certificate_template?: {
        name?: string;
        description?: string | null;
      } | null;
    }
    const formattedIssued = (issuedCertificates || []).map((cert: IssuedCertificate) => ({
      id: cert.id,
      type: 'issued',
      title: cert.certificate_template?.name || cert.certificate_name || 'Certificate',
      image_url: cert.certificate_url || cert.certificate_image_url,
      issued_date: cert.issued_date || cert.created_at,
      verification_code: cert.verification_code || null,
      template_id: cert.template_id,
      school_code: cert.school_code,
      student_id: cert.student_id,
      description: cert.certificate_template?.description || null,
    }));

    // Combine and sort by date
    const allCertificates = [...formattedSimple, ...formattedIssued].sort((a, b) => {
      const dateA = a.issued_date ? new Date(a.issued_date).getTime() : 0;
      const dateB = b.issued_date ? new Date(b.issued_date).getTime() : 0;
      return dateB - dateA; // Most recent first
    });

    return NextResponse.json({ data: allCertificates }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student certificates:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
