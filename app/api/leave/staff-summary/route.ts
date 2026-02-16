import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/leave/staff-summary?school_code=...&month=YYYY-MM&leave_type_id=...&department=...&staff_name=...
 * Returns per-staff leave usage: from approved requests + attendance-marked leave.
 * Limits are per leave type (max_days = max per month from leave_types).
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
    const month = searchParams.get('month'); // YYYY-MM
    const leaveTypeId = searchParams.get('leave_type_id');
    const department = searchParams.get('department');
    const staffName = searchParams.get('staff_name');

    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    const [startOfMonth, endOfMonth] = month
      ? (() => {
          const [y, m] = month.split('-').map(Number);
          const start = new Date(y, m - 1, 1);
          const end = new Date(y, m, 0);
          return [start.toISOString().split('T')[0], end.toISOString().split('T')[0]];
        })()
      : [null, null];

    // Leave types (id, name, abbreviation, max_days = max per month)
    // Do not filter by is_active so staff list shows even if column is missing or all false
    const { data: leaveTypes, error: typesErr } = await supabase
      .from('leave_types')
      .select('id, abbreviation, name, max_days')
      .eq('school_code', schoolCode);

    if (typesErr || !leaveTypes?.length) {
      return NextResponse.json({ data: { staff: [], leaveTypes: [] } });
    }

    // All staff
    let staffQuery = supabase
      .from('staff')
      .select('id, full_name, staff_id, department, role')
      .eq('school_code', schoolCode);
    if (department) {
      staffQuery = staffQuery.ilike('department', `%${department}%`);
    }
    const { data: staffList, error: staffErr } = await staffQuery.order('full_name');
    if (staffErr || !staffList?.length) {
      return NextResponse.json({ data: { staff: [], leaveTypes } });
    }

    const staffIds = staffList.map((s: { id: string }) => s.id);
    const defaultLeaveTypeId = leaveTypes[0]?.id;

    // Approved staff leave requests (expand to dates)
    const { data: requests } = await supabase
      .from('staff_leave_requests')
      .select('staff_id, leave_type_id, leave_start_date, leave_end_date, total_days')
      .eq('school_code', schoolCode)
      .eq('status', 'approved')
      .in('staff_id', staffIds);

    const requestDaysByStaffAndType = new Map<string, Map<string, Set<string>>>(); // staffId -> leaveTypeId -> Set<date>
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

    // Staff attendance status = 'leave' (no leave_type in attendance; assign to default type)
    const attStart = startOfMonth || '2000-01-01';
    const attEnd = endOfMonth || '2099-12-31';
    const { data: attendanceLeave } = await supabase
      .from('staff_attendance')
      .select('staff_id, attendance_date')
      .eq('school_code', schoolCode)
      .eq('status', 'leave')
      .gte('attendance_date', attStart)
      .lte('attendance_date', attEnd)
      .in('staff_id', staffIds);

    // Attendance-marked leave overrides request for same date: use a single set per (staff, type).
    // We assign attendance leave to default leave type.
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

    // Merge: for each staff+type, union request dates and attendance dates (same date = 1 day)
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

    // Build summary per staff
    const staff = staffList
      .map((s: { id: string; full_name: string; staff_id: string; department: string; role: string }) => {
        const byType = mergedByStaffAndType.get(s.id);
        const leaveSummary: Record<string, { name: string; abbr: string; maxPerMonth: number | null; taken: number; takenThisMonth: number; remaining: number }> = {};
        for (const lt of leaveTypes) {
          const dates = byType?.get(lt.id) ?? new Set<string>();
          const taken = dates.size;
          const takenThisMonth =
            startOfMonth && endOfMonth
              ? [...dates].filter((d) => d >= startOfMonth && d <= endOfMonth).length
              : taken;
          const maxPerMonth = lt.max_days != null ? Number(lt.max_days) : null;
          const remaining = maxPerMonth != null ? Math.max(0, maxPerMonth - takenThisMonth) : 0;
          leaveSummary[lt.id] = {
            name: lt.name,
            abbr: lt.abbreviation,
            maxPerMonth,
            taken,
            takenThisMonth,
            remaining,
          };
        }
        return {
          staff_id: s.id,
          staff_name: s.full_name,
          staff_id_display: s.staff_id,
          department: s.department || '',
          role: s.role || '',
          leave_summary: leaveSummary,
        };
      })
      .filter((s: { staff_name: string }) => {
        if (!staffName) return true;
        return String(s.staff_name).toLowerCase().includes(String(staffName).toLowerCase());
      })
      .filter((s: { leave_summary: Record<string, { taken: number }> }) => {
        if (!leaveTypeId) return true;
        const sum = s.leave_summary[leaveTypeId];
        return sum && sum.taken > 0;
      });

    return NextResponse.json({
      data: {
        staff,
        leaveTypes: leaveTypes.map((lt: { id: string; name: string; abbreviation: string; max_days: number | null }) => ({
          id: lt.id,
          name: lt.name,
          abbreviation: lt.abbreviation,
          max_days_per_month: lt.max_days,
        })),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/leave/staff-summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
