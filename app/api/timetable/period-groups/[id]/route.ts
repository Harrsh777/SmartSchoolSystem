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

// Update period group
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { school_code, ...updateData } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const { data: updatedGroup, error: updateError } = await supabase
      .from('timetable_period_groups')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
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

