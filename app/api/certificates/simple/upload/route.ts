import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * POST /api/certificates/simple/upload
 * Upload a certificate image for a student
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const schoolCode = formData.get('school_code') as string;
    const studentId = formData.get('student_id') as string;
    const certificateTitle = formData.get('certificate_title') as string | null;

    if (!file || !schoolCode || !studentId) {
      return NextResponse.json(
        { error: 'File, school code, and student ID are required' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Get school ID
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', schoolCode)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Verify student exists
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, student_name, school_code')
      .eq('id', studentId)
      .eq('school_code', schoolCode)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${schoolCode}/certificates/${studentId}/${timestamp}_${sanitizedFileName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading certificate image:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('certificates')
      .getPublicUrl(fileName);

    // Get staff ID for submitted_by (if available from session)
    const submittedBy: string | null = null;
    try {
      // Try to get from request headers or session
      // For now, we'll leave it null or you can implement session handling
    } catch {
      // Ignore
    }

    // Create certificate record in simple_certificates table
    const { data: certificate, error: certError } = await supabase
      .from('simple_certificates')
      .insert([
        {
          school_id: schoolData.id,
          school_code: schoolCode,
          student_id: studentId,
          certificate_image_url: urlData.publicUrl,
          certificate_title: certificateTitle || null,
          submitted_by: submittedBy,
        },
      ])
      .select()
      .single();

    if (certError) {
      console.error('Error creating certificate record:', certError);
      // Try to delete uploaded file
      await supabase.storage.from('certificates').remove([fileName]);
      return NextResponse.json(
        { error: 'Failed to create certificate record', details: certError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        certificate,
        message: 'Certificate uploaded successfully',
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/certificates/simple/upload:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
