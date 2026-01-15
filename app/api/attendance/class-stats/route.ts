import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const classId = searchParams.get('class_id');
    const date = searchParams.get('date'); // Optional: specific date, defaults to today

    if (!schoolCode || !classId) {
      return NextResponse.json(
        { error: 'school_code and class_id are required' },
        { status: 400 }
      );
    }

    // Use provided date or default to today
    const targetDate = date || new Date().toISOString().split('T')[0];

    // First, get the total number of students in the class
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('class, section, academic_year')
      .eq('id', classId)
      .eq('school_code', schoolCode)
      .single();

    if (classError || !classData) {
      return NextResponse.json(
        { error: 'Class not found', details: classError?.message },
        { status: 404 }
      );
    }

    // Get all students in this class
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id')
      .eq('school_code', schoolCode)
      .eq('class', classData.class)
      .eq('section', classData.section)
      .eq('academic_year', classData.academic_year);

    if (studentsError) {
      return NextResponse.json(
        { error: 'Failed to fetch students', details: studentsError.message },
        { status: 500 }
      );
    }

    const totalStudents = students?.length || 0;

    // Fetch attendance for today (or specified date)
    const { data: attendance, error: attendanceError } = await supabase
      .from('student_attendance')
      .select('student_id, status')
      .eq('school_code', schoolCode)
      .eq('class_id', classId)
      .eq('attendance_date', targetDate);

    if (attendanceError) {
      return NextResponse.json(
        { error: 'Failed to fetch attendance statistics', details: attendanceError.message },
        { status: 500 }
      );
    }

    // Calculate statistics based on students, not attendance records
    const present = attendance?.filter(a => a.status === 'present').length || 0;
    const absent = attendance?.filter(a => a.status === 'absent').length || 0;
    const late = attendance?.filter(a => a.status === 'late').length || 0;
    
    // If attendance is marked for today, use that; otherwise, total is number of students
    const total = totalStudents > 0 ? totalStudents : (attendance?.length || 0);
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return NextResponse.json({
      data: {
        total,
        present,
        absent,
        late,
        percentage,
        date: targetDate,
        isMarked: (attendance?.length || 0) > 0,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching class attendance statistics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

