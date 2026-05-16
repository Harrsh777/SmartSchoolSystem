/**
 * Supabase Storage bucket for diary teacher attachments and student submission files.
 * Set DIARY_STORAGE_BUCKET in .env if your project uses a different bucket name.
 */
export function getDiaryStorageBucket(): string {
  return (
    process.env.DIARY_STORAGE_BUCKET?.trim() ||
    process.env.DIARY_ATTACHMENTS_BUCKET?.trim() ||
    'digital-diary'
  );
}

/** Extract object path inside the diary bucket from a stored URL or raw path. */
export function parseDiaryStoragePathFromUrl(
  fileUrl: string,
  bucket: string = getDiaryStorageBucket()
): string | null {
  const trimmed = fileUrl.trim();
  if (!trimmed) return null;

  if (!trimmed.includes('://')) {
    const path = trimmed.replace(/^\/+/, '');
    return path.includes('/diary/') ? path : null;
  }

  try {
    const url = new URL(trimmed);
    const markers = [
      `/object/public/${bucket}/`,
      `/object/sign/${bucket}/`,
      `/object/authenticated/${bucket}/`,
    ];
    for (const marker of markers) {
      const idx = url.pathname.indexOf(marker);
      if (idx >= 0) {
        const path = decodeURIComponent(url.pathname.slice(idx + marker.length));
        return path || null;
      }
    }
    const parts = url.pathname.split('/').filter(Boolean);
    const bucketIdx = parts.indexOf(bucket);
    if (bucketIdx >= 0 && bucketIdx < parts.length - 1) {
      return decodeURIComponent(parts.slice(bucketIdx + 1).join('/'));
    }
  } catch {
    return null;
  }
  return null;
}

export function isDiarySchemaMissingError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = err.code || '';
  return (
    code === '42P01' ||
    code === '42703' ||
    code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('could not find the table') ||
    (msg.includes('column') && msg.includes('does not exist'))
  );
}

export function diarySchemaMissingResponse(details?: string) {
  return {
    error: 'Submissions are not available yet (database migration required)',
    details: details || undefined,
    hint:
      'Run supabase/migrations/20260515120000_digital_diary_submissions.sql and 20260515150000_digital_diary_submissions_columns_patch.sql on this Supabase project, then reload the API schema (Dashboard → Project Settings → API → Reload schema, or run NOTIFY pgrst, \'reload schema\';).',
  };
}
