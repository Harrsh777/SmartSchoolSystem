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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isOurStorage =
      supabaseUrl &&
      photoUrl.startsWith(supabaseUrl) &&
      photoUrl.includes('/storage/v1/object/') &&
      photoUrl.includes('student-photos');

    if (isOurStorage) {
      const match = photoUrl.match(/\/object\/public\/student-photos\/(.+)$/);
      const filePath = match ? match[1] : null;
      if (filePath) {
        const { data: signed } = await supabase.storage
          .from('student-photos')
          .createSignedUrl(filePath, 3600);
        if (signed?.signedUrl) {
          return NextResponse.redirect(signed.signedUrl);
        }
      }
    }

    return NextResponse.redirect(photoUrl.trim());
  } catch (err) {
    console.error('Student photo route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
