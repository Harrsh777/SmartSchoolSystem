import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(_request: NextRequest) {
  try {
    // Fetch all schools
    const { data: schools, error: schoolsError } = await supabase
      .from('accepted_schools')
      .select('id, school_name, school_code, city, country, created_at')
      .order('created_at', { ascending: false });

    if (schoolsError) {
      return NextResponse.json(
        { error: 'Failed to fetch schools', details: schoolsError.message },
        { status: 500 }
      );
    }

    const schoolIds = (schools || []).map((s) => s.id);

    // Helper to build count map from fetched records
    const buildCountMap = (
      rows: any[] | null,
      key: string
    ): Record<string, number> => {
      const map: Record<string, number> = {};
      (rows || []).forEach((row) => {
        const id = row[key];
        map[id] = (map[id] || 0) + 1;
      });
      return map;
    };

    // Fetch all records and count them manually (more reliable than aggregation)
    // Only fetch if we have schools
    let allStudents: any[] = [];
    let allStaff: any[] = [];
    let allClasses: any[] = [];
    let allExams: any[] = [];
    let allNotices: any[] = [];

    if (schoolIds.length > 0) {
      const [
        { data: studentsData },
        { data: staffData },
        { data: classesData },
        { data: examsData },
        { data: noticesData },
      ] = await Promise.all([
        supabase
          .from('students')
          .select('school_id')
          .in('school_id', schoolIds),
        supabase
          .from('staff')
          .select('school_id')
          .in('school_id', schoolIds),
        supabase
          .from('classes')
          .select('school_id')
          .in('school_id', schoolIds),
        supabase
          .from('exams')
          .select('school_id')
          .in('school_id', schoolIds),
        supabase
          .from('notices')
          .select('school_id')
          .in('school_id', schoolIds),
      ]);

      allStudents = studentsData || [];
      allStaff = staffData || [];
      allClasses = classesData || [];
      allExams = examsData || [];
      allNotices = noticesData || [];
    }

    // Build count maps
    const studentsMap = buildCountMap(allStudents, 'school_id');
    const staffMap = buildCountMap(allStaff, 'school_id');
    const classesMap = buildCountMap(allClasses, 'school_id');
    const examsMap = buildCountMap(allExams, 'school_id');
    const noticesMap = buildCountMap(allNotices, 'school_id');

    // Global counts - use count option for efficiency
    const [
      { count: totalStudents },
      { count: totalStaff },
      { count: totalClasses },
      { count: totalExams },
    ] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }),
      supabase.from('staff').select('*', { count: 'exact', head: true }),
      supabase.from('classes').select('*', { count: 'exact', head: true }),
      supabase.from('exams').select('*', { count: 'exact', head: true }),
    ]);

    const overview = {
      totals: {
        schools: schools?.length || 0,
        students: totalStudents || 0,
        staff: totalStaff || 0,
        classes: totalClasses || 0,
        exams: totalExams || 0,
      },
      schools: (schools || []).map((s) => ({
        id: s.id,
        school_name: s.school_name,
        school_code: s.school_code,
        city: s.city,
        country: s.country,
        created_at: s.created_at,
        students: studentsMap[s.id] || 0,
        staff: staffMap[s.id] || 0,
        classes: classesMap[s.id] || 0,
        exams: examsMap[s.id] || 0,
        notices: noticesMap[s.id] || 0,
      })),
    };

    return NextResponse.json({ data: overview }, { status: 200 });
  } catch (error) {
    console.error('Error fetching admin overview:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


