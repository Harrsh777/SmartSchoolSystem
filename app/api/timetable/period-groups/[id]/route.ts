import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get specific period group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const { data: group, error: groupError } = await supabase
      .from('timetable_period_groups')
      .select('*')
      .eq('id', id)
      .eq('school_code', schoolCode)
      .single();

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Period group not found' },
        { status: 404 }
      );
    }

    const { data: periods } = await supabase
      .from('timetable_periods')
      .select('*')
      .eq('group_id', id)
      .order('period_order', { ascending: true });

    return NextResponse.json({
      data: {
        ...group,
        periods: periods || [],
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching period group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update period group (optionally replace periods)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { school_code, periods: periodsPayload, ...updateData } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const { data: existingGroup, error: fetchError } = await supabase
      .from('timetable_period_groups')
      .select('id, school_id')
      .eq('id', id)
      .eq('school_code', school_code)
      .single();

    if (fetchError || !existingGroup) {
      return NextResponse.json(
        { error: 'Period group not found' },
        { status: 404 }
      );
    }

    const groupUpdate: Record<string, unknown> = {
      ...updateData,
      updated_at: new Date().toISOString(),
    };
    delete (groupUpdate as { periods?: unknown }).periods;

    const { data: updatedGroup, error: updateError } = await supabase
      .from('timetable_period_groups')
      .update(groupUpdate)
      .eq('id', id)
      .eq('school_code', school_code)
      .select()
      .single();

    if (updateError || !updatedGroup) {
      return NextResponse.json(
        { error: 'Failed to update period group', details: updateError?.message },
        { status: 500 }
      );
    }

    if (Array.isArray(periodsPayload) && periodsPayload.length > 0) {
      await supabase.from('timetable_periods').delete().eq('group_id', id);
      interface PeriodInput {
        periodName?: string;
        period_name?: string;
        duration?: number;
        period_duration_minutes?: number;
        startTime?: string;
        period_start_time?: string;
        endTime?: string;
        period_end_time?: string;
        isBreak?: boolean;
        is_break?: boolean;
        breakName?: string;
        break_name?: string;
        [key: string]: unknown;
      }
      const periodsToInsert = periodsPayload.map((period: PeriodInput, index: number) => ({
        group_id: id,
        school_id: existingGroup.school_id,
        school_code: school_code,
        period_name: period.periodName ?? period.period_name,
        period_duration_minutes: period.duration ?? period.period_duration_minutes ?? 45,
        period_start_time: period.startTime ?? period.period_start_time,
        period_end_time: period.endTime ?? period.period_end_time,
        period_order: index + 1,
        is_break: period.isBreak ?? period.is_break ?? false,
        break_name: period.breakName ?? period.break_name ?? null,
      }));
      await supabase.from('timetable_periods').insert(periodsToInsert);
    }

    return NextResponse.json({
      data: updatedGroup,
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating period group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete period group (and its periods and class assignments)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const { data: group, error: groupError } = await supabase
      .from('timetable_period_groups')
      .select('id')
      .eq('id', id)
      .eq('school_code', schoolCode)
      .single();

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Period group not found' },
        { status: 404 }
      );
    }

    await supabase.from('timetable_periods').delete().eq('group_id', id);
    await supabase.from('timetable_group_classes').delete().eq('group_id', id);
    const { error: deleteError } = await supabase
      .from('timetable_period_groups')
      .delete()
      .eq('id', id)
      .eq('school_code', schoolCode);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete period group', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Period group deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting period group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

