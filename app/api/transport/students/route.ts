import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import {
  computePeriodicTransportFeeFromStops,
} from '@/lib/transport/compute-student-transport-fee';
import {
  deleteStudentTransportFeeRows,
  syncStudentTransportFeeRow,
} from '@/lib/fees/transport-fee-sync';
import { normalizeBillingFrequency } from '@/lib/transport/transport-billing-period';
import { recordTransportAssignmentVersion, closeTransportAssignmentVersionsForStudent } from '@/lib/transport/transport-assignment-versions';
import { upsertTransportBillingObligation } from '@/lib/transport/transport-billing-obligations';
import {
  enumerateMonthlyPeriods,
  enumerateQuarterStartsInRange,
  monthEndFromMonthStart,
  parseMonthInputToMonthStart,
} from '@/lib/transport/transport-billing-period';
import { cacheKeys, DASHBOARD_REDIS_TTL, getCached, invalidateCachePattern } from '@/lib/cache';

export type TransportAssignmentInput = {
  student_id: string;
  pickup_stop_id?: string | null;
  dropoff_stop_id?: string | null;
  /** JSON may send a number or numeric string; empty string means “no override”. */
  custom_fare?: number | string | null;
  /** MONTHLY (default) or QUARTERLY — per-student or falls back to body default. */
  billing_frequency?: string | null;
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
): Promise<
  Map<
    string,
    {
      id: string;
      name: string;
      pickup_fare: number | null;
      drop_fare: number | null;
      monthly_pickup_fee: number | null;
      monthly_drop_fee: number | null;
      quarterly_pickup_fee: number | null;
      quarterly_drop_fee: number | null;
    }
  >
