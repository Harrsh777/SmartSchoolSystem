import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/webp',
]);

/**
 * POST multipart: school_code, file — uploads to school-media bucket for notice attachments.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const schoolCode = String(formData.get('school_code') ?? '').trim();

    if (!file || !schoolCode) {
      return NextResponse.json(
        { error: 'school_code and file are required' },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File must be 10MB or smaller' }, { status: 400 });
    }

    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: 'Only PDF and images (JPEG, PNG, WebP) are allowed' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${schoolCode}/notices/${Date.now()}_${sanitized}`;

    const { error: uploadError } = await supabase.storage
      .from('school-media')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('notice attachment upload:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage.from('school-media').getPublicUrl(filePath);

    return NextResponse.json(
      { url: urlData.publicUrl, path: filePath },
      { status: 200 }
    );
  } catch (e) {
    console.error('notice attachment POST:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
