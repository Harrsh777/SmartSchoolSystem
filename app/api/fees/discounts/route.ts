import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/fees/discounts
 * Get all fee discounts for a school
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

    const { data: discounts, error } = await supabase
      .from('fee_discounts')
      .select('*')
      .eq('school_code', schoolCode)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch fee discounts', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: discounts || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching fee discounts:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fees/discounts
 * Create a new fee discount
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, discount_name, remarks } = body;

    if (!school_code || !discount_name) {
      return NextResponse.json(
        { error: 'School code and discount name are required' },
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

    const { data: discount, error } = await supabase
      .from('fee_discounts')
      .insert([{
        school_id: schoolData.id,
        school_code,
        discount_name,
        remarks: remarks || null,
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create fee discount', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: discount }, { status: 201 });
  } catch (error) {
    console.error('Error creating fee discount:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

