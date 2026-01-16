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

    // Fetch student count
    const { count: studentCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode);

    // Fetch staff count
    const { count: staffCount } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode);

    // Get today's date string (used for exams and attendance queries)
    const today = new Date().toISOString().split('T')[0];

    // Fetch upcoming exams from examinations table
    // Upcoming exams are those with status 'upcoming' or 'ongoing' and start_date >= today
    const { data: upcomingExams } = await supabase
      .from('examinations')
      .select('id')
      .eq('school_code', schoolCode)
      .in('status', ['upcoming', 'ongoing'])
      .gte('start_date', today)
      .order('start_date', { ascending: true })
      .limit(10);

    // Fetch recent notices (active notices, ordered by publish_at)
    const { data: recentNotices } = await supabase
      .from('notices')
      .select('id')
      .eq('school_code', schoolCode)
      .eq('status', 'Active')
      .order('publish_at', { ascending: false })
      .limit(10);

    // Calculate today's student attendance
    const { data: todayStudentAttendance, count: studentAttendanceCount } = await supabase
      .from('student_attendance')
      .select('status', { count: 'exact' })
      .eq('school_code', schoolCode)
      .eq('attendance_date', today);

    const totalStudentMarked = studentAttendanceCount || 0;
    const presentStudentCount = todayStudentAttendance?.filter(a => a.status === 'present').length || 0;
    const studentAttendancePercentage = totalStudentMarked > 0 ? Math.round((presentStudentCount / totalStudentMarked) * 100) : 0;

    // Calculate today's staff attendance
    const { data: todayStaffAttendance, count: staffAttendanceCount } = await supabase
      .from('staff_attendance')
      .select('status', { count: 'exact' })
      .eq('school_code', schoolCode)
      .eq('attendance_date', today);

    const totalStaffMarked = staffAttendanceCount || 0;
    const presentStaffCount = todayStaffAttendance?.filter(a => a.status === 'present').length || 0;
    const staffAttendancePercentage = totalStaffMarked > 0 ? Math.round((presentStaffCount / totalStaffMarked) * 100) : 0;

    // Calculate fee collection (if fees table exists)
    let feeCollected = 0;
    let todayCollection = 0;
    let monthlyCollection = 0;
    try {
      const { data: feesData, error: feesError } = await supabase
        .from('fees')
        .select('total_amount, amount, payment_date')
        .eq('school_code', schoolCode);
      
      if (!feesError && feesData) {
        // Use total_amount if available (includes transport fee), otherwise use amount
        feeCollected = feesData.reduce((sum, f) => {
          const feeAmount = f.total_amount || f.amount || 0;
          return sum + Number(feeAmount);
        }, 0);

        // Calculate today's collection
        todayCollection = feesData
          .filter(f => f.payment_date === today)
          .reduce((sum, f) => {
            const feeAmount = f.total_amount || f.amount || 0;
            return sum + Number(feeAmount);
          }, 0);

        // Calculate monthly collection (this month)
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        monthlyCollection = feesData
          .filter(f => f.payment_date && f.payment_date >= firstDayOfMonth && f.payment_date <= lastDayOfMonth)
          .reduce((sum, f) => {
            const feeAmount = f.total_amount || f.amount || 0;
            return sum + Number(feeAmount);
          }, 0);
      }
    } catch (err) {
      // Fees table might not exist, that's okay
      console.log('Fees table not available:', err);
    }

    const stats = {
      totalStudents: studentCount || 0,
      totalStaff: staffCount || 0,
      feeCollection: {
        collected: feeCollected,
        total: feeCollected, // Total is same as collected since all fees are paid when recorded
        todayCollection,
        monthlyCollection,
      },
      todayAttendance: {
        percentage: studentAttendancePercentage,
        present: presentStudentCount,
        students: {
          present: presentStudentCount,
          total: totalStudentMarked,
          percentage: studentAttendancePercentage,
        },
        staff: {
          present: presentStaffCount,
          total: totalStaffMarked,
          percentage: staffAttendancePercentage,
        },
      },
      upcomingExams: upcomingExams?.length || 0,
      recentNotices: recentNotices?.length || 0,
    };

    return NextResponse.json({ data: stats }, { status: 200 });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

