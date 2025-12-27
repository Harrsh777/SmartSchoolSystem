import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get specific fee schedule
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

    const { data: schedule, error: scheduleError } = await supabase
      .from('fee_schedules')
      .select('*')
      .eq('id', id)
      .eq('school_code', schoolCode)
      .single();

    if (scheduleError || !schedule) {
      return NextResponse.json(
        { error: 'Fee schedule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: schedule }, { status: 200 });
  } catch (error) {
    console.error('Error fetching fee schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update fee schedule
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

    const { data: updatedSchedule, error: updateError } = await supabase
      .from('fee_schedules')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('school_code', school_code)
      .select()
      .single();

    if (updateError || !updatedSchedule) {
      return NextResponse.json(
        { error: 'Failed to update fee schedule', details: updateError?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedSchedule }, { status: 200 });
  } catch (error) {
    console.error('Error updating fee schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete fee schedule
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

    const { error: deleteError } = await supabase
      .from('fee_schedules')
      .delete()
      .eq('id', id)
      .eq('school_code', schoolCode);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete fee schedule', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Fee schedule deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting fee schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

