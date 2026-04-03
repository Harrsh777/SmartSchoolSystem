import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCached, cacheKeys, DASHBOARD_REDIS_TTL } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const timetables = await getCached(
      cacheKeys.timetableList(schoolCode),
      async () => {
    // Get all classes with timetable slots
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id, class, section, academic_year, class_teacher_id')
      .eq('school_code', schoolCode)
      .order('class', { ascending: true })
      .order('section', { ascending: true });

    if (classesError) {
      throw new Error(classesError.message);
    }

    // For each class, check if it has timetable slots
    const timetables = await Promise.all(
      (classes || []).map(async (cls) => {
        const { count } = await supabase
          .from('timetable_slots')
          .select('*', { count: 'exact', head: true })
          .eq('school_code', schoolCode)
          .eq('class_id', cls.id);

        // Get class teacher name if assigned
        let classTeacher = null;
        if (cls.class_teacher_id) {
          const { data: teacher } = await supabase
            .from('staff')
            .select('id, full_name')
            .eq('id', cls.class_teacher_id)
            .single();
          
          if (teacher) {
            classTeacher = teacher;
          }
        }

        return {
          class_id: cls.id,
          class: cls.class,
          section: cls.section,
          academic_year: cls.academic_year,
          has_timetable: (count || 0) > 0,
          slot_count: count || 0,
          class_teacher: classTeacher,
        };
      })
    );

        return timetables;
      },
      { ttlSeconds: DASHBOARD_REDIS_TTL.timetableList }
    );

    return NextResponse.json({ data: timetables }, { status: 200 });
  } catch (error) {
    console.error('Error fetching timetable list:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

