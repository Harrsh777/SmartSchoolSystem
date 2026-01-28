import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

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

    const supabase = getServiceRoleClient();

    // Fetch all timetable slots with class, subject, and teacher information
    const { data: slots, error: slotsError } = await supabase
      .from('timetable_slots')
      .select(`
        *,
        class:classes!timetable_slots_class_id_fkey(
          class,
          section,
          academic_year
        ),
        subject:subjects!timetable_slots_subject_id_fkey(
          name,
          color
        ),
        teachers:staff!timetable_slots_teacher_id_fkey(
          full_name,
          staff_id
        )
      `)
      .eq('school_code', schoolCode)
      .not('class_id', 'is', null)
      .order('day', { ascending: true })
      .order('period_order', { ascending: true });

    if (slotsError) {
      return NextResponse.json(
        { error: 'Failed to fetch timetable data', details: slotsError.message },
        { status: 500 }
      );
    }

    // Fetch period groups
    const { data: periodGroups, error: periodGroupsError } = await supabase
      .from('timetable_period_groups')
      .select('*')
      .eq('school_code', schoolCode);

    if (periodGroupsError) {
      console.error('Error fetching period groups:', periodGroupsError);
    }

    // Convert to CSV
    if (!slots || slots.length === 0) {
      return new NextResponse('No timetable data available', {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="timetable_report_${schoolCode}.csv"`,
        },
      });
    }

    const escapeCsvValue = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      const stringVal = String(val);
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      return stringVal;
    };

    // Create CSV with relevant columns
    const csvHeader = [
      'Day',
      'Period Order',
      'Period',
      'Class',
      'Section',
      'Academic Year',
      'Subject',
      'Teacher Name',
      'Teacher ID',
      'Period Group',
      'Start Time',
      'End Time',
      'Created At',
    ].join(',') + '\n';

    const periodGroupMap = new Map(
      (periodGroups || []).map((pg: { id: string; group_name?: string }) => [pg.id, pg.group_name || ''])
    );

    const csvRows = slots.map((slot: {
      day?: string;
      period_order?: number;
      period?: string;
      class?: { class?: string; section?: string; academic_year?: string };
      subject?: { name?: string };
      teachers?: { full_name?: string; staff_id?: string };
      teacher_ids?: string[];
      period_group_id?: string;
      created_at?: string;
      [key: string]: unknown;
    }) => {
      const classInfo = slot.class as { class?: string; section?: string; academic_year?: string } | undefined;
      const subject = slot.subject as { name?: string } | undefined;
      const teacher = slot.teachers as { full_name?: string; staff_id?: string } | undefined;
      const periodGroupName = slot.period_group_id ? periodGroupMap.get(slot.period_group_id) || '' : '';

      // Handle multiple teachers if teacher_ids array exists
      const teacherNames = teacher?.full_name || '';
      const teacherIds = teacher?.staff_id || '';

      return [
        slot.day || '',
        slot.period_order || '',
        slot.period || '',
        classInfo?.class || '',
        classInfo?.section || '',
        classInfo?.academic_year || '',
        subject?.name || '',
        teacherNames,
        teacherIds,
        periodGroupName,
        '',
        '',
        slot.created_at || '',
      ].map(escapeCsvValue).join(',');
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="timetable_report_${schoolCode}_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error generating timetable report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
