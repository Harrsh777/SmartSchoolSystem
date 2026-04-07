import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/diary/upload
 * Upload file attachment for diary entry
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const schoolCode = formData.get('school_code') as string;

    if (!file || !schoolCode) {
      return NextResponse.json(
        { error: 'File and school code are required' },
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

    // Validate file type (check both MIME and extension for browser compatibility)
    const fileName = file.name || '';
    const extension = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : '';
    const allowedMimeTypes = new Set([
      'application/pdf',
      'application/x-pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]);
    const allowedExtensions = new Set(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']);
    const isAllowedMimeType = !!file.type && allowedMimeTypes.has(file.type.toLowerCase());
    const isAllowedExtension = !!extension && allowedExtensions.has(extension);

    if (!isAllowedMimeType && !isAllowedExtension) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, DOC, DOCX, and images are allowed' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageFileName = `${schoolCode}/diary/${timestamp}_${sanitizedFileName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('diary-attachments')
      .upload(storageFileName, buffer, {
        contentType: file.type || undefined,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('diary-attachments')
      .getPublicUrl(storageFileName);

    // Determine file type category
    let fileTypeCategory = 'OTHER';
    if (file.type === 'application/pdf') {
      fileTypeCategory = 'PDF';
    } else if (file.type.startsWith('image/')) {
      fileTypeCategory = 'IMAGE';
    }

    return NextResponse.json({
      data: {
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: fileTypeCategory,
        file_size: file.size,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}



