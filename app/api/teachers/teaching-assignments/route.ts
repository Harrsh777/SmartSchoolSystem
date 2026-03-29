import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchTeachingByClass, teachingMapToRecord } from '@/lib/teacher-timetable-teaching';

/**
 * GET /api/teachers/teaching-assignments?school_code=&staff_id=
 * Classes + subject IDs derived from timetable_slots (current assignments only).
 */
export async function GET(request: NextRequest) {
  try {
    const schoolCode = request.nextUrl.searchParams.get('school_code');
    const staffId = request.nextUrl.searchParams.get('staff_id');
    if (!schoolCode || !staffId) {
      return NextResponse.json(
        { error: 'school_code and staff_id are required' },
        { status: 400 }
      );
    }

    const teaching = await fetchTeachingByClass(supabase, schoolCode, staffId);
    const subject_ids_by_class = teachingMapToRecord(teaching);
    const classIds = Array.from(teaching.keys());

    let assignments: Array<{
      class_id: string;
      class_name: string;
      section: string;
      subject_ids: string[];
    }> = [];

    if (classIds.length > 0) {
      const { data: classRows } = await supabase
        .from('classes')
        .select('id, class, section')
        .eq('school_code', schoolCode)
        .in('id', classIds);
      const byId = new Map((classRows || []).map((c) => [c.id, c]));
      assignments = classIds.map((cid) => {
        const row = byId.get(cid);
        return {
          class_id: cid,
          class_name: row?.class ?? '',
          section: row?.section ?? '',
          subject_ids: Array.from(teaching.get(cid) || []),
        };
      });
    }

    const allSubIds = [...new Set(assignments.flatMap((a) => a.subject_ids))];
    let subjectRows: { id: string; name: string }[] = [];
    if (allSubIds.length > 0) {
      const { data } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('school_code', schoolCode)
        .in('id', allSubIds);
      subjectRows = data || [];
    }

    const subjectNames = new Map(subjectRows.map((s) => [s.id, s.name]));

    return NextResponse.json({
      data: {
        subject_ids_by_class,
        assignments: assignments.map((a) => ({
          ...a,
          subjects: a.subject_ids.map((id) => ({
            id,
            name: subjectNames.get(id) ?? id,
          })),
        })),
      },
    });
  } catch (e) {
    console.error('teaching-assignments:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
