import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { computeTransportFeeFromStops } from '@/lib/transport/compute-student-transport-fee';
import {
  deleteStudentTransportFeeRows,
  syncStudentTransportFeeRow,
} from '@/lib/fees/transport-fee-sync';

export type TransportAssignmentInput = {
  student_id: string;
  pickup_stop_id?: string | null;
  dropoff_stop_id?: string | null;
  /** JSON may send a number or numeric string; empty string means “no override”. */
  custom_fare?: number | string | null;
};

async function fetchRouteStopIds(
  supabase: ReturnType<typeof getServiceRoleClient>,
  routeId: string
): Promise<Set<string>> {
  const { data: rows, error } = await supabase
    .from('transport_route_stops')
    .select('stop_id')
    .eq('route_id', routeId);

  if (error) throw new Error(error.message);
  return new Set((rows || []).map((r: { stop_id: string }) => String(r.stop_id)));
}

async function fetchStopsByIds(
  supabase: ReturnType<typeof getServiceRoleClient>,
  stopIds: string[],
  schoolCode: string
): Promise<Map<string, { id: string; name: string; pickup_fare: number | null; drop_fare: number | null }>> {
  if (stopIds.length === 0) return new Map();
  const unique = [...new Set(stopIds)];
  const { data, error } = await supabase
    .from('transport_stops')
    .select('id, name, pickup_fare, drop_fare, school_code')
    .in('id', unique)
    .eq('school_code', schoolCode);

  if (error) throw new Error(error.message);
  const map = new Map<
    string,
    { id: string; name: string; pickup_fare: number | null; drop_fare: number | null }
  >();
  for (const row of data || []) {
    map.set(String(row.id), {
      id: String(row.id),
      name: String(row.name || 'Stop'),
      pickup_fare: row.pickup_fare != null ? Number(row.pickup_fare) : null,
      drop_fare: row.drop_fare != null ? Number(row.drop_fare) : null,
    });
  }
  return map;
}

