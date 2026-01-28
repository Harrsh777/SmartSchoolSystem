import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

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

    const supabase = getServiceRoleClient();

    // Fetch all transport routes with vehicles, stops, and student assignments
    const { data: routes, error: routesError } = await supabase
      .from('transport_routes')
      .select(`
        *,
        vehicle:transport_vehicles(
          vehicle_code,
          type,
          seats,
          registration_number
        ),
        route_stops:transport_route_stops(
          stop_order,
          stop:transport_stops(
            name,
            pickup_fare,
            drop_fare
          )
        )
      `)
      .eq('school_code', schoolCode)
      .order('route_name', { ascending: true });

    if (routesError) {
      return NextResponse.json(
        { error: 'Failed to fetch transport data', details: routesError.message },
        { status: 500 }
      );
    }

    // Fetch all students with transport assignments
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, student_name, admission_no, class, section, transport_route_id')
      .eq('school_code', schoolCode)
      .not('transport_route_id', 'is', null);

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
    }

    // Convert to CSV
    if ((!routes || routes.length === 0) && (!students || students.length === 0)) {
      return new NextResponse('No transport data available', {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="transport_report_${schoolCode}.csv"`,
        },
      });
    }

    const escapeCsvValue = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      const stringVal = String(val);
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      return stringVal;
    };

    // Create CSV with route information
    const csvHeader = [
      'Route Name',
      'Vehicle Number',
      'Vehicle Type',
      'Driver Name',
      'Driver Phone',
      'Registration Number',
      'Total Seats',
      'Stop Name',
      'Stop Address',
      'Stop Order',
      'Pickup Fare',
      'Drop Fare',
      'Student Name',
      'Student Admission No',
      'Student Class',
      'Student Section',
      'Is Active',
      'Created At',
    ].join(',') + '\n';

    const csvRows: string[] = [];

    // Process routes and their stops
    routes?.forEach((route: {
      route_name?: string;
      is_active?: boolean;
      created_at?: string;
      vehicle?: {
        vehicle_code?: string;
        type?: string;
        registration_number?: string;
        seats?: number;
      };
      route_stops?: Array<{
        stop_order?: number;
        stop?: {
          name?: string;
          address?: string;
          pickup_fare?: number;
          drop_fare?: number;
        };
      }>;
      id?: string;
      [key: string]: unknown;
    }) => {
      const vehicle = route.vehicle as {
        vehicle_code?: string;
        type?: string;
        registration_number?: string;
        seats?: number;
      } | undefined;

      const routeStops = (route.route_stops || []) as Array<{
        stop_order?: number;
        stop?: {
          name?: string;
          address?: string;
          pickup_fare?: number;
          drop_fare?: number;
        };
      }>;

      // Get students assigned to this route
      const routeStudents = students?.filter((s: { transport_route_id?: string }) => s.transport_route_id === route.id) || [];

      if (routeStops.length > 0) {
        routeStops.forEach((routeStop) => {
          const stop = routeStop.stop;
          
          // If there are students, create a row for each student
          if (routeStudents.length > 0) {
            routeStudents.forEach((student: { student_name?: string; admission_no?: string; class?: string; section?: string }) => {
              csvRows.push([
                route.route_name || '',
                vehicle?.vehicle_code || '',
                vehicle?.type || '',
                '',
                '',
                vehicle?.registration_number || '',
                vehicle?.seats || 0,
                stop?.name || '',
                stop?.address || '',
                routeStop.stop_order || 0,
                stop?.pickup_fare || 0,
                stop?.drop_fare || 0,
                student.student_name || '',
                student.admission_no || '',
                student.class || '',
                student.section || '',
                route.is_active ? 'Yes' : 'No',
                route.created_at || '',
              ].map(escapeCsvValue).join(','));
            });
          } else {
            // No students assigned, just show route and stop info
            csvRows.push([
              route.route_name || '',
              vehicle?.vehicle_code || '',
              vehicle?.type || '',
              '',
              '',
              vehicle?.registration_number || '',
              vehicle?.seats || 0,
              stop?.name || '',
              stop?.address || '',
              routeStop.stop_order || 0,
              stop?.pickup_fare || 0,
              stop?.drop_fare || 0,
              '',
              '',
              '',
              '',
              route.is_active ? 'Yes' : 'No',
              route.created_at || '',
            ].map(escapeCsvValue).join(','));
          }
        });
      } else {
        // Route with no stops
        routeStudents.forEach((student: { student_name?: string; admission_no?: string; class?: string; section?: string }) => {
          csvRows.push([
            route.route_name || '',
            vehicle?.vehicle_code || '',
            vehicle?.type || '',
            '',
            '',
            vehicle?.registration_number || '',
            vehicle?.seats || 0,
            '',
            '',
            0,
            0,
            0,
            student.student_name || '',
            student.admission_no || '',
            student.class || '',
            student.section || '',
            route.is_active ? 'Yes' : 'No',
            route.created_at || '',
          ].map(escapeCsvValue).join(','));
        });
      }
    });

    const csvContent = csvHeader + csvRows.join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="transport_report_${schoolCode}_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error generating transport report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