> {
  if (stopIds.length === 0) return new Map();
  const unique = [...new Set(stopIds)];
  const sel =
    'id, name, pickup_fare, drop_fare, monthly_pickup_fee, monthly_drop_fee, quarterly_pickup_fee, quarterly_drop_fee, school_code';
  const res = await supabase.from('transport_stops').select(sel).in('id', unique).eq('school_code', schoolCode);
  let data: unknown[] | null = res.data as unknown[] | null;
  let error = res.error;

  if (error?.code === '42703' || String(error?.message || '').includes('monthly_pickup_fee')) {
    const res2 = await supabase
      .from('transport_stops')
      .select('id, name, pickup_fare, drop_fare, school_code')
      .in('id', unique)
      .eq('school_code', schoolCode);
    data = res2.data as unknown[] | null;
    error = res2.error;
  }

  if (error) throw new Error(error.message);
  const map = new Map<
    string,
    {
      id: string;
      name: string;
      pickup_fare: number | null;
      drop_fare: number | null;
      monthly_pickup_fee: number | null;
      monthly_drop_fee: number | null;
      quarterly_pickup_fee: number | null;
      quarterly_drop_fee: number | null;
    }
  >();
  for (const row of data || []) {
    const r = row as Record<string, unknown>;
    map.set(String(r.id), {
      id: String(r.id),
      name: String(r.name || 'Stop'),
      pickup_fare: r.pickup_fare != null ? Number(r.pickup_fare) : null,
      drop_fare: r.drop_fare != null ? Number(r.drop_fare) : null,
      monthly_pickup_fee: r.monthly_pickup_fee != null ? Number(r.monthly_pickup_fee) : 0,
      monthly_drop_fee: r.monthly_drop_fee != null ? Number(r.monthly_drop_fee) : 0,
      quarterly_pickup_fee: r.quarterly_pickup_fee != null ? Number(r.quarterly_pickup_fee) : 0,
      quarterly_drop_fee: r.quarterly_drop_fee != null ? Number(r.quarterly_drop_fee) : 0,
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

    const key = cacheKeys.transportStudents(schoolCode, routeId);
    const students = await getCached(
      key,
      async () => {
        let query = supabase.from('students').select('*').eq('school_code', schoolCode);
        if (routeId) {
          query = query.eq('transport_route_id', routeId);
        } else {
          query = query.not('transport_type', 'is', null);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
      },
      { ttlSeconds: DASHBOARD_REDIS_TTL.transportStudents }
    );

    return NextResponse.json({ data: students }, { status: 200 });
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
    const defaultBillingFrequency = normalizeBillingFrequency(body.billing_frequency as string | undefined);
    const effectiveFromRaw = body.effective_from as string | undefined;
    const endMonthRaw = body.end_month as string | undefined;
    const effectiveFromMonth = parseMonthInputToMonthStart(String(effectiveFromRaw || ''));
    const endMonth = parseMonthInputToMonthStart(String(endMonthRaw || ''));

    if (!school_code || !route_id || !assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json(
        {
          error:
            'school_code, route_id, and non-empty assignments[] are required. Each item: { student_id, pickup_stop_id?, dropoff_stop_id?, custom_fare? }. Require at least one of: pickup stop, drop-off stop, or custom_fare.',
        },
        { status: 400 }
      );
    }
    if (!effectiveFromMonth) {
      return NextResponse.json({ error: 'Effective From is required (month-year)' }, { status: 400 });
    }
    if (!endMonth) {
      return NextResponse.json({ error: 'End Month is required (month-year)' }, { status: 400 });
    }
    if (endMonth < effectiveFromMonth) {
      return NextResponse.json({ error: 'End month cannot be before effective month' }, { status: 400 });
    }
    const effectiveFrom = effectiveFromMonth;
    const effectiveTo = monthEndFromMonthStart(endMonth);

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
    const enforceCapacity = capacity > 0;

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
    }

    const overlapFrom = effectiveFrom;
    const overlapTo = effectiveTo;
    const { data: overlappingRows, error: overlapErr } = await supabase
      .from('transport_assignment_versions')
      .select('id, student_id, effective_from, effective_to')
      .eq('school_code', school_code.toUpperCase().trim())
      .in('student_id', studentIds);
    if (overlapErr && overlapErr.code !== '42P01') {
      return NextResponse.json(
        { error: 'Failed to validate existing mapping overlap', details: overlapErr.message },
        { status: 500 }
      );
    }
    if (Array.isArray(overlappingRows) && overlappingRows.length > 0) {
      const hasOverlap = overlappingRows.some((r: { student_id: string; effective_from: string; effective_to: string | null }) => {
        const existingStart = String(r.effective_from).slice(0, 10);
        const existingEnd = r.effective_to ? String(r.effective_to).slice(0, 10) : '9999-12-31';
        if (!r.effective_to && existingStart < overlapFrom) {
          return false;
        }
        return existingStart <= overlapTo && overlapFrom <= existingEnd;
      });
      if (hasOverlap) {
        return NextResponse.json(
          {
            error:
              'Duplicate mapping detected for overlapping months. Update existing mapping dates first.',
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
    if (enforceCapacity && currentCount + newAssignments > capacity) {
      return NextResponse.json(
        {
          error: `Route capacity exceeded. Vehicle has ${capacity} seat(s). Currently ${currentCount} student(s) on this route; adding ${newAssignments} would exceed capacity.`,
        },
        { status: 400 }
      );
    }

    const updated: Record<string, unknown>[] = [];

    for (const a of uniqueAssignments) {
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
      let stopMap: Map<
        string,
        {
          pickup_fare: number | null;
          drop_fare: number | null;
          monthly_pickup_fee: number | null;
          monthly_drop_fee: number | null;
          quarterly_pickup_fee: number | null;
          quarterly_drop_fee: number | null;
        }
      >;
      try {
        const full = await fetchStopsByIds(supabase, stopIdsToLoad, school_code);
        stopMap = new Map(
          [...full.entries()].map(([k, v]) => [
            k,
            {
              pickup_fare: v.pickup_fare,
              drop_fare: v.drop_fare,
              monthly_pickup_fee: v.monthly_pickup_fee,
              monthly_drop_fee: v.monthly_drop_fee,
              quarterly_pickup_fee: v.quarterly_pickup_fee,
              quarterly_drop_fee: v.quarterly_drop_fee,
            },
          ])
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

      const billingFrequency = normalizeBillingFrequency(a.billing_frequency ?? defaultBillingFrequency);

      const periodic = computePeriodicTransportFeeFromStops({
        pickupStop,
        dropStop,
        frequency: billingFrequency,
        customFare: customFareNum,
      });
      const transportFee = periodic.total;
      const fromCustom = periodic.fromCustom;

      if (!hasCustom && transportFee <= 0 && (hasPickup || hasDrop)) {
        return NextResponse.json(
          {
            error:
              billingFrequency === 'QUARTERLY'
                ? 'Selected stop(s) have no quarterly (or monthly / per-trip) fee for the chosen leg(s). Configure quarterly_* and monthly_* on stops, per-trip fares, or use custom_fare.'
                : 'Selected stop(s) have no fare configured. Set monthly / per-trip pickup_fare & drop_fare on stops or use custom_fare.',
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
        transport_billing_frequency: billingFrequency,
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
                'Database missing transport columns. Apply migrations (transport pickup/drop + periodic billing): see supabase/migrations/',
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

      const verId = await recordTransportAssignmentVersion(supabase, {
        schoolCode: school_code,
        studentId: String(a.student_id),
        routeId: route_id,
        pickupStopId: hasPickup ? pickupId : null,
        dropoffStopId: hasDrop ? dropId : null,
        transportCustomFare: customFareNum,
        transportFee: fromCustom && customFareNum != null ? customFareNum : transportFee,
        billingFrequency,
        effectiveFrom,
        effectiveTo,
      });

      const monthlyPeriods =
        billingFrequency === 'QUARTERLY'
          ? enumerateQuarterStartsInRange(effectiveFrom, endMonth)
          : enumerateMonthlyPeriods(effectiveFrom, endMonth);
      if (monthlyPeriods.length > 0) {
        await supabase
          .from('transport_billing_obligations')
          .delete()
          .eq('school_code', school_code.toUpperCase().trim())
          .eq('student_id', String(a.student_id))
          .gte('period_start', monthlyPeriods[0])
          .lte('period_start', monthlyPeriods[monthlyPeriods.length - 1]);
      }
      for (const period of monthlyPeriods) {
        await upsertTransportBillingObligation(supabase, {
          schoolCode: school_code,
          studentId: String(a.student_id),
          billingMonthIso: period,
          billingFrequency,
          amountDue: fromCustom && customFareNum != null ? customFareNum : transportFee,
          assignmentVersionId: verId,
        });
      }

      const sync = await syncStudentTransportFeeRow(supabase, school_code, String(a.student_id));
      if (!sync.ok) {
        console.warn('[transport/students] transport fee sync:', sync.error);
      }
    }

    void invalidateCachePattern(cacheKeys.transportStudentsPattern(school_code));

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

    const today = new Date().toISOString().slice(0, 10);
    for (const sid of studentIdsArray) {
      await deleteStudentTransportFeeRows(supabase, schoolCode, sid);
      await closeTransportAssignmentVersionsForStudent(supabase, schoolCode, sid, today);
    }

    const clearPayload: Record<string, unknown> = {
      transport_route_id: null,
      transport_type: null,
      transport_pickup_stop_id: null,
      transport_dropoff_stop_id: null,
      transport_custom_fare: null,
      transport_fee: null,
      transport_billing_frequency: 'MONTHLY',
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
        void invalidateCachePattern(cacheKeys.transportStudentsPattern(schoolCode));
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

    void invalidateCachePattern(cacheKeys.transportStudentsPattern(schoolCode));

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
