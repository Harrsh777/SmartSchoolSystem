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

    const { data: subjects, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('school_code', schoolCode)
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch subjects', details: error.message },
        { status: 500 }
      );
    }

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
    const { school_code, name, color } = body;

    if (!school_code || !name) {
      return NextResponse.json(
        { error: 'School code and name are required' },
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

    const { data: subject, error: insertError } = await supabase
      .from('subjects')
      .insert([{
        school_id: schoolData.id,
        school_code: school_code,
        name: name.trim(),
        color: color || '#6366f1',
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

