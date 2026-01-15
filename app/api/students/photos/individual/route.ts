import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';

/**
 * POST /api/students/photos/individual
 * Upload individual student photo
 */
export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'manage_students');
    if (permissionCheck) {
      return permissionCheck;
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const schoolCode = formData.get('school_code') as string;
    const studentId = formData.get('student_id') as string;

    if (!file || !schoolCode || !studentId) {
      return NextResponse.json(
        { error: 'File, school_code, and student_id are required' },
        { status: 400 }
      );
    }

    // Validate file
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, GIF are allowed' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    const serviceClient = getServiceRoleClient();

    // Verify student exists
    const { data: studentData, error: studentError } = await serviceClient
      .from('students')
      .select('id')
      .eq('id', studentId)
      .eq('school_code', schoolCode)
      .single();

    if (studentError || !studentData) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Generate storage path
    const fileExt = file.name.split('.').pop() || 'jpg';
    const storagePath = `student-photos/${studentId}/${Date.now()}.${fileExt}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await serviceClient.storage
      .from('student-photos')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = serviceClient.storage
      .from('student-photos')
      .getPublicUrl(storagePath);

    // Update student.photo_url
    const { error: updateError } = await serviceClient
      .from('students')
      .update({ photo_url: urlData.publicUrl })
      .eq('id', studentId)
      .eq('school_code', schoolCode);

    if (updateError) {
      console.error('Error updating student photo URL:', updateError);
      // Don't fail - file is uploaded, just URL update failed
    }

    return NextResponse.json({
      success: true,
      data: {
        storage_path: storagePath,
        public_url: urlData.publicUrl,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error uploading individual student photo:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
