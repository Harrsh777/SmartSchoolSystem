import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';

function isMissingStudentsIsRteColumn(error: unknown): boolean {
  const msg = (error as { message?: string } | null)?.message || '';
  const code = (error as { code?: string } | null)?.code || '';
  return (
    code === '42703' ||
    /column.*is_rte.*does not exist|Could not find the 'is_rte' column/i.test(String(msg))
  );
}

export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'manage_fees');
    if (permissionCheck) return permissionCheck;

    const body = await request.json();
    const schoolCode = String(body.school_code || '').trim().toUpperCase();
    const className = String(body.class_name || '').trim();
    const section = String(body.section || '').trim();
    const rteStudentIds = Array.isArray(body.rte_student_ids)
      ? body.rte_student_ids.map((v: unknown) => String(v)).filter(Boolean)
      : [];

    if (!schoolCode || !className || !section) {
      return NextResponse.json(
        { error: 'school_code, class_name and section are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    const { data: students, error: studentErr } = await supabase
      .from('students')
      .select('id')
      .ilike('school_code', schoolCode)
      .ilike('class', className)
      .ilike('section', section);

    if (studentErr) return NextResponse.json({ error: studentErr.message }, { status: 500 });

    const validIds = new Set((students || []).map((s) => String(s.id)));
    const selectedIds = rteStudentIds.filter((id: string) => validIds.has(id));
    const allIds = Array.from(validIds);

    if (allIds.length === 0) {
      return NextResponse.json({ data: { updated_count: 0, rte_count: 0 } });
    }

    const { error: clearErr } = await supabase
      .from('students')
      .update({ is_rte: false })
      .in('id', allIds);
    if (clearErr) {
      if (isMissingStudentsIsRteColumn(clearErr)) {
        return NextResponse.json(
          { error: "students.is_rte column is missing. Run: ALTER TABLE students ADD COLUMN is_rte BOOLEAN DEFAULT FALSE;" },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: clearErr.message }, { status: 500 });
    }

    if (selectedIds.length > 0) {
      const { error: markErr } = await supabase
        .from('students')
        .update({ is_rte: true })
        .in('id', selectedIds);
      if (markErr) {
        if (isMissingStudentsIsRteColumn(markErr)) {
          return NextResponse.json(
            { error: "students.is_rte column is missing. Run: ALTER TABLE students ADD COLUMN is_rte BOOLEAN DEFAULT FALSE;" },
            { status: 400 }
          );
        }
        return NextResponse.json({ error: markErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      data: {
        updated_count: allIds.length,
        rte_count: selectedIds.length,
      },
    });
  } catch (e) {
    console.error('POST class-section/rte', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
