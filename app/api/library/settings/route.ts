import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePermission } from '@/lib/api-permissions';

/**
 * GET /api/library/settings
 * Get library settings for a school
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

    const { data: settings, error } = await supabase
      .from('library_settings')
      .select('*')
      .eq('school_code', schoolCode)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Failed to fetch settings', details: error.message },
        { status: 500 }
      );
    }

    // Return default settings if not found
    if (!settings) {
      return NextResponse.json({
        data: {
          borrow_days: 14,
          max_books_student: 3,
          max_books_staff: 5,
          late_fine_per_day: 0,
          late_fine_fixed: 0,
          lost_book_fine: 0,
          damaged_book_fine: 0,
        },
      }, { status: 200 });
    }

    return NextResponse.json({ data: settings }, { status: 200 });
  } catch (error) {
    console.error('Error fetching library settings:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/library/settings
 * Create or update library settings
 */
export async function POST(request: NextRequest) {
  // Check permission
  const permissionCheck = await requirePermission(request, 'manage_library');
  if (permissionCheck) {
    return permissionCheck;
  }

  try {
    const body = await request.json();
    const {
      school_code,
      borrow_days,
      max_books_student,
      max_books_staff,
      late_fine_per_day,
      late_fine_fixed,
      lost_book_fine,
      damaged_book_fine,
    } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Validate: Either per-day OR fixed late fine, not both
    if (late_fine_per_day > 0 && late_fine_fixed > 0) {
      return NextResponse.json(
        { error: 'Please set either per-day fine OR fixed fine, not both' },
        { status: 400 }
      );
    }

    // Get school ID
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Upsert settings
    const { data: settings, error: upsertError } = await supabase
      .from('library_settings')
      .upsert({
        school_id: schoolData.id,
        school_code: school_code,
        borrow_days: borrow_days || 14,
        max_books_student: max_books_student || 3,
        max_books_staff: max_books_staff || 5,
        late_fine_per_day: late_fine_per_day || 0,
        late_fine_fixed: late_fine_fixed || 0,
        lost_book_fine: lost_book_fine || 0,
        damaged_book_fine: damaged_book_fine || 0,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'school_id, school_code',
      })
      .select()
      .single();

    if (upsertError) {
      return NextResponse.json(
        { error: 'Failed to save settings', details: upsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: settings }, { status: 200 });
  } catch (error) {
    console.error('Error saving library settings:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

