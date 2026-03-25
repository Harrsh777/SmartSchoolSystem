import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// GET - Fetch system-wide analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d, 1y, all
    const schoolCode = searchParams.get('school_code'); // Optional: filter by school

    const supabase = getServiceRoleClient();

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0); // All time
    }


    // Fetch analytics data in parallel
    const [
      schoolsResult,
      studentsResult,
      staffResult,
      classesResult,
      examsResult,
      feesResult,
      signupsResult,
    ] = await Promise.all([
      // Schools growth
      supabase
        .from('accepted_schools')
        .select('created_at, is_hold')
        .order('created_at', { ascending: false }),

      // Students growth
      supabase
        .from('students')
        .select('created_at, school_code')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false }),

      // Staff growth
      supabase
        .from('staff')
        .select('created_at, school_code')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false }),

      // Classes
      supabase
        .from('classes')
        .select('school_code')
        .order('created_at', { ascending: false }),

      // Exams
      supabase
        .from('examinations')
        .select('created_at, school_code')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false }),

      // Fees (revenue)
      supabase
        .from('fees')
        .select('payment_date, amount, school_code')
        .gte('payment_date', startDate.toISOString())
        .order('payment_date', { ascending: false }),

      // School signups
      supabase
        .from('school_signups')
        .select('created_at, status')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false }),
    ]);

    // Process data
    type CreatedAtRow = { created_at?: string | null };
    type CodeRow = CreatedAtRow & { school_code?: string | null };
    type SchoolRow = CodeRow & { is_hold?: boolean | null };
    type StatusRow = CreatedAtRow & { status?: string | null };

    const schools = (schoolsResult.data as SchoolRow[] | null | undefined) || [];
    const students = (studentsResult.data as CodeRow[] | null | undefined) || [];
    const staff = (staffResult.data as CodeRow[] | null | undefined) || [];
    const classes = (classesResult.data as Array<{ school_code?: string | null }> | null | undefined) || [];
    const exams = (examsResult.data as CodeRow[] | null | undefined) || [];
    const fees = (feesResult.data as Array<{ amount?: string | number | null; school_code?: string | null }> | null | undefined) || [];
    const signups = (signupsResult.data as StatusRow[] | null | undefined) || [];

    // Calculate growth trends (monthly)
    const monthlyGrowth = calculateMonthlyGrowth(schools, students, staff, signups);

    // Calculate revenue
    const totalRevenue = fees.reduce((sum, fee) => sum + (Number(fee.amount) || 0), 0);

    // School status breakdown
    const activeSchools = schools.filter((s) => !Boolean(s.is_hold)).length;
    const onHoldSchools = schools.filter((s) => Boolean(s.is_hold)).length;

    // Signup status breakdown
    const pendingSignups = signups.filter(s => s.status === 'pending').length;
    const acceptedSignups = signups.filter(s => s.status === 'approved').length;
    const rejectedSignups = signups.filter(s => s.status === 'rejected').length;

    // Top schools by activity
    const schoolActivity = calculateSchoolActivity(students, staff, exams, fees);
    const filteredSchoolActivity = schoolCode
      ? schoolActivity.filter((s) => s.school_code === schoolCode)
      : schoolActivity;

    return NextResponse.json({
      data: {
        overview: {
          totalSchools: schools.length,
          activeSchools,
          onHoldSchools,
          totalStudents: students.length,
          totalStaff: staff.length,
          totalClasses: classes.length,
          totalExams: exams.length,
          totalRevenue,
        },
        growth: {
          monthly: monthlyGrowth,
          newSchools: schools.filter((s) => s.created_at && new Date(s.created_at) >= startDate).length,
          newStudents: students.length,
          newStaff: staff.length,
        },
        signups: {
          pending: pendingSignups,
          accepted: acceptedSignups,
          rejected: rejectedSignups,
          total: signups.length,
        },
        topSchools: filteredSchoolActivity.slice(0, 10),
        period,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: (error as Error).message },
      { status: 500 }
    );
  }
}

function calculateMonthlyGrowth(
  schools: Array<{ created_at?: string | null }>,
  students: Array<{ created_at?: string | null }>,
  staff: Array<{ created_at?: string | null }>,
  signups: Array<{ created_at?: string | null }>
) {
  const months: Record<string, { schools: number; students: number; staff: number; signups: number }> = {};

  [...schools, ...students, ...staff, ...signups].forEach((item) => {
    if (!item.created_at) return;
    const date = new Date(item.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!months[monthKey]) {
      months[monthKey] = { schools: 0, students: 0, staff: 0, signups: 0 };
    }

    // Note: we can’t reliably use `includes()` with object identity across arrays,
    // but this is enough for a lightweight analytics visualization.
    if (item && schools.some((s) => s === item)) {
      months[monthKey].schools++;
    } else if (item && students.some((s) => s === item)) {
      months[monthKey].students++;
    } else if (item && staff.some((s) => s === item)) {
      months[monthKey].staff++;
    } else if (item && signups.some((s) => s === item)) {
      months[monthKey].signups++;
    }
  });

  return Object.entries(months)
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function calculateSchoolActivity(
  students: Array<{ school_code?: string | null }>,
  staff: Array<{ school_code?: string | null }>,
  exams: Array<{ school_code?: string | null }>,
  fees: Array<{ school_code?: string | null; amount?: unknown }>
) {
  const activity: Record<string, { students: number; staff: number; exams: number; revenue: number }> = {};

  students.forEach((s) => {
    const code = s.school_code;
    if (!code) return;
    if (!activity[code]) {
      activity[code] = { students: 0, staff: 0, exams: 0, revenue: 0 };
    }
    activity[code].students++;
  });

  staff.forEach((s) => {
    const code = s.school_code;
    if (!code) return;
    if (!activity[code]) {
      activity[code] = { students: 0, staff: 0, exams: 0, revenue: 0 };
    }
    activity[code].staff++;
  });

  exams.forEach((e) => {
    const code = e.school_code;
    if (!code) return;
    if (!activity[code]) {
      activity[code] = { students: 0, staff: 0, exams: 0, revenue: 0 };
    }
    activity[code].exams++;
  });

  fees.forEach((f) => {
    const code = f.school_code;
    if (!code) return;
    if (!activity[code]) {
      activity[code] = { students: 0, staff: 0, exams: 0, revenue: 0 };
    }
    activity[code].revenue += Number(f.amount) || 0;
  });

  return Object.entries(activity)
    .map(([schoolCode, data]) => ({
      school_code: schoolCode,
      ...data,
      activity_score: data.students + data.staff * 2 + data.exams * 3,
    }))
    .sort((a, b) => b.activity_score - a.activity_score);
}
