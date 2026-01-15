import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/attendance/student-monthly
 * Get student attendance for a class and month (calendar view)
 * Supports both single class (class_id) and all classes (class_id='all')
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const classId = searchParams.get('class_id');
    const month = searchParams.get('month'); // Format: YYYY-MM (e.g., 2024-09)

    if (!schoolCode || !month) {
      return NextResponse.json(
        { error: 'school_code and month are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Parse month to get start and end dates
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Generate all dates in the month
    const dates: string[] = [];
    for (let day = 1; day <= lastDay; day++) {
      const date = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dates.push(date);
    }

    // If class_id is 'all', fetch data for all classes
    if (classId === 'all' || !classId) {
      // Get all classes
      const { data: allClasses, error: classesError } = await supabase
        .from('classes')
        .select('id, class, section, academic_year')
        .eq('school_code', schoolCode)
        .order('class', { ascending: true })
        .order('section', { ascending: true });

      if (classesError) {
        return NextResponse.json(
          { error: 'Failed to fetch classes', details: classesError.message },
          { status: 500 }
        );
      }

      const classesData: Array<Record<string, unknown>> = [];
      
      // Process each class
      for (const classItem of allClasses || []) {
        // Get all students in the class
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select('id, roll_number, student_name, admission_no, class, section')
          .eq('school_code', schoolCode)
          .eq('class', classItem.class)
          .eq('section', classItem.section)
          .eq('academic_year', classItem.academic_year)
          .order('roll_number', { ascending: true });

        if (studentsError) {
          console.error(`Error fetching students for class ${classItem.class}-${classItem.section}:`, studentsError);
          continue;
        }

        // Get attendance records for the month
        const { data: attendance, error: attendanceError } = await supabase
          .from('student_attendance')
          .select('student_id, attendance_date, status, class_id')
          .eq('school_code', schoolCode)
          .eq('class_id', classItem.id)
          .gte('attendance_date', startDate)
          .lte('attendance_date', endDate);

        if (attendanceError) {
          console.error(`Error fetching attendance for class ${classItem.class}-${classItem.section}:`, attendanceError);
          continue;
        }

        // Create a map of attendance by student_id and date
        const attendanceMap = new Map<string, Map<string, string>>();
        (attendance || []).forEach((record: { student_id: string; attendance_date: string; status: string }) => {
          if (!attendanceMap.has(record.student_id)) {
            attendanceMap.set(record.student_id, new Map());
          }
          const date = record.attendance_date.split('T')[0];
          attendanceMap.get(record.student_id)!.set(date, record.status);
        });

        // Build student attendance matrix
        const studentAttendance = (students || []).map((student) => {
          const studentAttendanceMap = attendanceMap.get(student.id) || new Map();
          const attendanceByDate: Record<string, string> = {};
          
          dates.forEach((date) => {
            const status = studentAttendanceMap.get(date);
            attendanceByDate[date] = status || 'not_marked';
          });

          return {
            student_id: student.id,
            roll_number: student.roll_number || '',
            student_name: student.student_name || '',
            admission_no: student.admission_no || '',
            attendance: attendanceByDate,
          };
        });

        classesData.push({
          class: {
            id: classItem.id,
            class: classItem.class,
            section: classItem.section,
            academic_year: classItem.academic_year,
          },
          student_attendance: studentAttendance,
        });
      }

      return NextResponse.json({
        data: {
          month: month,
          dates: dates,
          classes: classesData,
        },
      }, { status: 200 });
    } else {
      // Single class mode
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('class, section, academic_year')
        .eq('id', classId)
        .eq('school_code', schoolCode)
        .single();

      if (classError || !classData) {
        return NextResponse.json(
          { error: 'Class not found' },
          { status: 404 }
        );
      }

      // Get all students in the class
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, roll_number, student_name, admission_no, class, section')
        .eq('school_code', schoolCode)
        .eq('class', classData.class)
        .eq('section', classData.section)
        .eq('academic_year', classData.academic_year)
        .order('roll_number', { ascending: true });

      if (studentsError) {
        return NextResponse.json(
          { error: 'Failed to fetch students', details: studentsError.message },
          { status: 500 }
        );
      }

      // Get attendance records for the month
      const { data: attendance, error: attendanceError } = await supabase
        .from('student_attendance')
        .select('student_id, attendance_date, status')
        .eq('school_code', schoolCode)
        .eq('class_id', classId)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate);

      if (attendanceError) {
        return NextResponse.json(
          { error: 'Failed to fetch attendance', details: attendanceError.message },
          { status: 500 }
        );
      }

      // Create a map of attendance by student_id and date
      const attendanceMap = new Map<string, Map<string, string>>();
      (attendance || []).forEach((record: { student_id: string; attendance_date: string; status: string }) => {
        if (!attendanceMap.has(record.student_id)) {
          attendanceMap.set(record.student_id, new Map());
        }
        const date = record.attendance_date.split('T')[0];
        attendanceMap.get(record.student_id)!.set(date, record.status);
      });

      // Build response with student attendance matrix
      const studentAttendance = (students || []).map((student) => {
        const studentAttendanceMap = attendanceMap.get(student.id) || new Map();
        const attendanceByDate: Record<string, string> = {};
        
        dates.forEach((date) => {
          const status = studentAttendanceMap.get(date);
          attendanceByDate[date] = status || 'not_marked';
        });

        return {
          student_id: student.id,
          roll_number: student.roll_number || '',
          student_name: student.student_name || '',
          admission_no: student.admission_no || '',
          attendance: attendanceByDate,
        };
      });

      return NextResponse.json({
        data: {
          class: {
            id: classId,
            class: classData.class,
            section: classData.section,
            academic_year: classData.academic_year,
          },
          month: month,
          dates: dates,
          student_attendance: studentAttendance,
        },
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Error in GET /api/attendance/student-monthly:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
