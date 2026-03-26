import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const schoolCode = request.nextUrl.searchParams.get('school_code');
    if (!schoolCode) {
      return NextResponse.json({ error: 'school_code is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('exam_term_structures')
      .select('*')
      .eq('school_code', schoolCode)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          { data: [], message: 'exam_term_structures table not found. Run docs/EXAM_TERM_STRUCTURE_SCHEMA.sql' },
          { status: 200 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data: data || [] }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', details: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const schoolCode = String(body.school_code || '').trim();
    const name = String(body.name || '').trim();
    const createdBy = body.created_by || null;

    if (!schoolCode || !name) {
      return NextResponse.json({ error: 'school_code and name are required' }, { status: 400 });
    }

    const { data: school, error: schoolErr } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', schoolCode)
      .single();
    if (schoolErr || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const normalized = name.toLowerCase();
    const { data: dup } = await supabase
      .from('exam_term_structures')
      .select('id')
      .eq('school_code', schoolCode)
      .eq('normalized_name', normalized)
      .eq('is_deleted', false)
      .maybeSingle();
    if (dup) {
      return NextResponse.json({ error: 'Structure name already exists in this school' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('exam_term_structures')
      .insert({
        school_id: school.id,
        school_code: schoolCode,
        name,
        normalized_name: normalized,
        slug: normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        is_active: true,
        is_deleted: false,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', details: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 }
    );
  }
}

