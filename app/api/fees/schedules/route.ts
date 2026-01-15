import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Create fee schedule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      schedule_name,
      academic_year,
      number_of_installments,
      collection_frequency = 'monthly',
      installments, // JSONB array of installment details
      start_date,
      end_date,
      last_collection_date,
      classes,
      is_active = true,
    } = body;

    if (!school_code || !schedule_name || !academic_year || !number_of_installments || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Missing required fields: school_code, schedule_name, academic_year, number_of_installments, start_date, end_date are required' },
        { status: 400 }
      );
    }

    // Validate installments array
    if (!installments || !Array.isArray(installments) || installments.length !== number_of_installments) {
      return NextResponse.json(
        { error: `Installments array must have exactly ${number_of_installments} items with installment_number, due_date, and name` },
        { status: 400 }
      );
    }

    // Validate each installment
    for (const inst of installments) {
      if (!inst.installment_number || !inst.due_date || !inst.name) {
        return NextResponse.json(
          { error: 'Each installment must have installment_number, due_date, and name' },
          { status: 400 }
        );
      }
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

    // Check for duplicate schedule name (within same academic year)
    const { data: existing } = await supabase
      .from('fee_schedules')
      .select('id')
      .eq('school_code', school_code)
      .eq('schedule_name', schedule_name.trim())
      .eq('academic_year', academic_year)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'A fee schedule with this name already exists for this academic year' },
        { status: 400 }
      );
    }

    // Create fee schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('fee_schedules')
      .insert([{
        school_id: schoolData.id,
        school_code: school_code,
        schedule_name: schedule_name.trim(),
        academic_year: academic_year,
        number_of_installments: parseInt(number_of_installments.toString()),
        collection_frequency: collection_frequency,
        installments: installments, // JSONB array
        start_date: start_date,
        end_date: end_date,
        last_collection_date: last_collection_date || null,
        classes: Array.isArray(classes) ? classes : (classes ? [classes] : []),
        is_active: Boolean(is_active),
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

