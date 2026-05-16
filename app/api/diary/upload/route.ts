import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/session-store';
import { getDiaryStorageBucket } from '@/lib/digital-diary-storage';

/**
 * POST /api/diary/upload
 * Upload file attachment for diary entry
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== 'teacher' || !session.user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const schoolCode = formData.get('school_code') as string;

    if (!file || !schoolCode) {
      return NextResponse.json(
        { error: 'File and school code are required' },
        { status: 400 }
      );
    }

    const payload = session.user_payload as { school_code?: string } | null | undefined;
    const ses = String(session.school_code || payload?.school_code || '').trim().toUpperCase();
    if (!ses || ses !== schoolCode.trim().toUpperCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate file size (max 25MB)
    const maxSize = 25 * 1024 * 1024;
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
      'application/zip',
      'application/x-zip-compressed',
      'multipart/x-zip',
    ]);
    const allowedExtensions = new Set(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'zip', 'webp', 'gif']);
    const isAllowedMimeType = !!file.type && allowedMimeTypes.has(file.type.toLowerCase());
    const isAllowedExtension = !!extension && allowedExtensions.has(extension);

    if (!isAllowedMimeType && !isAllowedExtension) {
      return NextResponse.json(
        { error: 'Invalid file type (allowed: pdf, doc, docx, images, zip).' },
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

    const bucket = getDiaryStorageBucket();

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
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
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storageFileName);

    // Determine file type category
    let fileTypeCategory = 'OTHER';
    if (extension === 'zip' || file.type.includes('zip')) {
      fileTypeCategory = 'ZIP';
    } else if (file.type === 'application/pdf') {
      fileTypeCategory = 'PDF';
    } else if (file.type.startsWith('image/')) {
      fileTypeCategory = 'IMAGE';
    } else if (extension === 'doc' || extension === 'docx') {
      fileTypeCategory = 'DOC';
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



