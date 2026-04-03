import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePermission } from '@/lib/permission-middleware';

function escapeIlike(value: string): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

/**
 * Lightweight roster for Class Overview expand row (no Redis cache).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const permission = await requirePermission(
      request,
      'student_directory',
      'view',
      'view'
    );
    if (!permission || !permission.allowed) {
      const staffId =
        request.headers.get('x-staff-id') ||
        request.nextUrl.searchParams.get('staff_id');
      if (staffId) {
        return NextResponse.json(
          { error: 'Access denied. You do not have permission to view students.' },
          { status: 403 }
        );
      }
    }

    const { id: classId } = await params;
    const schoolCode = request.nextUrl.searchParams.get('school_code');
    const statusParam = request.nextUrl.searchParams.get('status') || 'active';

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const { data: cls, error: classError } = await supabase
      .from('classes')
      .select('id, class, section, academic_year')
      .eq('id', classId)
      .eq('school_code', schoolCode)
      .single();

    if (classError || !cls) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const classVal = String(cls.class ?? '').trim();
    const sectionVal = String(cls.section ?? '').trim();
    const classYear = String(cls.academic_year ?? '').trim();

    let query = supabase
      .from('students')
      .select('id, student_name, admission_no, roll_number, status, academic_year')
      .eq('school_code', schoolCode)
      .ilike('class', escapeIlike(classVal))
      .ilike('section', escapeIlike(sectionVal))
      .order('roll_number', { ascending: true, nullsFirst: false })
      .limit(500);

    if (classYear) {
      query = query.eq('academic_year', classYear);
    }

    if (statusParam === 'all') {
      // no status filter
    } else if (statusParam) {
      query = query.eq('status', statusParam);
    } else {
      query = query.eq('status', 'active');
    }

    const { data: rows, error: qErr } = await query;

    if (qErr) {
      return NextResponse.json(
        { error: 'Failed to load students', details: qErr.message },
        { status: 500 }
      );
    }

    const list = rows || [];

    return NextResponse.json({ data: list }, { status: 200 });
  } catch (e) {
    console.error('class students roster:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
