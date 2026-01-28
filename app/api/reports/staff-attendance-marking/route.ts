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

    if (!schoolCode || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'School code, start date, and end date are required' },
        { status: 400 }
      );
    }

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

    // Fetch all staff
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, staff_id, full_name, role, department')
      .eq('school_code', schoolCode)
      .order('full_name');

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
      .lte('attendance_date', endDate);

    if (attendanceError) {
      return NextResponse.json(
        { error: 'Failed to fetch attendance', details: attendanceError.message },
        { status: 500 }
      );
    }

    // Calculate summaries
    const staffSummaries = (staffData || []).map((staff) => {
      const staffAttendance = (attendanceData || []).filter(
        (record) => record.staff_id === staff.id
      );

      const present = staffAttendance.filter((r) => r.status === 'present').length;
      const absent = staffAttendance.filter((r) => r.status === 'absent').length;
      const late = staffAttendance.filter((r) => r.status === 'late').length;
      const halfDay = staffAttendance.filter((r) => r.status === 'half_day').length;
      const leave = staffAttendance.filter((r) => r.status === 'leave').length;
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

    // Sort by attendance percentage (descending)
    staffSummaries.sort((a, b) => (b['Attendance %'] as number) - (a['Attendance %'] as number));

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Add header information
    const headerData = [
      [schoolData.school_name || 'School Name'],
      ['Staff Attendance Marking Report'],
      [`Period: Last ${period} Days`],
      [`Report Date: ${new Date().toLocaleDateString()}`],
      [`Date Range: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`],
      [], // Empty row
    ];

    // Add summary row
    const totalPresent = staffSummaries.reduce((sum, s) => sum + (s['Present'] as number), 0);
    const totalAbsent = staffSummaries.reduce((sum, s) => sum + (s['Absent'] as number), 0);
    const avgAttendance = staffSummaries.length > 0
      ? Math.round(
          (staffSummaries.reduce((sum, s) => sum + (s['Attendance %'] as number), 0) / staffSummaries.length) * 100
        ) / 100
      : 0;

    headerData.push(
      ['Summary'],
      [`Total Staff: ${staffSummaries.length}`],
      [`Total Present Days: ${totalPresent}`],
      [`Total Absent Days: ${totalAbsent}`],
      [`Average Attendance: ${avgAttendance}%`],
      [] // Empty row
    );

    // Create header sheet
    const headerWs = XLSX.utils.aoa_to_sheet(headerData);
    
    // Set column widths for header
    headerWs['!cols'] = [{ wch: 50 }];
    
    // Merge cells for title
    if (!headerWs['!merges']) headerWs['!merges'] = [];
    headerWs['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } });
    headerWs['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 10 } });
    
    XLSX.utils.book_append_sheet(wb, headerWs, 'Report Info');

    // Create main data sheet
    const ws = XLSX.utils.json_to_sheet(staffSummaries);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // Staff ID
      { wch: 25 }, // Full Name
      { wch: 20 }, // Role
      { wch: 20 }, // Department
      { wch: 10 }, // Present
      { wch: 10 }, // Absent
      { wch: 10 }, // Late
      { wch: 10 }, // Half Day
      { wch: 10 }, // Leave
      { wch: 12 }, // Total Days
      { wch: 15 }, // Attendance %
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');

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
