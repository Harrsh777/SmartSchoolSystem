import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/fees/misc
 * Get all misc fees for a school
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

    const { data: miscFees, error } = await supabase
      .from('misc_fees')
      .select('*')
      .eq('school_code', schoolCode)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch misc fees', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: miscFees || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching misc fees:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fees/misc
 * Create a new misc fee
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, fee_name, amount, description } = body;

    if (!school_code || !fee_name) {
      return NextResponse.json(
        { error: 'School code and fee name are required' },
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

    const { data: miscFee, error } = await supabase
      .from('misc_fees')
      .insert([{
        school_id: schoolData.id,
        school_code,
        fee_name,
        amount: amount ? parseFloat(amount) : null,
        description: description || null,
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create misc fee', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: miscFee }, { status: 201 });
  } catch (error) {
    console.error('Error creating misc fee:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

