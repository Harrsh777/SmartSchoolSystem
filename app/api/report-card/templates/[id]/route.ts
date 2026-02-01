import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/report-card/templates/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from('report_card_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/report-card/templates/[id]
 * Update template config. System templates (school_code=null) get a school-specific copy.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { config, school_code } = body;
    if (!school_code || !config) {
      return NextResponse.json({ error: 'school_code and config required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    const { data: existing, error: fetchErr } = await supabase
      .from('report_card_templates')
      .select('id, school_code, is_system, name, description')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const existingRow = existing as { school_code?: string | null; is_system?: boolean; name?: string; description?: string };

    if (existingRow.is_system && !existingRow.school_code) {
      console.log(`Creating school-specific copy of system template for school: ${school_code}`);
      console.log('Config being saved:', JSON.stringify(config));
      
      const { data: inserted, error: insertErr } = await supabase
        .from('report_card_templates')
        .insert({
          school_code,
          name: existingRow.name || 'Custom Template',
          description: existingRow.description || null,
          is_system: false,
          is_active: true,
          config: config as object,
        })
        .select('id, config')
        .single();

      if (insertErr) {
        console.error('Error creating school template:', insertErr);
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
      console.log(`Created new template with id: ${inserted.id}, config saved:`, JSON.stringify(inserted.config));
      return NextResponse.json({ message: 'Template saved as school copy', data: { id: inserted.id } });
    }

    if (existingRow.school_code !== school_code) {
      return NextResponse.json({ error: 'Cannot edit another school template' }, { status: 403 });
    }

    console.log(`Updating existing school template: ${id}`);
    console.log('Config being saved:', JSON.stringify(config));

    const { data: updated, error: updateErr } = await supabase
      .from('report_card_templates')
      .update({ config: config as object })
      .eq('id', id)
      .select('id, config')
      .single();

    if (updateErr) {
      console.error('Error updating template:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
    console.log(`Template updated, config now:`, JSON.stringify(updated?.config));
    return NextResponse.json({ message: 'Template updated', data: { id } });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
