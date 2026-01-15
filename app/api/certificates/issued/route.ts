import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/certificates/issued
 * Get all issued certificates for a school
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const templateId = searchParams.get('template_id');
    const recipientType = searchParams.get('recipient_type');
    const status = searchParams.get('status');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Build query
    let query = supabase
      .from('certificates_issued')
      .select(`
        *,
        certificate_templates (
          id,
          name,
          type
        )
      `)
      .eq('school_code', schoolCode)
      .order('issued_at', { ascending: false });

    if (templateId) {
      query = query.eq('template_id', templateId);
    }

    if (recipientType) {
      query = query.eq('recipient_type', recipientType);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: certificates, error } = await query;

    if (error) {
      console.error('Error fetching certificates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch certificates', details: error.message },
        { status: 500 }
      );
    }

    // Fetch recipient details
    const certificatesWithDetails = await Promise.all(
      (certificates || []).map(async (cert) => {
        let recipientInfo: Record<string, unknown> = {};
        
        if (cert.recipient_type === 'student') {
          const { data: student } = await supabase
            .from('students')
            .select('id, student_name, full_name, class, section, roll_number, admission_no')
            .eq('id', cert.recipient_id)
            .single();
          
          recipientInfo = {
            student_name: student?.full_name || student?.student_name || '',
            student_class: student?.class || '',
            student_section: student?.section || '',
            student_roll_number: student?.roll_number || '',
            student_admission_no: student?.admission_no || '',
          };
        } else {
          const { data: staff } = await supabase
            .from('staff')
            .select('id, full_name, staff_id, designation')
            .eq('id', cert.recipient_id)
            .single();
          
          recipientInfo = {
            staff_name: staff?.full_name || '',
            staff_id: staff?.staff_id || '',
            staff_designation: staff?.designation || '',
          };
        }

        return {
          ...cert,
          recipient_info: recipientInfo,
        };
      })
    );

    return NextResponse.json({ data: certificatesWithDetails }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/certificates/issued:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
