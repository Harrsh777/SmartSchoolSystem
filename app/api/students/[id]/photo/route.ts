import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/students/[id]/photo
 * Returns a redirect to the student's profile photo URL.
 * If the photo is in our Supabase storage, uses a signed URL so it works with private buckets.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const schoolCode = request.nextUrl.searchParams.get('school_code');
    if (!schoolCode || !id) {
      return NextResponse.json({ error: 'school_code and id required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const { data: student, error } = await supabase
      .from('students')
      .select('photo_url')
      .eq('id', id)
      .eq('school_code', schoolCode)
      .single();

    if (error || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const photoUrl = student?.photo_url;
    if (!photoUrl || typeof photoUrl !== 'string' || !photoUrl.trim()) {
      return NextResponse.json({ error: 'No photo' }, { status: 404 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
    const trimmed = photoUrl.trim();
    const signableBuckets = new Set(['student-photos', 'school-media']);

    if (supabaseUrl && trimmed.startsWith(supabaseUrl) && trimmed.includes('/storage/v1/object/public/')) {
      const match = trimmed.match(/\/object\/public\/([^/?#]+)\/(.+)$/);
      const bucket = match?.[1];
      const filePath = match?.[2];
      if (bucket && filePath && signableBuckets.has(bucket)) {
        const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(filePath, 3600);
        if (signed?.signedUrl) {
          return NextResponse.redirect(signed.signedUrl);
        }
      }
    }

    return NextResponse.redirect(trimmed);
  } catch (err) {
    console.error('Student photo route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
