import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/academic-year-management/promotion-rules?school_code=XXX
 */
export async function GET(request: NextRequest) {
  try {
    const schoolCode = request.nextUrl.searchParams.get('school_code');
    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('promotion_rules')
      .select('*')
      .eq('school_code', schoolCode)
      .order('from_class', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch promotion rules', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] }, { status: 200 });
  } catch (error) {
    console.error('Promotion rules GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/academic-year-management/promotion-rules
 * Body: { school_code, rules: [{ from_class, to_class, on_pass, on_fail, final_class? }] }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, rules } = body;

    if (!school_code || !Array.isArray(rules)) {
      return NextResponse.json(
        { error: 'School code and rules array are required' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('promotion_rules')
      .delete()
      .eq('school_code', school_code);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to clear existing rules', details: deleteError.message },
        { status: 500 }
      );
    }

    if (rules.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const rows = rules.map((r: { from_class: string; to_class: string; on_pass?: string; on_fail?: string; final_class?: string }) => ({
      school_code,
      from_class: String(r.from_class || '').trim(),
      to_class: String(r.to_class || '').trim(),
      on_pass: r.on_pass || 'promote',
      on_fail: r.on_fail || 'detain',
      final_class: r.final_class || null,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('promotion_rules')
      .insert(rows)
      .select();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to save promotion rules', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: inserted }, { status: 200 });
  } catch (error) {
    console.error('Promotion rules PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
