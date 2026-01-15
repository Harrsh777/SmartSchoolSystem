import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/certificates/verify/[code]
 * Verify a certificate by its verification code
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Find certificate by code
    const { data: certificate, error } = await supabase
      .from('certificates_issued')
      .select(`
        *,
        certificate_templates (
          id,
          name,
          type
        )
      `)
      .eq('certificate_code', code.toUpperCase())
      .single();

    if (error || !certificate) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Certificate not found or invalid verification code' 
        },
        { status: 404 }
      );
    }

    // Get recipient information
    let recipientInfo: Record<string, unknown> = {};
    if (certificate.recipient_type === 'student') {
      const { data: student } = await supabase
        .from('students')
        .select('full_name, student_name, class, section, roll_number, admission_no')
        .eq('id', certificate.recipient_id)
        .single();

      recipientInfo = {
        name: student?.full_name || student?.student_name || 'Unknown',
        type: 'Student',
        class: student?.class || '',
        section: student?.section || '',
        roll_number: student?.roll_number || '',
        admission_number: student?.admission_no || '',
      };
    } else {
      const { data: staff } = await supabase
        .from('staff')
        .select('full_name, staff_name, designation, staff_id')
        .eq('id', certificate.recipient_id)
        .single();

      recipientInfo = {
        name: staff?.full_name || staff?.staff_name || 'Unknown',
        type: 'Staff',
        designation: staff?.designation || '',
        staff_id: staff?.staff_id || '',
      };
    }

    // Get school information
    const { data: school } = await supabase
      .from('accepted_schools')
      .select('school_name')
      .eq('school_code', certificate.school_code)
      .single();

    return NextResponse.json({
      valid: true,
      data: {
        certificate: {
          id: certificate.id,
          certificate_number: certificate.certificate_number,
          certificate_code: certificate.certificate_code,
          status: certificate.status,
          issued_at: certificate.issued_at,
          template: certificate.certificate_templates,
        },
        recipient: recipientInfo,
        school: {
          name: school?.school_name || '',
        },
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/certificates/verify/[code]:', error);
    return NextResponse.json(
      { 
        valid: false,
        error: 'Internal server error', 
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}
