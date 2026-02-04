import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { getPublicBaseUrl } from '@/lib/env';

/**
 * POST /api/certificates/generate
 * Generate a single certificate
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      template_id,
      recipient_type, // 'student' | 'staff'
      recipient_id,
      issued_by,
    } = body;

    if (!school_code || !template_id || !recipient_type || !recipient_id) {
      return NextResponse.json(
        { error: 'School code, template_id, recipient_type, and recipient_id are required' },
        { status: 400 }
      );
    }

    if (!['student', 'staff'].includes(recipient_type)) {
      return NextResponse.json(
        { error: 'recipient_type must be "student" or "staff"' },
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

    // Fetch recipient data
    let recipientData: Record<string, unknown> = {};
    if (recipient_type === 'student') {
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', recipient_id)
        .eq('school_code', school_code)
        .single();

      if (studentError || !student) {
        return NextResponse.json(
          { error: 'Student not found' },
          { status: 404 }
        );
      }

      recipientData = {
        student_name: student.full_name || student.student_name || '',
        student_first_name: student.first_name || '',
        student_last_name: student.last_name || '',
        student_roll_number: student.roll_number || '',
        student_admission_number: student.admission_no || student.admission_number || '',
        student_class: student.class || '',
        student_section: student.section || '',
        student_class_section: `${student.class || ''}${student.section ? `-${student.section}` : ''}`,
        student_photo: student.photo_url || '',
        student_date_of_birth: student.date_of_birth || '',
        student_gender: student.gender || '',
        student_address: student.address || '',
        student_mobile: student.student_contact || student.mobile || '',
        student_email: student.email || '',
        student_admission_date: student.admission_date || '',
        guardian_name: student.father_name || student.guardian_name || '',
        guardian_mobile: student.father_contact || student.guardian_mobile || '',
        guardian_email: student.guardian_email || '',
      };
    } else {
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('id', recipient_id)
        .eq('school_code', school_code)
        .single();

      if (staffError || !staff) {
        return NextResponse.json(
          { error: 'Staff not found' },
          { status: 404 }
        );
      }

      recipientData = {
        staff_name: staff.full_name || staff.staff_name || '',
        staff_first_name: staff.first_name || '',
        staff_last_name: staff.last_name || '',
        staff_id: staff.staff_id || '',
        staff_photo: staff.photo_url || '',
        staff_designation: staff.designation || '',
        staff_email: staff.email || '',
        staff_mobile: staff.mobile || staff.primary_contact || '',
      };
    }

    // Get school info
    const { data: schoolInfo } = await supabase
      .from('accepted_schools')
      .select('school_name, logo_url, principal_name')
      .eq('school_code', school_code)
      .single();

    // Generate certificate number and code
    // Try to use database functions, fallback to JavaScript generation
    let certificateNumber: string;
    let certificateCode: string;
    
    try {
      const { data: certNumberResult } = await supabase.rpc('generate_certificate_number');
      certificateNumber = certNumberResult || `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    } catch {
      certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }
    
    try {
      const { data: certCodeResult } = await supabase.rpc('generate_certificate_code');
      certificateCode = certCodeResult || Math.random().toString(36).substring(2, 10).toUpperCase();
    } catch {
      certificateCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    }

    // Prepare metadata with all field values
    const metadata = {
      ...recipientData,
      school_name: schoolInfo?.school_name || '',
      school_logo: schoolInfo?.logo_url || '',
      principal_name: schoolInfo?.principal_name || '',
      issue_date: new Date().toISOString().split('T')[0],
      certificate_number: certificateNumber,
      certificate_code: certificateCode,
    };

    // For now, we'll create the certificate record
    // PDF generation and QR code will be added in a separate step
    const { data: certificate, error: certError } = await supabase
      .from('certificates_issued')
      .insert([
        {
          school_id: schoolData.id,
          school_code,
          template_id,
          recipient_type,
          recipient_id,
          certificate_number: certificateNumber,
          certificate_code: certificateCode,
          status: 'DRAFT',
          issued_by: issued_by || null,
          metadata,
          verification_url: `${getPublicBaseUrl()}/verify-certificate/${certificateCode}`,
        },
      ])
      .select()
      .single();

    if (certError) {
      console.error('Error creating certificate:', certError);
      return NextResponse.json(
        { error: 'Failed to create certificate', details: certError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        certificate,
        metadata,
        message: 'Certificate created successfully. PDF generation pending.',
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/certificates/generate:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
