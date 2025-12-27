import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Create fee schedule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      schedule_name,
      classes,
      number_of_installments,
      collection_frequency,
      start_date,
      end_date,
      last_collection_date,
    } = body;

    if (!school_code || !schedule_name || !classes || !number_of_installments || !collection_frequency || !start_date || !end_date) {
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

    // Create fee schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('fee_schedules')
      .insert([{
        school_id: schoolData.id,
        school_code: school_code,
        schedule_name: schedule_name,
        classes: classes,
        number_of_installments: number_of_installments,
        collection_frequency: collection_frequency,
        start_date: start_date,
        end_date: end_date,
        last_collection_date: last_collection_date || null,
      }])
      .select()
      .single();

    if (scheduleError || !schedule) {
      console.error('Error creating fee schedule:', scheduleError);
      return NextResponse.json(
        { error: 'Failed to create fee schedule', details: scheduleError?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: schedule }, { status: 201 });
  } catch (error) {
    console.error('Error creating fee schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Get all fee schedules
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

    const { data: schedules, error: schedulesError } = await supabase
      .from('fee_schedules')
      .select('*')
      .eq('school_code', schoolCode)
      .order('created_at', { ascending: false });

    if (schedulesError) {
      return NextResponse.json(
        { error: 'Failed to fetch fee schedules', details: schedulesError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: schedules || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching fee schedules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

