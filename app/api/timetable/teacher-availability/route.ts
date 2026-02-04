import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/timetable/teacher-availability
 * Returns teachers who are already assigned to another class at the given slot.
 * Used by Class Timetable to show "This teacher is not available at this slot".
 * Query: school_code, day, period_order, exclude_class_id (current class being edited)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const day = searchParams.get('day');
    const periodOrderParam = searchParams.get('period_order');
    const excludeClassId = searchParams.get('exclude_class_id');

    if (!schoolCode || !day) {
      return NextResponse.json(
        { error: 'school_code and day are required' },
        { status: 400 }
      );
    }

    const periodOrder = periodOrderParam !== null && periodOrderParam !== undefined && periodOrderParam !== ''
      ? parseInt(periodOrderParam, 10)
      : null;
    if (periodOrder === null || isNaN(periodOrder)) {
      return NextResponse.json(
        { error: 'period_order is required and must be a number' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('timetable_slots')
      .select(`
        id,
        class_id,
        teacher_id,
        teacher_ids
      `)
      .eq('school_code', schoolCode)
      .eq('day', day)
      .eq('period_order', periodOrder)
      .not('class_id', 'is', null);

    if (excludeClassId) {
      query = query.neq('class_id', excludeClassId);
    }

    const { data: slots, error } = await query;

    if (error) {
      console.error('Error fetching teacher availability:', error);
      return NextResponse.json(
        { error: 'Failed to fetch availability', details: error.message },
        { status: 500 }
      );
    }

    const busyMap = new Map<string, string>(); // teacher_id -> class_name
    const classIds = [...new Set((slots || []).map((s: { class_id: string }) => s.class_id).filter(Boolean))];

    if (classIds.length > 0) {
      const { data: classes } = await supabase
        .from('classes')
        .select('id, class, section')
        .in('id', classIds);

      const classNames = new Map<string, string>();
      (classes || []).forEach((c: { id: string; class: string; section: string }) => {
        classNames.set(c.id, `${c.class || ''}-${c.section || ''}`.trim() || 'Unknown');
      });

      (slots || []).forEach((slot: { class_id: string; teacher_id?: string | null; teacher_ids?: string[] | null }) => {
        const className = classNames.get(slot.class_id) || 'Unknown';
        if (slot.teacher_id) {
          busyMap.set(slot.teacher_id, className);
        }
        if (slot.teacher_ids && Array.isArray(slot.teacher_ids)) {
          slot.teacher_ids.forEach((tid: string) => busyMap.set(tid, className));
        }
      });
    }

    const teacherIds = [...busyMap.keys()];
    if (teacherIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const { data: staff } = await supabase
      .from('staff')
      .select('id, full_name')
      .eq('school_code', schoolCode)
      .in('id', teacherIds);

    const data = teacherIds.map((teacher_id) => ({
      teacher_id,
      teacher_name: (staff || []).find((s: { id: string }) => s.id === teacher_id)?.full_name || 'Unknown',
      class_name: busyMap.get(teacher_id) || 'Unknown',
    }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Teacher availability error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: (err as Error).message },
      { status: 500 }
    );
  }
}
