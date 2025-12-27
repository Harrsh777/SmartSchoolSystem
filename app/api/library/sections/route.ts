import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePermission } from '@/lib/api-permissions';

/**
 * GET /api/library/sections
 * Get all library sections for a school
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

    const { data: sections, error } = await supabase
      .from('library_sections')
      .select('*')
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch sections', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: sections || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching library sections:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/library/sections
 * Create a new library section
 */
export async function POST(request: NextRequest) {
  // Check permission
  const permissionCheck = await requirePermission(request, 'manage_library');
  if (permissionCheck) {
    return permissionCheck;
  }

  try {
    const body = await request.json();
    const { school_code, name, material_type } = body;

    if (!school_code || !name || !material_type) {
      return NextResponse.json(
        { error: 'School code, name, and material type are required' },
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

    const { data: section, error: insertError } = await supabase
      .from('library_sections')
      .insert([{
        school_id: schoolData.id,
        school_code: school_code,
        name: name,
        material_type: material_type,
      }])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create section', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: section }, { status: 201 });
  } catch (error) {
    console.error('Error creating library section:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

