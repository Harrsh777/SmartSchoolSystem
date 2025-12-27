import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get specific route
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const { data: route, error: routeError } = await supabase
      .from('transport_routes')
      .select(`
        *,
        vehicle:transport_vehicles(*),
        route_stops:transport_route_stops(
          stop_order,
          stop:transport_stops(*)
        )
      `)
      .eq('id', id)
      .eq('school_code', schoolCode)
      .single();

    if (routeError || !route) {
      return NextResponse.json(
        { error: 'Route not found' },
        { status: 404 }
      );
    }

    const formattedRoute = {
      ...route,
      route_stops: route.route_stops
        ?.sort((a: { stop_order: number; [key: string]: unknown }, b: { stop_order: number; [key: string]: unknown }) => a.stop_order - b.stop_order)
        .map((rs: { stop: unknown; [key: string]: unknown }) => rs.stop) || [],
    };

    return NextResponse.json({ data: formattedRoute }, { status: 200 });
  } catch (error) {
    console.error('Error fetching route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update route
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { school_code, route_name, vehicle_id, stop_ids } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Update route
    const updateData: { route_name?: string; vehicle_id?: string; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };
    if (route_name) updateData.route_name = route_name;
    if (vehicle_id) updateData.vehicle_id = vehicle_id;

    const { data: route, error: routeError } = await supabase
      .from('transport_routes')
      .update(updateData)
      .eq('id', id)
      .eq('school_code', school_code)
      .select()
      .single();

    if (routeError || !route) {
      return NextResponse.json(
        { error: 'Failed to update route', details: routeError?.message },
        { status: 500 }
      );
    }

    // Update stops if provided
    if (stop_ids && Array.isArray(stop_ids) && stop_ids.length > 0) {
      // Delete existing route stops
      await supabase.from('transport_route_stops').delete().eq('route_id', id);

      // Insert new route stops
      const routeStops = stop_ids.map((stopId: string, index: number) => ({
        route_id: id,
        stop_id: stopId,
        stop_order: index + 1,
      }));

      const { error: routeStopsError } = await supabase
        .from('transport_route_stops')
        .insert(routeStops);

      if (routeStopsError) {
        return NextResponse.json(
          { error: 'Failed to update route stops', details: routeStopsError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ data: route }, { status: 200 });
  } catch (error) {
    console.error('Error updating route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete route (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('transport_routes')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('school_code', schoolCode);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete route', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Route deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