/**
 * GET /api/transport/students
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceRoleClient();
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const routeId = searchParams.get('route_id');

    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    let query = supabase.from('students').select('*').eq('school_code', schoolCode);

    if (routeId) {
      query = query.eq('transport_route_id', routeId);
    } else {
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/transport/students
 * Assign or update students on a route with pickup/drop stops and optional custom fare.
 * Body: { school_code, route_id, assignments: TransportAssignmentInput[] }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceRoleClient();
    const body = await request.json();
    const school_code = body.school_code as string | undefined;
    const route_id = body.route_id as string | undefined;
    const assignments = body.assignments as TransportAssignmentInput[] | undefined;

    if (!school_code || !route_id || !assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json(
        {
          error:
            'school_code, route_id, and non-empty assignments[] are required. Each item: { student_id, pickup_stop_id?, dropoff_stop_id?, custom_fare? }. Require at least one of: pickup stop, drop-off stop, or custom_fare.',
        },
        { status: 400 }
      );
    }

    const byStudent = new Map<string, TransportAssignmentInput>();
    for (const a of assignments) {
      if (!a?.student_id) {
        return NextResponse.json({ error: 'Each assignment must include student_id' }, { status: 400 });
      }
      byStudent.set(String(a.student_id), a);
    }
    const uniqueAssignments = [...byStudent.values()];

    const { data: route, error: routeError } = await supabase
      .from('transport_routes')
      .select('id, school_code, vehicle:transport_vehicles(seats)')
      .eq('id', route_id)
      .eq('school_code', school_code)
      .single();

    if (routeError || !route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    const vehicle = route.vehicle as { seats?: number } | null;
    const capacity = vehicle?.seats || 0;

    let validStopIds: Set<string>;
    try {
      validStopIds = await fetchRouteStopIds(supabase, route_id);
    } catch (e) {
      return NextResponse.json(
        { error: 'Failed to load route stops', details: (e as Error).message },
        { status: 500 }
      );
    }

    const studentIds = uniqueAssignments.map((a) => String(a.student_id));
    const { data: existingRows, error: stErr } = await supabase
      .from('students')
      .select('id, transport_route_id')
      .eq('school_code', school_code)
      .in('id', studentIds);

    if (stErr) {
      return NextResponse.json({ error: stErr.message }, { status: 500 });
    }

    const byId = new Map((existingRows || []).map((r: { id: string; transport_route_id: string | null }) => [r.id, r]));

    for (const a of uniqueAssignments) {
      const sid = String(a.student_id);
      const row = byId.get(sid);
      if (!row) {
        return NextResponse.json({ error: `Student not found: ${sid}` }, { status: 404 });
      }
      if (row.transport_route_id && row.transport_route_id !== route_id) {
        return NextResponse.json(
          {
            error:
              'One or more students are already assigned to a different route. Remove them from the other route first.',
          },
          { status: 400 }
        );
      }
    }

    const { data: onRoute, error: cntErr } = await supabase
      .from('students')
      .select('id')
      .eq('school_code', school_code)
      .eq('transport_route_id', route_id);

    if (cntErr) {
      return NextResponse.json({ error: cntErr.message }, { status: 500 });
    }

    const alreadyOnRouteIds = new Set((onRoute || []).map((r: { id: string }) => r.id));
    let newAssignments = 0;
    for (const a of uniqueAssignments) {
      if (!alreadyOnRouteIds.has(String(a.student_id))) newAssignments += 1;
    }
    const currentCount = alreadyOnRouteIds.size;
    if (currentCount + newAssignments > capacity) {
      return NextResponse.json(
        {
          error: `Route capacity exceeded. Current: ${currentCount}, new seats needed: ${newAssignments}, capacity: ${capacity}`,
        },
        { status: 400 }
      );
    }

    const updated: Record<string, unknown>[] = [];

    for (const a of assignments) {
      const pickupId = a.pickup_stop_id ? String(a.pickup_stop_id).trim() : '';
      const dropId = a.dropoff_stop_id ? String(a.dropoff_stop_id).trim() : '';
      const hasPickup = !!pickupId;
      const hasDrop = !!dropId;

      const customRaw = a.custom_fare;
      let customFareNum: number | null = null;
      if (customRaw != null) {
        if (typeof customRaw === 'string') {
          const t = customRaw.trim();
          if (t !== '') {
            const n = Number(t);
            if (Number.isFinite(n) && n >= 0) customFareNum = n;
          }
        } else if (typeof customRaw === 'number' && Number.isFinite(customRaw) && customRaw >= 0) {
          customFareNum = customRaw;
        }
      }
      const hasCustom = customFareNum != null;

      if (!hasCustom && !hasPickup && !hasDrop) {
        return NextResponse.json(
          {
            error:
              'Each assignment must include at least a pickup stop or a drop-off stop (or a custom fare override).',
          },
          { status: 400 }
        );
      }

      if (hasPickup && !validStopIds.has(pickupId)) {
        return NextResponse.json(
          { error: `Pickup stop is not on the selected route: ${pickupId}` },
          { status: 400 }
        );
      }
      if (hasDrop && !validStopIds.has(dropId)) {
        return NextResponse.json(
          { error: `Drop-off stop is not on the selected route: ${dropId}` },
          { status: 400 }
        );
      }

      const stopIdsToLoad = [pickupId, dropId].filter(Boolean);
      let stopMap: Map<string, { pickup_fare: number | null; drop_fare: number | null }>;
      try {
        const full = await fetchStopsByIds(supabase, stopIdsToLoad, school_code);
        stopMap = new Map(
          [...full.entries()].map(([k, v]) => [k, { pickup_fare: v.pickup_fare, drop_fare: v.drop_fare }])
        );
      } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
      }

      const pickupStop = hasPickup ? stopMap.get(pickupId) ?? null : null;
      const dropStop = hasDrop ? stopMap.get(dropId) ?? null : null;

      if (hasPickup && !pickupStop) {
        return NextResponse.json({ error: 'Pickup stop not found for this school' }, { status: 400 });
      }
      if (hasDrop && !dropStop) {
        return NextResponse.json({ error: 'Drop-off stop not found for this school' }, { status: 400 });
      }

      const { total: transportFee, fromCustom } = computeTransportFeeFromStops({
        pickupStop,
        dropStop,
        customFare: customFareNum,
      });

      if (!hasCustom && transportFee <= 0 && (hasPickup || hasDrop)) {
        return NextResponse.json(
          {
            error:
              'Selected stop(s) have no fare configured. Set pickup_fare / drop_fare on stops or use custom_fare.',
          },
          { status: 400 }
        );
      }

      const updatePayload: Record<string, unknown> = {
        transport_route_id: route_id,
        transport_type: 'School Bus',
        transport_pickup_stop_id: hasPickup ? pickupId : null,
        transport_dropoff_stop_id: hasDrop ? dropId : null,
        transport_custom_fare: customFareNum,
        transport_fee: fromCustom && customFareNum != null ? customFareNum : transportFee,
      };

      const { data: u, error: upErr } = await supabase
        .from('students')
        .update(updatePayload)
        .eq('id', a.student_id)
        .eq('school_code', school_code)
        .select()
        .single();

      if (upErr) {
        if (upErr.code === '42703' || upErr.message?.includes('transport_pickup_stop_id')) {
          return NextResponse.json(
            {
              error:
                'Database missing transport columns. Apply migration: supabase/migrations/20260331100000_student_transport_pickup_drop.sql',
              details: upErr.message,
            },
            { status: 500 }
          );
        }
        return NextResponse.json(
          { error: 'Failed to update student', details: upErr.message },
          { status: 500 }
        );
      }
      updated.push(u);

      const sync = await syncStudentTransportFeeRow(supabase, school_code, String(a.student_id));
      if (!sync.ok) {
        console.warn('[transport/students] transport fee sync:', sync.error);
      }
    }

    return NextResponse.json(
      {
        data: updated,
        message: `Successfully updated ${updated.length} student(s) on route`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error assigning transport students:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/transport/students?school_code=&student_ids=id1,id2
 * Clears route, stops, and transport fee fields.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getServiceRoleClient();
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const studentIds = searchParams.get('student_ids');

    if (!schoolCode || !studentIds) {
      return NextResponse.json({ error: 'School code and student IDs are required' }, { status: 400 });
    }

    const studentIdsArray = studentIds.split(',').filter(Boolean);

    for (const sid of studentIdsArray) {
      await deleteStudentTransportFeeRows(supabase, schoolCode, sid);
    }

    const clearPayload: Record<string, unknown> = {
      transport_route_id: null,
      transport_type: null,
      transport_pickup_stop_id: null,
      transport_dropoff_stop_id: null,
      transport_custom_fare: null,
      transport_fee: null,
    };

    const { data: updatedStudents, error: updateError } = await supabase
      .from('students')
      .update(clearPayload)
      .in('id', studentIdsArray)
      .eq('school_code', schoolCode)
      .select();

    if (updateError) {
      if (updateError.code === '42703' || updateError.message?.includes('transport_pickup_stop_id')) {
        const { data: fallback, error: fbErr } = await supabase
          .from('students')
          .update({ transport_route_id: null, transport_type: null })
          .in('id', studentIdsArray)
          .eq('school_code', schoolCode)
          .select();
        if (fbErr) {
          return NextResponse.json(
            { error: 'Failed to remove students from route', details: fbErr.message },
            { status: 500 }
          );
        }
        return NextResponse.json(
          {
            data: fallback,
            message: `Removed ${fallback?.length || 0} student(s) from route (partial clear; run migration for full stop/fee reset).`,
          },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to remove students from route', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data: updatedStudents,
        message: `Successfully removed ${updatedStudents?.length || 0} students from route`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error removing transport students:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
