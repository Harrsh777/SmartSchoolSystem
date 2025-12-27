import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get all routes with vehicle and stops
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

    const { data: routes, error: routesError } = await supabase
      .from('transport_routes')
      .select(`
        *,
        vehicle:transport_vehicles(*),
        route_stops:transport_route_stops(
          stop_order,
          stop:transport_stops(*)
        )
      `)
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (routesError) {
      return NextResponse.json(
        { error: 'Failed to fetch routes', details: routesError.message },
        { status: 500 }
      );
    }

    // Format the response
    interface RouteStop {
      stop_order: number;
      stop: unknown;
      [key: string]: unknown;
    }
    interface RouteData {
      route_stops?: RouteStop[];
      [key: string]: unknown;
    }
    const formattedRoutes = routes?.map((route: RouteData) => ({
      ...route,
      route_stops: route.route_stops
        ?.sort((a: RouteStop, b: RouteStop) => a.stop_order - b.stop_order)
        .map((rs: RouteStop) => rs.stop) || [],
    })) || [];

    return NextResponse.json({ data: formattedRoutes }, { status: 200 });
  } catch (error) {
    console.error('Error fetching routes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create route
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      route_name,
      vehicle_id,
      stop_ids,
    } = body;

    if (!school_code || !route_name || !vehicle_id || !stop_ids || !Array.isArray(stop_ids) || stop_ids.length === 0) {
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

    // Verify vehicle exists
    const { data: vehicle, error: vehicleError } = await supabase
      .from('transport_vehicles')
      .select('id')
      .eq('id', vehicle_id)
      .eq('school_code', school_code)
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Create route
    const { data: route, error: routeError } = await supabase
      .from('transport_routes')
      .insert([{
        school_id: schoolData.id,
        school_code: school_code,
        route_name: route_name,
        vehicle_id: vehicle_id,
      }])
      .select()
      .single();

    if (routeError || !route) {
      return NextResponse.json(
        { error: 'Failed to create route', details: routeError?.message },
        { status: 500 }
      );
    }

    // Create route stops mapping
    const routeStops = stop_ids.map((stopId: string, index: number) => ({
      route_id: route.id,
      stop_id: stopId,
      stop_order: index + 1,
    }));

    const { error: routeStopsError } = await supabase
      .from('transport_route_stops')
      .insert(routeStops);

    if (routeStopsError) {
      // Rollback route creation
      await supabase.from('transport_routes').delete().eq('id', route.id);
      return NextResponse.json(
        { error: 'Failed to create route stops', details: routeStopsError.message },
        { status: 500 }
      );
    }

    // Fetch complete route data
    const { data: completeRoute, error: fetchError } = await supabase
      .from('transport_routes')
      .select(`
        *,
        vehicle:transport_vehicles(*),
        route_stops:transport_route_stops(
          stop_order,
          stop:transport_stops(*)
        )
      `)
      .eq('id', route.id)
      .single();

    if (fetchError || !completeRoute) {
      return NextResponse.json(
        { error: 'Route created but failed to fetch complete data' },
        { status: 500 }
      );
    }

    interface RouteStop {
      stop_order: number;
      stop: unknown;
      [key: string]: unknown;
    }
    const formattedRoute = {
      ...completeRoute,
      route_stops: completeRoute.route_stops
        ?.sort((a: RouteStop, b: RouteStop) => a.stop_order - b.stop_order)
        .map((rs: RouteStop) => rs.stop) || [],
    };

    return NextResponse.json({ data: formattedRoute }, { status: 201 });
  } catch (error) {
    console.error('Error creating route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

