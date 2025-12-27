import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Create or update fee fine configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      fine_type,
      fine_amount,
      fine_percentage,
      daily_fine_amount,
      grace_period_days,
    } = body;

    if (!school_code || !fine_type) {
      return NextResponse.json(
        { error: 'School code and fine type are required' },
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

    // Check if fine config already exists
    const { data: existing } = await supabase
      .from('fee_fines')
      .select('id')
      .eq('school_code', school_code)
      .eq('is_active', true)
      .single();

    let fine;
    if (existing) {
      // Update existing
      const { data: updated, error: updateError } = await supabase
        .from('fee_fines')
        .update({
          fine_type,
          fine_amount,
          fine_percentage,
          daily_fine_amount,
          grace_period_days: grace_period_days || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update fee fine', details: updateError.message },
          { status: 500 }
        );
      }
      fine = updated;
    } else {
      // Create new
      const { data: created, error: createError } = await supabase
        .from('fee_fines')
        .insert([{
          school_id: schoolData.id,
          school_code: school_code,
          fine_type,
          fine_amount,
          fine_percentage,
          daily_fine_amount,
          grace_period_days: grace_period_days || 0,
        }])
        .select()
        .single();

      if (createError) {
        return NextResponse.json(
          { error: 'Failed to create fee fine', details: createError.message },
          { status: 500 }
        );
      }
      fine = created;
    }

    return NextResponse.json({ data: fine }, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error('Error saving fee fine:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Get fee fine configuration
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

    const { data: fines, error: finesError } = await supabase
      .from('fee_fines')
      .select('*')
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (finesError) {
      return NextResponse.json(
        { error: 'Failed to fetch fee fines', details: finesError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: fines || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching fee fines:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

