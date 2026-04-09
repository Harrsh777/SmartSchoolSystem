import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/** Supabase Storage bucket for notice attachments (and other school media). */
const BUCKET = 'school-media';

const MAX_BYTES = 10 * 1024 * 1024;

const EXT_TO_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
};

const ALLOWED_MIME = new Set(Object.values(EXT_TO_MIME));

function resolveContentType(file: File): string | null {
  const t = file.type?.trim();
  if (t && ALLOWED_MIME.has(t)) return t;

  const lower = file.name.toLowerCase();
  const dot = lower.lastIndexOf('.');
  const ext = dot >= 0 ? lower.slice(dot) : '';
  const fromExt = ext ? EXT_TO_MIME[ext] : undefined;
  if (fromExt) {
    if (!t || t === 'application/octet-stream') return fromExt;
    if (ALLOWED_MIME.has(t)) return t;
    return fromExt;
  }
  return null;
}

/**
 * POST multipart: school_code, file — uploads to the `school-media` Supabase Storage bucket
 * under `{school_code}/notices/…` for notice attachments.
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

    const contentType = resolveContentType(file);
    if (!contentType) {
      return NextResponse.json(
        {
          error:
            'Only PDF and images (JPEG, PNG, WebP, GIF, HEIC/HEIF) are allowed. If the file is correct, try renaming it with a proper extension.',
        },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${schoolCode}/notices/${Date.now()}_${sanitized}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error('notice attachment upload:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

    return NextResponse.json(
      { url: urlData.publicUrl, path: filePath, bucket: BUCKET },
      { status: 200 }
    );
  } catch (e) {
    console.error('notice attachment POST:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
