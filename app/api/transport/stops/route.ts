import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get all stops
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

    const { data: stops, error: stopsError } = await supabase
      .from('transport_stops')
      .select('*')
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (stopsError) {
      return NextResponse.json(
        { error: 'Failed to fetch stops', details: stopsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: stops || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching stops:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create stop
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      name,
      pickup_fare,
      drop_fare,
      expected_pickup_time,
      expected_drop_time,
    } = body;

    if (!school_code || !name || pickup_fare === undefined || drop_fare === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    const { data: stop, error: stopError } = await supabase
      .from('transport_stops')
      .insert([{
        school_id: schoolData.id,
        school_code: school_code,
        name: name,
        pickup_fare: parseFloat(pickup_fare),
        drop_fare: parseFloat(drop_fare),
        expected_pickup_time: expected_pickup_time || null,
        expected_drop_time: expected_drop_time || null,
      }])
      .select()
      .single();

    if (stopError || !stop) {
      return NextResponse.json(
        { error: 'Failed to create stop', details: stopError?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: stop }, { status: 201 });
  } catch (error) {
    console.error('Error creating stop:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

