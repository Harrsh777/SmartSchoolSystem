import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

/** Map status to single-letter code for grid: P=Present, A=Absent, L=Leave, H=Half day, -=not marked */
function statusToLetter(status: string | null | undefined): string {
  if (!status) return '-';
  const s = status.toLowerCase();
  if (s === 'present') return 'P';
  if (s === 'absent') return 'A';
  if (s === 'leave') return 'L';
  if (s === 'half_day' || s === 'halfday') return 'H';
  if (s === 'late') return 'P'; // treat late as present in report
  if (s === 'holiday') return 'L'; // or use a different code if needed
  return '-';
}

/** Format date as DD-MM-YYYY for column header */
function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/** Get all dates between start and end (inclusive), as YYYY-MM-DD */
function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const d = new Date(start);
  while (d <= end) {
    dates.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

/**
 * GET /api/reports/staff-attendance-marking
 * Generate Excel report: grid format (Name, Emp.Code, Designation, one column per date with P/A/L/H/-, then PresentDa, AbsentDay, HalfDayDa, LeaveDays)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const staffIdsParam = searchParams.get('staff_ids');

    if (!schoolCode || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'School code, start date, and end date are required' },
        { status: 400 }
      );
    }

    const filterStaffIds = staffIdsParam
      ? staffIdsParam.split(',').map((id) => id.trim()).filter(Boolean)
      : null;

    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('school_name, school_code')
      .eq('school_code', schoolCode)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    let staffQuery = supabase
      .from('staff')
      .select('id, staff_id, full_name, role, department')
      .eq('school_code', schoolCode)
      .order('full_name');

    if (filterStaffIds && filterStaffIds.length > 0) {
      staffQuery = staffQuery.in('id', filterStaffIds);
    }

    const { data: staffData, error: staffError } = await staffQuery;

    if (staffError) {
      return NextResponse.json(
        { error: 'Failed to fetch staff', details: staffError.message },
        { status: 500 }
      );
    }

    const { data: attendanceData, error: attendanceError } = await supabase
      .from('staff_attendance')
      .select('staff_id, attendance_date, status')
      .eq('school_code', schoolCode)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate);

    if (attendanceError) {
      return NextResponse.json(
        { error: 'Failed to fetch attendance', details: attendanceError.message },
        { status: 500 }
      );
    }

    const attendanceList = attendanceData || [];
    const dateRange = getDateRange(startDate, endDate);

    // Map: staff_id -> date (YYYY-MM-DD) -> status
    const byStaffByDate = new Map<string, Map<string, string>>();
    attendanceList.forEach((record: { staff_id: string; attendance_date: string; status: string }) => {
      const dateStr = record.attendance_date?.split('T')[0] || record.attendance_date;
      if (!byStaffByDate.has(record.staff_id)) {
        byStaffByDate.set(record.staff_id, new Map());
      }
      byStaffByDate.get(record.staff_id)!.set(dateStr, record.status);
    });

    // Build grid: one row per staff
    // Header: Name, Emp.Code, Designatic, ...date columns..., PresentDa, AbsentDay, HalfDayDa, LeaveDays
    const headerRow: (string | number)[] = [
      'Name',
      'Emp.Code',
      'Designatic',
      ...dateRange.map((d) => formatDateHeader(d)),
      'PresentDa',
      'AbsentDay',
      'HalfDayDa',
      'LeaveDays',
    ];

    const dataRows: (string | number)[][] = (staffData || []).map((staff: { id: string; staff_id?: string; full_name?: string; role?: string; department?: string }) => {
      const dateMap = byStaffByDate.get(staff.id) || new Map();
      let present = 0;
      let absent = 0;
      let halfDay = 0;
      let leave = 0;

      const dateLetters = dateRange.map((d) => {
        const status = dateMap.get(d);
        const letter = statusToLetter(status);
        if (letter === 'P') present++;
        else if (letter === 'A') absent++;
        else if (letter === 'H') halfDay++;
        else if (letter === 'L') leave++;
        return letter;
      });

      const designation = [staff.role, staff.department].filter(Boolean).join(' - ') || '-';

      return [
        staff.full_name || '',
        staff.staff_id || '',
        designation,
        ...dateLetters,
        present,
        absent,
        halfDay,
        leave,
      ];
    });

    const aoa = [headerRow, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    const colWidths = [
      { wch: 22 },
      { wch: 12 },
      { wch: 18 },
      ...dateRange.map(() => ({ wch: 5 })),
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff Attendance');

    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `staff_attendance_marking_report_${schoolCode}_${startDate}_to_${endDate}.xlsx`;

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating staff attendance report:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
