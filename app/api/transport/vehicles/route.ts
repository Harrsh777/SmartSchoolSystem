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

    const { data: vehicle, error: vehicleError } = await supabase
      .from('transport_vehicles')
      .insert([{
        school_id: schoolData.id,
        school_code: school_code,
        vehicle_code: vehicle_code,
        registration_number: registration_number,
        seats: parseInt(seats),
        type: type,
        description: description || null,
        documents_url: documents_url || null,
      }])
      .select()
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { error: 'Failed to create vehicle', details: vehicleError?.message },
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

