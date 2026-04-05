import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

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

    const supabase = getServiceRoleClient();

    let student: Record<string, unknown> | null = null;
    let studentError = null as {
      hint: any; code?: string; message?: string 
} | null;

    const extendedSelect = supabase
      .from('students')
      .select(
        'id, transport_route_id, transport_type, transport_pickup_stop_id, transport_dropoff_stop_id, transport_custom_fare, transport_fee'
      )
      .eq('id', studentId)
      .eq('school_code', schoolCode)
      .single();

    const extRes = await extendedSelect;
    if (extRes.error?.code === '42703' || extRes.error?.message?.includes('transport_pickup_stop_id')) {
      const minRes = await supabase
        .from('students')
        .select('id, transport_route_id, transport_type')
        .eq('id', studentId)
        .eq('school_code', schoolCode)
        .single();
      student = minRes.data as Record<string, unknown> | null;
      studentError = minRes.error;
    } else {
      student = extRes.data as Record<string, unknown> | null;
      studentError = extRes.error;
    }

    if (studentError) {
      // Handle specific error codes
      if (studentError.code === 'PGRST116') {
        // No rows returned - student not found
        return NextResponse.json({
          data: {
            has_transport: false,
            transport_type: null,
            route: null,
            vehicle: null,
            stops: [],
            pickup_stop: null,
            dropoff_stop: null,
          },
        }, { status: 200 });
      }
      
      // Handle table not found error
      if (studentError.code === '42P01') {
        console.warn('Students table not found:', studentError.message);
        return NextResponse.json({
          data: {
            has_transport: false,
            transport_type: null,
            route: null,
            vehicle: null,
            stops: [],
            pickup_stop: null,
            dropoff_stop: null,
          },
        }, { status: 200 });
      }
      
      // For any other error, log it but return empty transport info gracefully
      // This prevents the UI from showing errors when student might just not have transport
      console.warn('Error fetching student (returning empty transport info):', {
        code: studentError.code,
        message: studentError.message,
        hint: studentError.hint,
      });
      
      return NextResponse.json({
        data: {
          has_transport: false,
          transport_type: null,
          route: null,
          vehicle: null,
          stops: [],
          pickup_stop: null,
          dropoff_stop: null,
        },
      }, { status: 200 });
    }

    if (!student) {
      // Student not found - return empty transport info instead of error
      return NextResponse.json({
        data: {
          has_transport: false,
          transport_type: null,
          route: null,
          vehicle: null,
          stops: [],
          pickup_stop: null,
          dropoff_stop: null,
        },
      }, { status: 200 });
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
          vehicle_code,
          type,
          seats,
          registration_number
        ),
        route_stops:transport_route_stops(
          stop_order,
          stop:transport_stops(
            id,
            name,
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

    if (routeError) {
      // Handle route errors gracefully
      if (routeError.code === 'PGRST116' || routeError.code === '42P01') {
        // Route not found or table doesn't exist
        console.warn('Transport route not found for student:', studentId);
      } else {
        console.warn('Error fetching transport route:', routeError.message);
      }
      
      return NextResponse.json({
        data: {
          has_transport: false,
          transport_type: student.transport_type || null,
          route: null,
          vehicle: null,
          stops: [],
          pickup_stop: null,
          dropoff_stop: null,
        },
      }, { status: 200 });
    }

    if (!route) {
      // Route not found - return empty transport info
      return NextResponse.json({
        data: {
          has_transport: false,
          transport_type: student.transport_type || null,
          route: null,
          vehicle: null,
          stops: [],
          pickup_stop: null,
          dropoff_stop: null,
        },
      }, { status: 200 });
    }

    // Format route stops (sort by stop_order). Schema uses name not stop_name.
    interface RouteStop {
      stop_order: number;
      stop: {
        id: string;
        name?: string;
        pickup_fare: number | null;
        drop_fare: number | null;
        is_active: boolean;
      } | null;
    }

    type SortedRouteStop = {
      id: string;
      order: number;
      stop_name: string;
      address: null;
      latitude: null;
      longitude: null;
      pickup_fare: number | null;
      drop_fare: number | null;
      is_active: boolean;
    };

    const sortedStops: SortedRouteStop[] = (route.route_stops as RouteStop[] || [])
      .sort((a, b) => a.stop_order - b.stop_order)
      .map((rs) => {
        const s = rs.stop;
        if (!s) return null;
        return {
          id: s.id,
          order: rs.stop_order,
          stop_name: s.name ?? 'Stop',
          address: null,
          latitude: null,
          longitude: null,
          pickup_fare: s.pickup_fare,
          drop_fare: s.drop_fare,
          is_active: s.is_active ?? true,
        };
      })
      .filter((stop): stop is SortedRouteStop => stop != null && !!stop.id);

    const pickupId = student.transport_pickup_stop_id
      ? String(student.transport_pickup_stop_id)
      : null;
    const dropId = student.transport_dropoff_stop_id
      ? String(student.transport_dropoff_stop_id)
      : null;
    const stopIds = [pickupId, dropId].filter((x): x is string => !!x);

    const stopRowById = new Map<
      string,
      { id: string; stop_name: string; pickup_fare: number | null; drop_fare: number | null }
    >();
    if (stopIds.length > 0) {
      const { data: stopRows } = await supabase
        .from('transport_stops')
        .select('id, name, pickup_fare, drop_fare')
        .in('id', stopIds)
        .eq('school_code', schoolCode);
      for (const r of stopRows || []) {
        stopRowById.set(String(r.id), {
          id: String(r.id),
          stop_name: String(r.name ?? 'Stop'),
          pickup_fare: r.pickup_fare != null ? Number(r.pickup_fare) : null,
          drop_fare: r.drop_fare != null ? Number(r.drop_fare) : null,
        });
      }
    }

    function toStudentStopPayload(id: string | null): {
      id: string;
      stop_name: string;
      address: null;
      latitude: null;
      longitude: null;
      pickup_fare: number | null;
      drop_fare: number | null;
    } | null {
      if (!id) return null;
      const row = stopRowById.get(id);
      if (!row) return null;
      return {
        id: row.id,
        stop_name: row.stop_name,
        address: null,
        latitude: null,
        longitude: null,
        pickup_fare: row.pickup_fare,
        drop_fare: row.drop_fare,
      };
    }

    const pickupStop = toStudentStopPayload(pickupId);
    const dropoffStop = toStudentStopPayload(dropId);

    const transport_fee_effective =
      student.transport_fee != null && student.transport_fee !== ''
        ? Number(student.transport_fee)
        : null;
    const transport_custom_fare =
      student.transport_custom_fare != null && student.transport_custom_fare !== ''
        ? Number(student.transport_custom_fare)
        : null;

    // Format the response
    const formattedData = {
      has_transport: true,
      transport_type: student.transport_type || 'School Bus',
      transport_fee: transport_fee_effective,
      transport_custom_fare,
      route: {
        id: route.id,
        route_name: route.route_name,
        is_active: route.is_active,
        created_at: route.created_at,
      },
      vehicle: route.vehicle ? {
        id: route.vehicle.id,
        // Backward-compatible fields expected by student UI
        vehicle_number: route.vehicle.vehicle_code,
        vehicle_type: route.vehicle.type ?? null,
        driver_name: null,
        driver_phone: null,
        seats: route.vehicle.seats,
        registration_number: route.vehicle.registration_number,
      } : null,
      stops: sortedStops,
      pickup_stop: pickupStop,
      dropoff_stop: dropoffStop,
    };

    return NextResponse.json({ data: formattedData }, { status: 200 });
  } catch (error) {
    // Catch any unexpected errors and return empty transport info
    // This ensures the UI always shows a graceful "No Transport Assigned" message
    console.error('Unexpected error fetching student transport info:', error);
    return NextResponse.json({
      data: {
        has_transport: false,
        transport_type: null,
        route: null,
        vehicle: null,
        stops: [],
        pickup_stop: null,
        dropoff_stop: null,
      },
    }, { status: 200 });
  }
}
