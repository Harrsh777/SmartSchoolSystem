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
    const { count: studentCount, error: studentsError } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode);

    // Fetch staff count
    const { count: staffCount, error: staffError } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode);

    // Fetch upcoming exams (exams with start_date >= today)
    const today = new Date().toISOString().split('T')[0];
    const { data: upcomingExams, error: examsError } = await supabase
      .from('exams')
      .select('id')
      .eq('school_code', schoolCode)
      .eq('status', 'scheduled')
      .gte('start_date', today)
      .order('start_date', { ascending: true })
      .limit(10);

    // Fetch recent notices (active notices, ordered by publish_at)
    const { data: recentNotices, error: noticesError } = await supabase
      .from('notices')
      .select('id')
      .eq('school_code', schoolCode)
      .eq('status', 'Active')
      .order('publish_at', { ascending: false })
      .limit(10);

    // For fee collection and attendance, return 0 for now (these modules may not exist yet)
    const stats = {
      totalStudents: studentCount || 0,
      totalStaff: staffCount || 0,
      feeCollection: {
        collected: 0,
        total: 0,
      },
      todayAttendance: {
        percentage: 0,
        present: 0,
      },
      upcomingExams: upcomingExams?.length || 0,
      recentNotices: recentNotices?.length || 0,
    };

    return NextResponse.json({ data: stats }, { status: 200 });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

