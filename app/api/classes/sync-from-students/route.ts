import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Sync classes from existing students: scan all students for the school,
 * create any missing class-section-academic_year entries in the classes table.
 * Use this to backfill classes after bulk import or to fix missing classes.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const schoolCode = body.school_code ?? request.nextUrl.searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', schoolCode)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('class, section, academic_year')
      .eq('school_code', schoolCode);

    if (studentsError) {
      return NextResponse.json(
        { error: 'Failed to fetch students', details: studentsError.message },
        { status: 500 }
      );
    }

    const classMap = new Map<string, { class: string; section: string; academic_year: string }>();
    for (const s of students ?? []) {
      const cls = s.class != null ? String(s.class).trim() : '';
      const sec = s.section != null ? String(s.section).trim() : '';
      const year = s.academic_year != null ? String(s.academic_year).trim() : '';
      if (!cls || !sec) continue;
      const key = `${cls.toUpperCase()}-${sec.toUpperCase()}-${year}`;
      if (!classMap.has(key)) {
        classMap.set(key, { class: cls, section: sec, academic_year: year || new Date().getFullYear().toString() });
      }
    }

    const { data: existingClasses } = await supabase
      .from('classes')
      .select('class, section, academic_year')
      .eq('school_code', schoolCode);

    const existingKeys = new Set(
      existingClasses?.map(c => `${String(c.class).toUpperCase()}-${String(c.section).toUpperCase()}-${c.academic_year}`) || []
    );

    let created = 0;
    for (const cls of classMap.values()) {
      const key = `${String(cls.class).toUpperCase()}-${String(cls.section).toUpperCase()}-${cls.academic_year}`;
      if (existingKeys.has(key)) continue;
      const { error: insertError } = await supabase
        .from('classes')
        .insert([{
          school_id: schoolData.id,
          school_code: schoolCode,
          class: String(cls.class).toUpperCase(),
          section: String(cls.section).toUpperCase(),
          academic_year: String(cls.academic_year),
        }]);
      if (!insertError) {
        existingKeys.add(key);
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      created,
      message: created === 0
        ? 'All classes already exist. No new classes created.'
        : `Created ${created} class(es) from existing students.`,
    }, { status: 200 });
  } catch (error) {
    console.error('Error syncing classes from students:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
