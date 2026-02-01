import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

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

    const { data, error } = await supabase
      .from('report_card_templates')
      .select('id, name, description, is_system, config, display_order')
      .or(`school_code.is.null,school_code.eq.${schoolCode}`)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          data: [],
          message: 'Report card templates table not found. Run scripts/report_card_system_schema.sql',
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Deduplicate by name (keep first occurrence which has lowest display_order)
    const seen = new Set<string>();
    const uniqueTemplates = (data || []).filter((t) => {
      if (seen.has(t.name)) return false;
      seen.add(t.name);
      return true;
    });

    return NextResponse.json({ data: uniqueTemplates });
  } catch (error) {
    console.error('Error listing report card templates:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
