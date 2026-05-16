import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSessionFromRequest } from '@/lib/session-store';
import { getTeacherDiaryClassOptions } from '@/lib/digital-diary-access';

/**
 * GET /api/diary/teacher-classes?school_code=&academic_year=
 * Classes available in the Create Diary modal (scoped by RBAC / teaching role).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== 'teacher' || !session.user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schoolCode = request.nextUrl.searchParams.get('school_code');
    const academicYear = request.nextUrl.searchParams.get('academic_year');

    if (!schoolCode) {
      return NextResponse.json({ error: 'school_code is required' }, { status: 400 });
    }

    const payload = session.user_payload as { school_code?: string } | null | undefined;
    const sessionSchool = String(session.school_code || payload?.school_code || '')
      .trim()
      .toUpperCase();
    if (!sessionSchool || sessionSchool !== schoolCode.trim().toUpperCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await getTeacherDiaryClassOptions(
      supabase,
      session.user_id,
      schoolCode,
      academicYear
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('diary/teacher-classes:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
