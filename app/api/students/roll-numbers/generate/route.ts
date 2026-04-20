import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { invalidateCachePattern, cacheKeys } from '@/lib/cache';

type StudentRow = {
  id: string;
  student_name: string | null;
  roll_number: string | null;
};

function normalizeNameForSort(name: string): string {
  return name
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const schoolCode = String(body.school_code || '').trim();
    const className = String(body.class || '').trim();
    const section = String(body.section || '').trim();
    const forceOverwrite = Boolean(body.force_overwrite);

    if (!schoolCode || !className || !section) {
      return NextResponse.json(
        { error: 'school_code, class, and section are required' },
        { status: 400 }
      );
    }

    const { data: students, error: fetchErr } = await supabase
      .from('students')
      .select('id, student_name, roll_number')
      .eq('school_code', schoolCode)
      .ilike('class', className)
      .ilike('section', section)
      .neq('status', 'deleted');

    if (fetchErr) {
      return NextResponse.json(
        { error: 'Failed to load students', details: fetchErr.message },
        { status: 500 }
      );
    }

    const rows = (students || []) as StudentRow[];
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No students found' }, { status: 404 });
    }

    const invalidNameRows = rows.filter((s) => !String(s.student_name || '').trim());
    if (invalidNameRows.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot generate roll numbers. Fix invalid student names first.',
          invalid_students: invalidNameRows.map((s) => s.id),
        },
        { status: 400 }
      );
    }

    const hasExistingRollNumbers = rows.some((s) => String(s.roll_number || '').trim() !== '');
    if (hasExistingRollNumbers && !forceOverwrite) {
      return NextResponse.json(
        {
          error: 'Existing roll numbers found',
          requires_confirmation: true,
          message:
            'Existing roll numbers will be removed and reassigned. Do you want to continue?',
        },
        { status: 409 }
      );
    }

    const sorted = [...rows].sort((a, b) => {
      const an = normalizeNameForSort(String(a.student_name || ''));
      const bn = normalizeNameForSort(String(b.student_name || ''));
      const cmp = an.localeCompare(bn, undefined, { sensitivity: 'base', numeric: true });
      if (cmp !== 0) return cmp;
      return String(a.id).localeCompare(String(b.id), undefined, { numeric: true, sensitivity: 'base' });
    });

    const previousRollById: Record<string, string | null> = {};
    const updates = sorted.map((student, idx) => {
      previousRollById[student.id] = student.roll_number ?? null;
      return { id: student.id, roll_number: String(idx + 1) };
    });

    const updateErrors: string[] = [];
    await Promise.all(
      updates.map(async (u) => {
        const { error } = await supabase
          .from('students')
          .update({ roll_number: u.roll_number })
          .eq('id', u.id)
          .eq('school_code', schoolCode);
        if (error) {
          updateErrors.push(`${u.id}: ${error.message}`);
        }
      })
    );

    if (updateErrors.length > 0) {
      return NextResponse.json(
        { error: 'Failed to update roll numbers', details: updateErrors.slice(0, 5).join('; ') },
        { status: 500 }
      );
    }

    void invalidateCachePattern(cacheKeys.studentsListPattern(schoolCode));
    void invalidateCachePattern(cacheKeys.studentsCountsPattern(schoolCode));

    return NextResponse.json(
      {
        data: updates,
        total_students: sorted.length,
        generated_at: new Date().toISOString(),
        overwritten_existing: hasExistingRollNumbers,
        previous_roll_numbers: previousRollById,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}
