import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Assign classes to a period group
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, group_id, class_ids } = body;

    if (!school_code || !group_id || !class_ids || !Array.isArray(class_ids)) {
      return NextResponse.json(
        { error: 'School code, group ID, and class IDs array are required' },
        { status: 400 }
      );
    }

    // Get school ID
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Verify group exists
    const { data: group, error: groupError } = await supabase
      .from('timetable_period_groups')
      .select('id')
      .eq('id', group_id)
      .eq('school_code', school_code)
      .single();

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Period group not found' },
        { status: 404 }
      );
    }

    // Remove existing assignments
    await supabase
      .from('timetable_group_classes')
      .delete()
      .eq('group_id', group_id);

    // Insert new assignments
    const assignmentsToInsert = class_ids.map((classId: string) => ({
      group_id: group_id,
      class_id: classId,
      school_id: schoolData.id,
      school_code: school_code,
    }));

    const { data: assignments, error: insertError } = await supabase
      .from('timetable_group_classes')
      .insert(assignmentsToInsert)
      .select();

    if (insertError) {
      console.error('Error assigning classes:', insertError);
      return NextResponse.json(
        { error: 'Failed to assign classes', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: assignments,
      message: 'Classes assigned successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error assigning classes:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Get classes assigned to a period group
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const groupId = searchParams.get('group_id');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('timetable_group_classes')
      .select(`
        *,
        class:class_id (
          id,
          class,
          section,
          academic_year
        )
      `)
      .eq('school_code', schoolCode);

    if (groupId) {
      query = query.eq('group_id', groupId);
    }

    const { data: assignments, error } = await query.order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch class assignments', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: assignments || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching class assignments:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

