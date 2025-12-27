import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get specific stop
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

    const { data: stop, error: stopError } = await supabase
      .from('transport_stops')
      .select('*')
      .eq('id', id)
      .eq('school_code', schoolCode)
      .single();

    if (stopError || !stop) {
      return NextResponse.json(
        { error: 'Stop not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: stop }, { status: 200 });
  } catch (error) {
    console.error('Error fetching stop:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update stop
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

    // Convert fares to float if present
    if (updateData.pickup_fare !== undefined) {
      updateData.pickup_fare = parseFloat(updateData.pickup_fare);
    }
    if (updateData.drop_fare !== undefined) {
      updateData.drop_fare = parseFloat(updateData.drop_fare);
    }

    const { data: stop, error: stopError } = await supabase
      .from('transport_stops')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('school_code', school_code)
      .select()
      .single();

    if (stopError || !stop) {
      return NextResponse.json(
        { error: 'Failed to update stop', details: stopError?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: stop }, { status: 200 });
  } catch (error) {
    console.error('Error updating stop:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete stop (soft delete)
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
      .from('transport_stops')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('school_code', schoolCode);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete stop', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Stop deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting stop:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

