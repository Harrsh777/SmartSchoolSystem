import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/classes/academic-years
 * Get unique academic years from classes table AND students table for a school (merged, deduplicated).
 */
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

    // Fetch unique academic years from classes table
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('academic_year')
      .eq('school_code', schoolCode);

    if (classesError) {
      return NextResponse.json(
        { error: 'Failed to fetch academic years', details: classesError.message },
        { status: 500 }
      );
    }

    // Fetch unique academic years from students table (so we show years that have students too)
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('academic_year')
      .eq('school_code', schoolCode)
      .not('academic_year', 'is', null);

    if (studentsError) {
      // Non-fatal: still return years from classes
    }

    const fromClasses = (classes || []).map((c) => c.academic_year).filter(Boolean);
    const fromStudents = (students || []).map((s) => s.academic_year).filter(Boolean);
    const uniqueYears = Array.from(new Set([...fromClasses, ...fromStudents])).sort((a, b) => {
      const yearA = parseInt(String(a).split('-')[0] || String(a), 10);
      const yearB = parseInt(String(b).split('-')[0] || String(b), 10);
      return yearB - yearA;
    });

    return NextResponse.json({ data: uniqueYears }, { status: 200 });
  } catch (error) {
    console.error('Error fetching academic years:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
