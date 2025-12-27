import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Create period group
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      group_name,
      is_active,
      class_start_time,
      number_of_periods,
      timezone,
      selected_days,
      periods,
    } = body;

    if (!school_code || !group_name || !class_start_time || !number_of_periods || !selected_days || !periods) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Create period group
    const { data: group, error: groupError } = await supabase
      .from('timetable_period_groups')
      .insert([{
        school_id: schoolData.id,
        school_code: school_code,
        group_name: group_name,
        is_active: is_active !== false,
        class_start_time: class_start_time,
        number_of_periods: number_of_periods,
        timezone: timezone || 'Asia/Kolkata',
        selected_days: selected_days,
      }])
      .select()
      .single();

    if (groupError || !group) {
      console.error('Error creating period group:', groupError);
      return NextResponse.json(
        { error: 'Failed to create period group', details: groupError?.message },
        { status: 500 }
      );
    }

    // Create periods
    interface PeriodInput {
      period_name?: string;
      start_time?: string;
      end_time?: string;
      [key: string]: unknown;
    }
    const periodsToInsert = periods.map((period: PeriodInput, index: number) => ({
      group_id: group.id,
      school_id: schoolData.id,
      school_code: school_code,
      period_name: period.periodName,
      period_duration_minutes: period.duration,
      period_start_time: period.startTime,
      period_end_time: period.endTime,
      period_order: index + 1,
      is_break: period.isBreak || false,
      break_name: period.breakName || null,
    }));

    const { data: createdPeriods, error: periodsError } = await supabase
      .from('timetable_periods')
      .insert(periodsToInsert)
      .select();

    if (periodsError) {
      console.error('Error creating periods:', periodsError);
      // Rollback: delete the group
      await supabase.from('timetable_period_groups').delete().eq('id', group.id);
      return NextResponse.json(
        { error: 'Failed to create periods', details: periodsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        group_id: group.id,
        group: group,
        periods: createdPeriods,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating period group:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Get all period groups for a school
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

    const { data: groups, error: groupsError } = await supabase
      .from('timetable_period_groups')
      .select('*')
      .eq('school_code', schoolCode)
      .order('created_at', { ascending: false });

    if (groupsError) {
      return NextResponse.json(
        { error: 'Failed to fetch period groups', details: groupsError.message },
        { status: 500 }
      );
    }

    // Fetch periods for each group
    const groupsWithPeriods = await Promise.all(
      (groups || []).map(async (group) => {
        const { data: periods } = await supabase
          .from('timetable_periods')
          .select('*')
          .eq('group_id', group.id)
          .order('period_order', { ascending: true });

        return {
          ...group,
          periods: periods || [],
        };
      })
    );

    return NextResponse.json({
      data: groupsWithPeriods,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching period groups:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

