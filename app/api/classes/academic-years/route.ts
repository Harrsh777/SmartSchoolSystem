import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/classes/academic-years
 * Get unique academic years from classes table for a school
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
    const { data: classes, error } = await supabase
      .from('classes')
      .select('academic_year')
      .eq('school_code', schoolCode);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch academic years', details: error.message },
        { status: 500 }
      );
    }

    // Get unique academic years and sort them (descending - newest first)
    const uniqueYears = Array.from(
      new Set((classes || []).map((c) => c.academic_year).filter(Boolean))
    ).sort((a, b) => {
      // Sort by year value (assuming format like "2025" or "2024-2025")
      // Extract first year for comparison
      const yearA = parseInt(a.split('-')[0] || a);
      const yearB = parseInt(b.split('-')[0] || b);
      return yearB - yearA; // Descending order
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
