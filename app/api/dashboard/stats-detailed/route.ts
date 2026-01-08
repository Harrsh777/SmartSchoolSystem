import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Get school ID
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', schoolCode)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // schoolId kept for potential future use
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const schoolId = schoolData.id;

    // Fetch all students for this school
    const { data: allStudents } = await supabase
      .from('students')
      .select('first_name, last_name, gender, created_at')
      .eq('school_code', schoolCode);

    // Calculate gender split
    const totalStudents = allStudents?.length || 0;
    const maleCount = allStudents?.filter(s => s.gender?.toLowerCase() === 'male').length || 0;
    const femaleCount = allStudents?.filter(s => s.gender?.toLowerCase() === 'female').length || 0;
    const otherCount = totalStudents - maleCount - femaleCount;

    // New admissions (last 3 days)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const newAdmissions = allStudents?.filter(s => {
      if (!s.created_at) return false;
      const createdDate = new Date(s.created_at);
      return createdDate >= threeDaysAgo;
    }) || [];

    // Fetch staff for role breakdown and gender stats
    const { data: allStaff } = await supabase
      .from('staff')
      .select('role, gender')
      .eq('school_code', schoolCode);

    const teachingStaff = allStaff?.filter(s => 
      s.role?.toLowerCase().includes('teacher') || 
      s.role?.toLowerCase().includes('professor') ||
      s.role?.toLowerCase().includes('lecturer')
    ).length || 0;
    const nonTeachingStaff = (allStaff?.length || 0) - teachingStaff;

    // Calculate staff gender split
    const totalStaff = allStaff?.length || 0;
    const staffMaleCount = allStaff?.filter(s => s.gender?.toLowerCase() === 'male').length || 0;
    const staffFemaleCount = allStaff?.filter(s => s.gender?.toLowerCase() === 'female').length || 0;
    const staffOtherCount = totalStaff - staffMaleCount - staffFemaleCount;

    // Calculate attendance rate for today
    const today = new Date().toISOString().split('T')[0];
    const { data: todayAttendance } = await supabase
      .from('student_attendance')
      .select('status')
      .eq('school_code', schoolCode)
      .eq('attendance_date', today);

    const totalMarked = todayAttendance?.length || 0;
    const presentCount = todayAttendance?.filter(a => a.status === 'present').length || 0;
    const attendanceRate = totalMarked > 0 ? (presentCount / totalMarked) * 100 : 0;

    return NextResponse.json({
      data: {
        genderStats: {
          total: totalStudents,
          male: maleCount,
          female: femaleCount,
          other: otherCount,
          malePercent: totalStudents > 0 ? Math.round((maleCount / totalStudents) * 100 * 10) / 10 : 0,
          femalePercent: totalStudents > 0 ? Math.round((femaleCount / totalStudents) * 100 * 10) / 10 : 0,
          otherPercent: totalStudents > 0 ? Math.round((otherCount / totalStudents) * 100 * 10) / 10 : 0,
        },
        newAdmissions: newAdmissions.length,
        newAdmissionsList: newAdmissions.slice(0, 5).map(s => ({
          name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'New Student',
          gender: s.gender || 'Unknown',
          date: s.created_at,
        })),
        staffBreakdown: {
          teaching: teachingStaff,
          nonTeaching: nonTeachingStaff,
          total: allStaff?.length || 0,
        },
        staffGenderStats: {
          total: totalStaff,
          male: staffMaleCount,
          female: staffFemaleCount,
          other: staffOtherCount,
          malePercent: totalStaff > 0 ? Math.round((staffMaleCount / totalStaff) * 100 * 10) / 10 : 0,
          femalePercent: totalStaff > 0 ? Math.round((staffFemaleCount / totalStaff) * 100 * 10) / 10 : 0,
          otherPercent: totalStaff > 0 ? Math.round((staffOtherCount / totalStaff) * 100 * 10) / 10 : 0,
        },
        attendanceRate,
        todayAttendance: {
          total: totalMarked,
          present: presentCount,
          percentage: attendanceRate,
        },
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching detailed stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

