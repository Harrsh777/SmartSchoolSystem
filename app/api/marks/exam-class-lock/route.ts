import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { getSchoolAdminSessionForSchool } from '@/lib/bulk-marks-school-admin';
import { isExamClassMarksLocked } from '@/lib/exam-marks-lock';

/**
 * GET — lock status (any authenticated dashboard client with cookies; data is not secret)
 * POST — lock or unlock (school admin session only for this school)
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const school_code = String(sp.get('school_code') || '').trim();
    const exam_id = String(sp.get('exam_id') || '').trim();
    const class_id = String(sp.get('class_id') || '').trim();

    if (!school_code || !exam_id || !class_id) {
      return NextResponse.json(
        { error: 'school_code, exam_id, and class_id are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    const locked = await isExamClassMarksLocked(supabase, school_code, exam_id, class_id);
    return NextResponse.json({ locked });
  } catch (e) {
    console.error('exam-class-lock GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const school_code = String(body.school_code || '').trim();
    const exam_id = String(body.exam_id || '').trim();
    const class_id = String(body.class_id || '').trim();
    const action = String(body.action || '').toLowerCase();

    if (!school_code || !exam_id || !class_id || (action !== 'lock' && action !== 'unlock')) {
      return NextResponse.json(
        { error: 'school_code, exam_id, class_id, and action (lock|unlock) are required' },
        { status: 400 }
      );
    }

    const session = await getSchoolAdminSessionForSchool(request, school_code);
    if (!session) {
      return NextResponse.json(
        { error: 'Only school admin can lock or unlock marks for this school.' },
        { status: 403 }
      );
    }

    const supabase = getServiceRoleClient();
    const lockedBy = session.user_id || session.school_code || 'school_admin';

    if (action === 'lock') {
      const row = {
        school_code,
        exam_id,
        class_id,
        locked_at: new Date().toISOString(),
        locked_by: lockedBy,
      };
      const { error } = await supabase.from('exam_class_marks_lock').upsert(row, {
        onConflict: 'school_code,exam_id,class_id',
      });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return NextResponse.json(
            { error: 'Marks lock is not available yet. Apply database migration for exam_class_marks_lock.' },
            { status: 503 }
          );
        }
        console.error('exam-class-lock upsert:', error);
        return NextResponse.json({ error: error.message || 'Failed to lock' }, { status: 500 });
      }
      return NextResponse.json({ locked: true });
    }

    const { error: delErr } = await supabase
      .from('exam_class_marks_lock')
      .delete()
      .eq('school_code', school_code)
      .eq('exam_id', exam_id)
      .eq('class_id', class_id);

    if (delErr) {
      console.error('exam-class-lock delete:', delErr);
      return NextResponse.json({ error: delErr.message || 'Failed to unlock' }, { status: 500 });
    }
    return NextResponse.json({ locked: false });
  } catch (e) {
    console.error('exam-class-lock POST:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
