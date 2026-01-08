import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/fees/fines
 * Get all fee fines for a school
 */
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

    const { data: fines, error } = await supabase
      .from('fee_fines')
      .select('*')
      .eq('school_code', schoolCode)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch fee fines', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: fines || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching fee fines:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fees/fines
 * Create a new fee fine
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, fine_name, fine_type, fine_amount, fine_percentage, daily_fine_amount, is_active } = body;

    if (!school_code || !fine_name || !fine_type) {
      return NextResponse.json(
        { error: 'School code, fine name, and fine type are required' },
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

    const { data: fine, error } = await supabase
      .from('fee_fines')
      .insert([{
        school_id: schoolData.id,
        school_code,
        fine_name,
        fine_type,
        fine_amount: fine_amount ? parseFloat(fine_amount) : null,
        fine_percentage: fine_percentage ? parseFloat(fine_percentage) : null,
        daily_fine_amount: daily_fine_amount ? parseFloat(daily_fine_amount) : null,
        is_active: is_active !== undefined ? is_active : true,
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create fee fine', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: fine }, { status: 201 });
  } catch (error) {
    console.error('Error creating fee fine:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

