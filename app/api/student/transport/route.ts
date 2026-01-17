import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/student/transport
 * Fetch transport information (route, vehicle, stops) for a specific student
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const studentId = searchParams.get('student_id');

    if (!schoolCode || !studentId) {
      return NextResponse.json(
        { error: 'school_code and student_id are required' },
        { status: 400 }
      );
    }

    // First, get the student's transport_route_id
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, transport_route_id, transport_type, pickup_stop_id, dropoff_stop_id')
      .eq('id', studentId)
      .eq('school_code', schoolCode)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // If student has no transport route assigned
    if (!student.transport_route_id) {
      return NextResponse.json({
        data: {
          has_transport: false,
          route: null,
          vehicle: null,
          stops: [],
          pickup_stop: null,
          dropoff_stop: null,
        },
      }, { status: 200 });
    }

    // Fetch route with vehicle and stops
    const { data: route, error: routeError } = await supabase
      .from('transport_routes')
      .select(`
        *,
        vehicle:transport_vehicles(
          id,
          vehicle_number,
          vehicle_type,
          driver_name,
          driver_phone,
          seats,
          registration_number
        ),
        route_stops:transport_route_stops(
          stop_order,
          stop:transport_stops(
            id,
            stop_name,
            address,
            latitude,
            longitude,
            pickup_fare,
            drop_fare,
            is_active
          )
        )
      `)
      .eq('id', student.transport_route_id)
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .single();

    if (routeError || !route) {
      return NextResponse.json(
        { error: 'Transport route not found or inactive' },
        { status: 404 }
      );
    }

    // Format route stops (sort by stop_order)
    interface RouteStop {
      stop_order: number;
      stop: {
        id: string;
        stop_name: string;
        address: string | null;
        latitude: number | null;
        longitude: number | null;
        pickup_fare: number | null;
        drop_fare: number | null;
        is_active: boolean;
      } | null;
    }

    const sortedStops = (route.route_stops as RouteStop[] || [])
      .sort((a, b) => a.stop_order - b.stop_order)
      .map((rs) => ({
        order: rs.stop_order,
        ...rs.stop,
      }))
      .filter((stop) => stop.id); // Filter out null stops

    // Get pickup and dropoff stops if specified
    let pickupStop = null;
    let dropoffStop = null;

    if (student.pickup_stop_id) {
      pickupStop = sortedStops.find((stop) => stop.id === student.pickup_stop_id) || null;
    }

    if (student.dropoff_stop_id) {
      dropoffStop = sortedStops.find((stop) => stop.id === student.dropoff_stop_id) || null;
    }

    // Format the response
    const formattedData = {
      has_transport: true,
      transport_type: student.transport_type || 'School Bus',
      route: {
        id: route.id,
        route_name: route.route_name,
        is_active: route.is_active,
        created_at: route.created_at,
      },
      vehicle: route.vehicle ? {
        id: route.vehicle.id,
        vehicle_number: route.vehicle.vehicle_number,
        vehicle_type: route.vehicle.vehicle_type,
        driver_name: route.vehicle.driver_name,
        driver_phone: route.vehicle.driver_phone,
        seats: route.vehicle.seats,
        registration_number: route.vehicle.registration_number,
      } : null,
      stops: sortedStops,
      pickup_stop: pickupStop,
      dropoff_stop: dropoffStop,
    };

    return NextResponse.json({ data: formattedData }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student transport info:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
