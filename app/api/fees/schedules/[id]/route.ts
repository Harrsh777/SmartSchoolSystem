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

    // Validate installments if provided
    if (updateData.installments && Array.isArray(updateData.installments)) {
      if (updateData.number_of_installments && updateData.installments.length !== updateData.number_of_installments) {
        return NextResponse.json(
          { error: `Installments array must have exactly ${updateData.number_of_installments} items` },
          { status: 400 }
        );
      }
    }

    // Remove undefined values
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([, value]) => value !== undefined)
    );

    const { data: updatedSchedule, error: updateError } = await supabase
      .from('fee_schedules')
      .update({
        ...cleanUpdateData,
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
    let schoolCode = searchParams.get('school_code');
    
    // Try to get from body if not in query params
    if (!schoolCode) {
      try {
        const body = await request.json().catch(() => ({}));
        schoolCode = body.school_code || searchParams.get('school_code');
      } catch {
        // Body parsing failed, use query param
      }
    }

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Check if schedule exists and is not in use
    const { data: schedule } = await supabase
      .from('fee_schedules')
      .select('id')
      .eq('id', id)
      .eq('school_code', schoolCode)
      .maybeSingle();

    if (!schedule) {
      return NextResponse.json(
        { error: 'Fee schedule not found' },
        { status: 404 }
      );
    }

    // Check if schedule is used in assignments
    const { data: assignments } = await supabase
      .from('fee_assignments')
      .select('id')
      .eq('fee_schedule_id', id)
      .limit(1);

    if (assignments && assignments.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete fee schedule that is assigned to classes. Remove assignments first.' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('fee_schedules')
      .delete()
      .eq('id', id)
      .eq('school_code', schoolCode);

    if (deleteError) {
      console.error('Error deleting fee schedule:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete fee schedule', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Fee schedule deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting fee schedule:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

