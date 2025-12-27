import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/transport/students
 * Get students assigned to a route or all transport students
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const routeId = searchParams.get('route_id');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('students')
      .select('*')
      .eq('school_code', schoolCode);

    // If route_id is provided, filter by route
    if (routeId) {
      query = query.eq('transport_route_id', routeId);
    } else {
      // Get all students with transport (transport_type is not null)
      query = query.not('transport_type', 'is', null);
    }

    const { data: students, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch students', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: students || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching transport students:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/transport/students
 * Assign students to a route
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, route_id, student_ids } = body;

    if (!school_code || !route_id || !student_ids || !Array.isArray(student_ids)) {
      return NextResponse.json(
        { error: 'School code, route ID, and student IDs array are required' },
        { status: 400 }
      );
    }

    // Verify route exists
    const { data: route, error: routeError } = await supabase
      .from('transport_routes')
      .select('id, vehicle:transport_vehicles(seats)')
      .eq('id', route_id)
      .eq('school_code', school_code)
      .single();

    if (routeError || !route) {
      return NextResponse.json(
        { error: 'Route not found' },
        { status: 404 }
      );
    }

    // Get vehicle capacity
    const vehicle = route.vehicle as { seats?: number } | null;
    const capacity = vehicle?.seats || 0;

    // Check current assignments
    const { data: currentAssignments, error: currentError } = await supabase
      .from('students')
      .select('id')
      .eq('school_code', school_code)
      .eq('transport_route_id', route_id);

    if (currentError) {
      return NextResponse.json(
        { error: 'Failed to check current assignments', details: currentError.message },
        { status: 500 }
      );
    }

    const currentCount = currentAssignments?.length || 0;
    const newCount = student_ids.length;
    const totalCount = currentCount + newCount;

    // Check if adding these students would exceed capacity
    if (totalCount > capacity) {
      return NextResponse.json(
        { 
          error: `Route capacity exceeded. Current: ${currentCount}, Adding: ${newCount}, Capacity: ${capacity}` 
        },
        { status: 400 }
      );
    }

    // Update students with route_id
    const { data: updatedStudents, error: updateError } = await supabase
      .from('students')
      .update({ transport_route_id: route_id, transport_type: 'School Bus' })
      .in('id', student_ids)
      .eq('school_code', school_code)
      .select();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to assign students to route', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        data: updatedStudents,
        message: `Successfully assigned ${updatedStudents?.length || 0} students to route`
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error assigning students to route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/transport/students
 * Remove students from a route
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const studentIds = searchParams.get('student_ids');

    if (!schoolCode || !studentIds) {
      return NextResponse.json(
        { error: 'School code and student IDs are required' },
        { status: 400 }
      );
    }

    const studentIdsArray = studentIds.split(',');

    // Remove route assignment
    const { data: updatedStudents, error: updateError } = await supabase
      .from('students')
      .update({ transport_route_id: null, transport_type: null })
      .in('id', studentIdsArray)
      .eq('school_code', schoolCode)
      .select();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to remove students from route', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        data: updatedStudents,
        message: `Successfully removed ${updatedStudents?.length || 0} students from route`
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error removing students from route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

