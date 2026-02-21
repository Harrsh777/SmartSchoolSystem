import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import * as XLSX from 'xlsx';

/** Map status to code for grid: P=Present, A=Absent, L=Leave, H=Holiday, HD=Half day, -=not marked */
function statusToLetter(status: string | null | undefined): string {
  if (!status) return '-';
  const s = status.toLowerCase();
  if (s === 'present') return 'P';
  if (s === 'absent') return 'A';
  if (s === 'leave') return 'L';
  if (s === 'holiday') return 'H';
  if (s === 'half_day' || s === 'halfday') return 'HD';
  if (s === 'late') return 'P';
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
 * GET /api/reports/student-attendance-marking
 * Excel: Name, Admission No, Class-Section, one column per date (P/A/L/H/HD/-), PresentDay, AbsentDay, HalfDayDa, LeaveDays
 * Query: school_code, from_date, to_date, class, section
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const classParam = searchParams.get('class');
    const sectionParam = searchParams.get('section');

    if (!schoolCode || !fromDate || !toDate) {
      return NextResponse.json(
        { error: 'School code, from_date, and to_date are required' },
        { status: 400 }
      );
    }
    if (!classParam?.trim() || !sectionParam?.trim()) {
      return NextResponse.json(
        { error: 'Class and section are required for student attendance matrix report' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    const classVal = classParam.trim();
    const sectionVal = sectionParam.trim();

    function escapeIlike(value: string): string {
      return String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
    }

    let studentsQuery = supabase
      .from('students')
      .select('id, student_name, admission_no, class, section')
      .eq('school_code', schoolCode)
      .order('admission_no');
    studentsQuery = studentsQuery.ilike('class', escapeIlike(classVal));
    studentsQuery = studentsQuery.ilike('section', escapeIlike(sectionVal));

    const { data: students, error: studentsError } = await studentsQuery;

    if (studentsError) {
      return NextResponse.json(
        { error: 'Failed to fetch students', details: studentsError.message },
        { status: 500 }
      );
    }

    const studentList = students || [];
    if (studentList.length === 0) {
      return NextResponse.json(
        { error: 'No students found for this class and section' },
        { status: 404 }
      );
    }

    const studentIds = studentList.map((s: { id: string }) => s.id);
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('student_attendance')
      .select('student_id, attendance_date, status')
      .eq('school_code', schoolCode)
      .in('student_id', studentIds)
      .gte('attendance_date', fromDate)
      .lte('attendance_date', toDate);

    if (attendanceError) {
      return NextResponse.json(
        { error: 'Failed to fetch attendance', details: attendanceError.message },
        { status: 500 }
      );
    }

    const attendanceList = attendanceData || [];
    const dateRange = getDateRange(fromDate, toDate);

    const byStudentByDate = new Map<string, Map<string, string>>();
    attendanceList.forEach((record: { student_id: string; attendance_date: string; status: string }) => {
      const dateStr = record.attendance_date?.split('T')[0] || record.attendance_date;
      if (!byStudentByDate.has(record.student_id)) {
        byStudentByDate.set(record.student_id, new Map());
      }
      byStudentByDate.get(record.student_id)!.set(dateStr, record.status);
    });

    const headerRow: (string | number)[] = [
      'Name',
      'Admission No',
      'Class-Section',
      ...dateRange.map((d) => formatDateHeader(d)),
      'PresentDay',
      'AbsentDay',
      'HalfDayDa',
      'LeaveDays',
    ];

    const dataRows: (string | number)[][] = studentList.map(
      (student: { id: string; student_name?: string; admission_no?: string; class?: string; section?: string }) => {
        const dateMap = byStudentByDate.get(student.id) || new Map();
        let present = 0;
        let absent = 0;
        let halfDay = 0;
        let leave = 0;

        const dateLetters = dateRange.map((d) => {
          const status = dateMap.get(d);
          const letter = statusToLetter(status);
          if (letter === 'P') present++;
          else if (letter === 'A') absent++;
          else if (letter === 'HD') halfDay++;
          else if (letter === 'L') leave++;
          return letter;
        });

        const classSection = [student.class, student.section].filter(Boolean).join('-') || '-';

        return [
          student.student_name || '',
          student.admission_no || '',
          classSection,
          ...dateLetters,
          present,
          absent,
          halfDay,
          leave,
        ];
      }
    );

    const aoa = [headerRow, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const colWidths = [
      { wch: 22 },
      { wch: 14 },
      { wch: 14 },
      ...dateRange.map(() => ({ wch: 6 })),
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    const sheetName = `${classVal}-${sectionVal}`.replace(/[/\\?*\[\]]/g, '-');
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `student_attendance_${classVal}_${sectionVal}_${fromDate}_to_${toDate}.xlsx`;

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating student attendance report:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
