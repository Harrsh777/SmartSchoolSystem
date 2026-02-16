import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/leave/staff-leave-detail?school_code=...&month=YYYY-MM&staff_id=...
 * Returns per-staff list of leave dates (for the given month) for detail view and detailed report.
 * month is required. If staff_id is provided, returns only that staff.
 */
function getDaysBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const d = new Date(start);
  const endDate = new Date(end);
  while (d <= endDate) {
    dates.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolCode = searchParams.get('school_code');
    const month = searchParams.get('month'); // YYYY-MM required
    const staffIdParam = searchParams.get('staff_id');

    if (!schoolCode || !month) {
      return NextResponse.json(
        { error: 'school_code and month are required' },
        { status: 400 }
      );
    }

    const [startOfMonth, endOfMonth] = (() => {
      const [y, m] = month.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      return [start.toISOString().split('T')[0], end.toISOString().split('T')[0]];
    })();

    const supabase = getServiceRoleClient();

    const { data: leaveTypes, error: typesErr } = await supabase
      .from('leave_types')
      .select('id, abbreviation, name')
      .eq('school_code', schoolCode);

    if (typesErr || !leaveTypes?.length) {
      return NextResponse.json({ data: { staff: [] } });
    }

    let staffQuery = supabase
      .from('staff')
      .select('id, full_name, staff_id, department, role')
      .eq('school_code', schoolCode);
    if (staffIdParam) {
      staffQuery = staffQuery.eq('id', staffIdParam);
    }
    const { data: staffList, error: staffErr } = await staffQuery.order('full_name');
    if (staffErr || !staffList?.length) {
      return NextResponse.json({ data: { staff: [] } });
    }

    const staffIds = staffList.map((s: { id: string }) => s.id);
    const defaultLeaveTypeId = leaveTypes[0]?.id;

    const { data: requests } = await supabase
      .from('staff_leave_requests')
      .select('staff_id, leave_type_id, leave_start_date, leave_end_date')
      .eq('school_code', schoolCode)
      .eq('status', 'approved')
      .in('staff_id', staffIds);

    const requestDaysByStaffAndType = new Map<string, Map<string, Set<string>>>();
    for (const r of requests || []) {
      if (!r.leave_start_date || !r.leave_end_date) continue;
      const typeId = r.leave_type_id || defaultLeaveTypeId;
      const dates = getDaysBetween(r.leave_start_date, r.leave_end_date);
      if (!requestDaysByStaffAndType.has(r.staff_id)) {
        requestDaysByStaffAndType.set(r.staff_id, new Map());
      }
      const byType = requestDaysByStaffAndType.get(r.staff_id)!;
      if (!byType.has(typeId)) byType.set(typeId, new Set());
      dates.forEach((d) => byType.get(typeId)!.add(d));
    }

    const { data: attendanceLeave } = await supabase
      .from('staff_attendance')
      .select('staff_id, attendance_date')
      .eq('school_code', schoolCode)
      .eq('status', 'leave')
      .gte('attendance_date', startOfMonth)
      .lte('attendance_date', endOfMonth)
      .in('staff_id', staffIds);

    const attendanceByStaffAndType = new Map<string, Map<string, Set<string>>>();
    for (const a of attendanceLeave || []) {
      if (!a.staff_id || !a.attendance_date) continue;
      const typeId = defaultLeaveTypeId;
      if (!attendanceByStaffAndType.has(a.staff_id)) {
        attendanceByStaffAndType.set(a.staff_id, new Map());
      }
      const byType = attendanceByStaffAndType.get(a.staff_id)!;
      if (!byType.has(typeId)) byType.set(typeId, new Set());
      byType.get(typeId)!.add(a.attendance_date);
    }

    const mergedByStaffAndType = new Map<string, Map<string, Set<string>>>();
    for (const staffId of staffIds) {
      mergedByStaffAndType.set(staffId, new Map());
      const out = mergedByStaffAndType.get(staffId)!;
      const reqMap = requestDaysByStaffAndType.get(staffId);
      const attMap = attendanceByStaffAndType.get(staffId);
      for (const lt of leaveTypes) {
        const tid = lt.id;
        const set = new Set<string>();
        const reqSet = reqMap?.get(tid);
        if (reqSet) reqSet.forEach((d) => set.add(d));
        const attSet = attMap?.get(tid);
        if (attSet) attSet.forEach((d) => set.add(d));
        if (set.size) out.set(tid, set);
      }
    }

    const staff = staffList.map(
      (s: {
        id: string;
        full_name: string;
        staff_id: string;
        department: string;
        role: string;
      }) => {
        const byType = mergedByStaffAndType.get(s.id);
        const leave_days: {
          leave_type_id: string;
          leave_type_abbr: string;
          leave_type_name: string;
          dates: string[];
        }[] = [];
        for (const lt of leaveTypes) {
          const datesSet = byType?.get(lt.id);
          if (!datesSet || datesSet.size === 0) continue;
          const inMonth = [...datesSet].filter(
            (d) => d >= startOfMonth && d <= endOfMonth
          );
          if (inMonth.length === 0) continue;
          inMonth.sort();
          leave_days.push({
            leave_type_id: lt.id,
            leave_type_abbr: lt.abbreviation,
            leave_type_name: lt.name,
            dates: inMonth,
          });
        }
        return {
          staff_id: s.id,
          staff_name: s.full_name,
          staff_id_display: s.staff_id,
          department: s.department || '',
          role: s.role || '',
          leave_days,
        };
      }
    );

    return NextResponse.json({ data: { staff } });
  } catch (error) {
    console.error('Error in GET /api/leave/staff-leave-detail:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
