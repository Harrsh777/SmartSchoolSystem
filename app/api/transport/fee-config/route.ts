import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get or create transport fee config
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

    // Get school ID
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', schoolCode)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Fetch existing config
    const { data: config, error: configError } = await supabase
      .from('transport_fee_config')
      .select('*')
      .eq('school_code', schoolCode)
      .single();

    if (configError && configError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Failed to fetch config', details: configError.message },
        { status: 500 }
      );
    }

    // Return default if not found
    if (!config) {
      return NextResponse.json({
        data: {
          pickup_percentage: 100,
          drop_percentage: 100,
          applicable_months: [],
        },
      }, { status: 200 });
    }

    return NextResponse.json({ data: config }, { status: 200 });
  } catch (error) {
    console.error('Error fetching transport fee config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create or update transport fee config
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      pickup_percentage,
      drop_percentage,
      applicable_months,
    } = body;

    if (!school_code || pickup_percentage === undefined || drop_percentage === undefined) {
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

    // Upsert config
    const { data: config, error: upsertError } = await supabase
      .from('transport_fee_config')
      .upsert({
        school_id: schoolData.id,
        school_code: school_code,
        pickup_percentage: parseInt(pickup_percentage),
        drop_percentage: parseInt(drop_percentage),
        applicable_months: applicable_months || [],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'school_code',
      })
      .select()
      .single();

    if (upsertError || !config) {
      return NextResponse.json(
        { error: 'Failed to save config', details: upsertError?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: config }, { status: 200 });
  } catch (error) {
    console.error('Error saving transport fee config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

