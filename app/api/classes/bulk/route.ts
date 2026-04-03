import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getRequiredCurrentAcademicYear } from '@/lib/current-academic-year';

const INSERT_CHUNK = 200;

interface ClassInput {
  class?: string;
  section?: string;
}

interface SkipRecord {
  class: string;
  section: string;
  reason: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, classes } = body;

    if (!school_code || !Array.isArray(classes) || classes.length === 0) {
      return NextResponse.json(
        { error: 'School code and classes array are required' },
        { status: 400 }
      );
    }

    const currentYear = await getRequiredCurrentAcademicYear(String(school_code));
    const academic_year = currentYear.year_name;

    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const skipped: SkipRecord[] = [];
    const normalized: { class: string; section: string }[] = [];

    for (const c of classes as ClassInput[]) {
      const cls = String(c.class ?? '')
        .trim()
        .toUpperCase();
      const secRaw = String(c.section ?? '').trim().toUpperCase();

      if (!cls) {
        skipped.push({
          class: '(empty)',
          section: secRaw || '—',
          reason: 'Missing class name',
        });
        continue;
      }

      if (!/^[A-Z]$/.test(secRaw)) {
        skipped.push({
          class: cls,
          section: secRaw || '—',
          reason: 'Invalid section (single letter A–Z only)',
        });
        continue;
      }

      normalized.push({ class: cls, section: secRaw });
    }

    const seen = new Set<string>();
    const deduped: { class: string; section: string }[] = [];
    for (const p of normalized) {
      const k = `${p.class}|${p.section}`;
      if (seen.has(k)) continue;
      seen.add(k);
      deduped.push(p);
    }

    if (deduped.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid class–section pairs to create',
          created: 0,
          skipped,
        },
        { status: 400 }
      );
    }

    const { data: existingClasses, error: existingError } = await supabase
      .from('classes')
      .select('class, section')
      .eq('school_code', school_code)
      .eq('academic_year', academic_year);

    if (existingError) {
      return NextResponse.json(
        {
          error: 'Failed to check existing classes',
          details: existingError.message,
        },
        { status: 500 }
      );
    }

    interface ExistingRow {
      class: string;
      section: string;
    }
    const existingSet = new Set(
      (existingClasses || []).map(
        (c: ExistingRow) => `${String(c.class).trim().toUpperCase()}|${String(c.section).trim().toUpperCase()}`
      )
    );

    const classesToInsert: { class: string; section: string }[] = [];
    for (const p of deduped) {
      const k = `${p.class}|${p.section}`;
      if (existingSet.has(k)) {
        skipped.push({
          class: p.class,
          section: p.section,
          reason: `${p.class}-${p.section} already exists`,
        });
        continue;
      }
      classesToInsert.push(p);
    }

    const recordsToInsert = classesToInsert.map((c) => ({
      school_id: schoolData.id,
      school_code: school_code,
      class: c.class,
      section: c.section,
      academic_year: academic_year,
    }));

    const insertedAll: unknown[] = [];

    for (let i = 0; i < recordsToInsert.length; i += INSERT_CHUNK) {
      const chunk = recordsToInsert.slice(i, i + INSERT_CHUNK);
      const { data: insertedChunk, error: insertError } = await supabase
        .from('classes')
        .insert(chunk)
        .select();

      if (insertError) {
        return NextResponse.json(
          {
            error: 'Failed to create classes',
            details: insertError.message,
            created: insertedAll.length,
            skipped,
            partial: true,
          },
          { status: 500 }
        );
      }
      if (insertedChunk?.length) insertedAll.push(...insertedChunk);
    }

    const created = insertedAll.length;
    const message =
      created > 0
        ? `Successfully created ${created} class${created !== 1 ? 'es' : ''}`
        : skipped.length > 0
          ? 'No new classes created (all skipped)'
          : 'No classes created';

    return NextResponse.json(
      {
        ok: true,
        data: insertedAll,
        message,
        created,
        skipped: skipped.length > 0 ? skipped : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'ACADEMIC_YEAR_NOT_CONFIGURED') {
      return NextResponse.json(
        { error: 'Setup academic year first from Academic Year Management module.' },
        { status: 400 }
      );
    }
    console.error('Error bulk creating classes:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
