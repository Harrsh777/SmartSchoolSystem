import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * POST /api/certificates/upload-template
 * Upload a background image for a certificate template
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const schoolCode = formData.get('school_code') as string;
    const templateId = formData.get('template_id') as string | null;

    if (!file || !schoolCode) {
      return NextResponse.json(
        { error: 'File and school code are required' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB for template backgrounds)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
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

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = templateId 
      ? `${schoolCode}/templates/${templateId}/background.${fileExt}`
      : `${schoolCode}/templates/${timestamp}_${sanitizedFileName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('certificate-templates')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: templateId !== null, // Replace if template exists
      });

    if (uploadError) {
      console.error('Error uploading template image:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('certificate-templates')
      .getPublicUrl(fileName);

    return NextResponse.json({
      data: {
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_path: fileName,
        file_size: file.size,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/certificates/upload-template:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
