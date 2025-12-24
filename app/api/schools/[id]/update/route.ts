import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Remove fields that shouldn't be updated (school_code, password, timestamps, etc.)
    const { id: _, password, school_code, approved_at, approved_by, created_at, ...updateData } = body;

    // Update the school information
    const { data, error } = await supabase
      .from('accepted_schools')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to update school information', details: error.message },
        { status: 500 }
      );
    }

    // Remove password from response
    const { password: __, ...schoolData } = data;

    return NextResponse.json(
      {
        success: true,
        message: 'School information updated successfully',
        school: schoolData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating school:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

