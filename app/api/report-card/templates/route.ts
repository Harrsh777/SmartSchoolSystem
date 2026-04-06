import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { getDefaultReportCardTemplateConfig } from '@/lib/report-card-html';

const templateSelect =
  'id, name, description, is_system, school_code, config, display_order, created_at';

/**
 * GET /api/report-card/templates
 * List report card templates for a school (system templates + school-specific)
 * Query: school_code
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    // Two queries avoid PostgREST `.or(school_code.eq.X)` breaking when X contains commas etc.
    const [schoolRes, systemRes] = await Promise.all([
      supabase
        .from('report_card_templates')
        .select(templateSelect)
        .eq('school_code', schoolCode)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true }),
      supabase
        .from('report_card_templates')
        .select(templateSelect)
        .is('school_code', null)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true }),
    ]);

    const error = schoolRes.error || systemRes.error;
    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          data: [],
          message: 'Report card templates table not found. Run scripts/report_card_system_schema.sql',
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = [...(schoolRes.data || []), ...(systemRes.data || [])];

    // Same name can exist as system + school copy — always prefer the school-specific row
    // so customization and generate use the same template the user edited.
    const norm = String(schoolCode || '').trim().toUpperCase();
    const byName = new Map<string, (typeof rows)[0]>();
    for (const t of rows) {
      const name = String(t.name || '');
      const isSchool = String((t as { school_code?: string }).school_code || '').trim().toUpperCase() === norm;
      const prev = byName.get(name);
      if (!prev) {
        byName.set(name, t);
        continue;
      }
      const prevSchool =
        String((prev as { school_code?: string }).school_code || '').trim().toUpperCase() === norm;
      if (isSchool && !prevSchool) byName.set(name, t);
    }
    const uniqueTemplates = Array.from(byName.values());

    return NextResponse.json({ data: uniqueTemplates });
  } catch (error) {
    console.error('Error listing report card templates:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/report-card/templates
 * Create a school-specific template when none exist (enables Customize + Save).
 * Body: { school_code: string, name?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const schoolCode = String(body.school_code ?? '').trim();
    if (!schoolCode) {
      return NextResponse.json({ error: 'school_code is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    const { count, error: countErr } = await supabase
      .from('report_card_templates')
      .select('id', { count: 'exact', head: true })
      .eq('school_code', schoolCode)
      .eq('is_active', true);

    if (countErr) {
      if (countErr.code === '42P01') {
        return NextResponse.json(
          { error: 'Report card templates table not found. Run the report card schema migration.' },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: countErr.message }, { status: 500 });
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: 'This school already has an active template. Refresh the page to load it.' },
        { status: 409 }
      );
    }

    const name = String(body.name ?? '').trim() || 'School Report Card';
    const config = getDefaultReportCardTemplateConfig() as Record<string, unknown>;

    const { data: inserted, error: insertErr } = await supabase
      .from('report_card_templates')
      .insert({
        school_code: schoolCode,
        name,
        description: 'Customizable report card layout',
        is_system: false,
        is_active: true,
        config,
        display_order: 0,
      })
      .select(templateSelect)
      .single();

    if (insertErr) {
      console.error('Create report card template:', insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ data: inserted, message: 'Template created' }, { status: 201 });
  } catch (error) {
    console.error('Error creating report card template:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
