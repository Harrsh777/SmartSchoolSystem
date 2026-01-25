import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { is_hold } = body;

    if (typeof is_hold !== 'boolean') {
      return NextResponse.json(
        { error: 'is_hold must be a boolean value' },
        { status: 400 }
      );
    }

    // Update the school's hold status
    const { data, error } = await supabase
      .from('accepted_schools')
      .update({
        is_hold: is_hold,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to update school hold status', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...schoolData } = data;

    return NextResponse.json(
      {
        success: true,
        message: is_hold ? 'School has been put on hold' : 'School hold has been removed',
        data: schoolData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating school hold status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
