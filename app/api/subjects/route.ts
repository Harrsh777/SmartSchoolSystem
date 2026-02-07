import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get all subjects
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

    // Fetch all subjects for the school
    // Schema: id, name, color, category (optional), school_id, school_code, created_at, updated_at
    const { data: subjects, error } = await supabase
      .from('subjects')
      .select('id, name, color, category, school_id, school_code, created_at, updated_at')
      .eq('school_code', schoolCode)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching subjects:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subjects', details: error.message },
        { status: 500 }
      );
    }

    // Return all subjects
    return NextResponse.json({ data: subjects || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create a new subject
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      school_code, 
      name, 
      color,
      category,
    } = body;

    if (!school_code || !name) {
      return NextResponse.json(
        { error: 'School code and name are required' },
        { status: 400 }
      );
    }

    const validCategory = category === 'scholastic' || category === 'non_scholastic' ? category : null;

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

    // Schema: id, name, color, category (optional), school_id, school_code, created_at, updated_at
    const { data: subject, error: insertError } = await supabase
      .from('subjects')
      .insert([{
        school_id: schoolData.id,
        school_code: school_code,
        name: name.trim(),
        color: color || '#6366f1',
        ...(validCategory != null && { category: validCategory }),
      }])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create subject', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: subject }, { status: 201 });
  } catch (error) {
    console.error('Error creating subject:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

