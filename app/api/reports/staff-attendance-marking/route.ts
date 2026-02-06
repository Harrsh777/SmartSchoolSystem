import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

/**
 * GET /api/reports/staff-attendance-marking
 * Generate Excel report for staff attendance marking
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const period = searchParams.get('period') || '30';
    const staffIdsParam = searchParams.get('staff_ids'); // optional comma-separated UUIDs

    if (!schoolCode || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'School code, start date, and end date are required' },
        { status: 400 }
      );
    }

    const filterStaffIds = staffIdsParam
      ? staffIdsParam.split(',').map((id) => id.trim()).filter(Boolean)
      : null;

    // Get school information
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

    // Fetch staff (all or filtered by staff_ids)
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

    // Fetch attendance records
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('staff_attendance')
      .select('staff_id, attendance_date, status')
      .eq('school_code', schoolCode)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .order('attendance_date', { ascending: true });

    if (attendanceError) {
      return NextResponse.json(
        { error: 'Failed to fetch attendance', details: attendanceError.message },
        { status: 500 }
      );
    }

    const staffMap = new Map((staffData || []).map((s) => [s.id, s]));
    const attendanceList = attendanceData || [];

    // Detailed rows: one per staff per date (Teacher Name, Date, Status), sorted by date then name
    const sortedDetailed = [...attendanceList]
      .sort((a, b) => {
        if (a.attendance_date !== b.attendance_date) return a.attendance_date.localeCompare(b.attendance_date);
        const nameA = staffMap.get(a.staff_id)?.full_name || '';
        const nameB = staffMap.get(b.staff_id)?.full_name || '';
        return nameA.localeCompare(nameB);
      })
      .map((record: { staff_id: string; attendance_date: string; status: string }) => {
        const staff = staffMap.get(record.staff_id);
        const dateStr = record.attendance_date?.split('T')[0] || record.attendance_date;
        const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
        const statusLabel = (record.status || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        return {
          'Staff ID': staff?.staff_id || '',
          'Teacher Name': staff?.full_name || '',
          'Role': staff?.role || '',
          'Department': staff?.department || '',
          'Date': formattedDate,
          'Status': statusLabel,
        };
      });

    // Summary per staff (for summary sheet)
    const staffSummaries = (staffData || []).map((staff) => {
      const staffAttendance = attendanceList.filter((record: { staff_id: string }) => record.staff_id === staff.id);
      const present = staffAttendance.filter((r: { status: string }) => r.status === 'present').length;
      const absent = staffAttendance.filter((r: { status: string }) => r.status === 'absent').length;
      const late = staffAttendance.filter((r: { status: string }) => r.status === 'late').length;
      const halfDay = staffAttendance.filter((r: { status: string }) => r.status === 'half_day').length;
      const leave = staffAttendance.filter((r: { status: string }) => r.status === 'leave').length;
      const totalDays = staffAttendance.length;
      const attendancePercentage = totalDays > 0 ? (present / totalDays) * 100 : 0;
      return {
        'Staff ID': staff.staff_id || '',
        'Full Name': staff.full_name || '',
        'Role': staff.role || '',
        'Department': staff.department || '',
        'Present': present,
        'Absent': absent,
        'Late': late,
        'Half Day': halfDay,
        'Leave': leave,
        'Total Days': totalDays,
        'Attendance %': Math.round(attendancePercentage * 100) / 100,
      };
    });
    staffSummaries.sort((a, b) => (b['Attendance %'] as number) - (a['Attendance %'] as number));

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Detailed Attendance (teacher name, date, status - one row per day per staff)
    const detailHeaderRows = [
      [schoolData.school_name || 'School Name'],
      ['Staff Attendance Report – Detailed (Name, Date, Status)'],
      [`Date Range: ${new Date(startDate).toLocaleDateString('en-GB')} - ${new Date(endDate).toLocaleDateString('en-GB')}`],
      [],
      ['Staff ID', 'Teacher Name', 'Role', 'Department', 'Date', 'Status'],
    ];
    const detailDataRows = sortedDetailed.map((row) => [
      row['Staff ID'],
      row['Teacher Name'],
      row['Role'],
      row['Department'],
      row['Date'],
      row['Status'],
    ]);
    const detailedWs = XLSX.utils.aoa_to_sheet([...detailHeaderRows, ...detailDataRows]);
    detailedWs['!cols'] = [
      { wch: 12 },
      { wch: 28 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, detailedWs, 'Detailed Attendance');

    // Sheet 2: Summary (totals per staff)
    const summaryWs = XLSX.utils.json_to_sheet(staffSummaries);
    summaryWs['!cols'] = [
      { wch: 12 },
      { wch: 25 },
      { wch: 20 },
      { wch: 20 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return Excel file
    const filename = `staff_attendance_report_${schoolCode}_${period}days_${new Date().toISOString().split('T')[0]}.xlsx`;
    
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
