import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get all vehicles
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

    const { data: vehicles, error: vehiclesError } = await supabase
      .from('transport_vehicles')
      .select('*')
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (vehiclesError) {
      return NextResponse.json(
        { error: 'Failed to fetch vehicles', details: vehiclesError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: vehicles || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create vehicle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      vehicle_code,
      registration_number,
      seats,
      type,
      description,
      documents_url,
    } = body;

    if (!school_code || !vehicle_code || !registration_number || !seats || !type) {
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

    // Check for duplicate vehicle_code
    const { data: existingVehicle, error: checkError } = await supabase
      .from('transport_vehicles')
      .select('id')
      .eq('school_code', school_code)
      .eq('vehicle_code', vehicle_code)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is what we want
      return NextResponse.json(
        { error: 'Failed to check for duplicate vehicle code', details: checkError.message },
        { status: 500 }
      );
    }

    if (existingVehicle) {
      return NextResponse.json(
        { error: 'Vehicle code already exists. Please use a different code.' },
        { status: 400 }
      );
    }

    // Check for duplicate registration_number
    const { data: existingReg, error: regCheckError } = await supabase
      .from('transport_vehicles')
      .select('id')
      .eq('school_code', school_code)
      .eq('registration_number', registration_number)
      .single();

    if (regCheckError && regCheckError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Failed to check for duplicate registration number', details: regCheckError.message },
        { status: 500 }
      );
    }

    if (existingReg) {
      return NextResponse.json(
        { error: 'Registration number already exists. Please use a different registration number.' },
        { status: 400 }
      );
    }

    // Validate seats
    const seatsNum = parseInt(seats);
    if (isNaN(seatsNum) || seatsNum < 1 || seatsNum > 200) {
      return NextResponse.json(
        { error: 'Number of seats must be between 1 and 200' },
        { status: 400 }
      );
    }

    const { data: vehicle, error: vehicleError } = await supabase
      .from('transport_vehicles')
      .insert([{
        school_id: schoolData.id,
        school_code: school_code,
        vehicle_code: vehicle_code.trim().toUpperCase(),
        registration_number: registration_number.trim().toUpperCase(),
        seats: seatsNum,
        type: type,
        description: description?.trim() || null,
        documents_url: documents_url?.trim() || null,
      }])
      .select()
      .single();

    if (vehicleError || !vehicle) {
      console.error('Error creating vehicle:', vehicleError);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to create vehicle';
      if (vehicleError?.code === '23505') {
        errorMessage = 'Vehicle code or registration number already exists';
      } else if (vehicleError?.code === '23503') {
        errorMessage = 'Invalid school reference';
      } else if (vehicleError?.code === '23514') {
        errorMessage = 'Invalid data: Check that all required fields are valid';
      } else if (vehicleError?.message) {
        errorMessage = vehicleError.message;
      }
      
      return NextResponse.json(
        { 
          error: errorMessage, 
          details: vehicleError?.message,
          hint: vehicleError?.code === '42P01' 
            ? 'The transport_vehicles table does not exist. Please create it in your database.'
            : vehicleError?.code === '42703'
            ? 'A required column is missing in transport_vehicles table. Please check the schema.'
            : undefined
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: vehicle }, { status: 201 });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

