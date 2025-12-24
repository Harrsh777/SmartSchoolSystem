import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(_request: NextRequest) {
  try {
    // Fetch all students for gender stats
    const { data: allStudents } = await supabase
      .from('students')
      .select('first_name, last_name, gender, created_at');

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

    // Fetch staff for role breakdown
    const { data: allStaff } = await supabase
      .from('staff')
      .select('role');

    const teachingStaff = allStaff?.filter(s => 
      s.role?.toLowerCase().includes('teacher') || 
      s.role?.toLowerCase().includes('professor') ||
      s.role?.toLowerCase().includes('lecturer')
    ).length || 0;
    const nonTeachingStaff = (allStaff?.length || 0) - teachingStaff;

    // Calculate attendance rate (mock data for now - would need actual attendance data)
    const attendanceRate = 87.5; // This would come from actual attendance calculations

    return NextResponse.json({
      data: {
        genderStats: {
          total: totalStudents,
          male: maleCount,
          female: femaleCount,
          other: otherCount,
          malePercent: totalStudents > 0 ? Math.round((maleCount / totalStudents) * 100) : 0,
          femalePercent: totalStudents > 0 ? Math.round((femaleCount / totalStudents) * 100) : 0,
        },
        newAdmissions: newAdmissions.length,
        newAdmissionsList: newAdmissions.slice(0, 5).map(s => ({
          name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'New Student',
          date: s.created_at,
        })),
        staffBreakdown: {
          teaching: teachingStaff,
          nonTeaching: nonTeachingStaff,
          total: allStaff?.length || 0,
        },
        attendanceRate,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

