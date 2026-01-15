import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/certificates/templates/[id]
 * Get a single certificate template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceRoleClient();

    const { data: template, error } = await supabase
      .from('certificate_templates')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching template:', error);
      return NextResponse.json(
        { error: 'Failed to fetch template', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: template }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/certificates/templates/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/certificates/templates/[id]
 * Update a certificate template
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = getServiceRoleClient();

    // Get existing template to validate
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('certificate_templates')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Prepare update data (only include provided fields)
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.type !== undefined) {
      if (!['student', 'staff'].includes(body.type)) {
        return NextResponse.json(
          { error: 'Type must be "student" or "staff"' },
          { status: 400 }
        );
      }
      updateData.type = body.type;
    }
    if (body.page_size !== undefined) updateData.page_size = body.page_size;
    if (body.page_orientation !== undefined) {
      updateData.page_orientation = body.page_orientation;
      
      // Recalculate canvas dimensions if orientation changed
      if (body.page_orientation !== existingTemplate.page_orientation) {
        const pageSize = body.page_size || existingTemplate.page_size;
        let canvasWidth = 794;
        let canvasHeight = 1123;
        
        if (pageSize === 'A4') {
          if (body.page_orientation === 'landscape') {
            canvasWidth = 1123;
            canvasHeight = 794;
          }
        } else if (pageSize === 'A3') {
          if (body.page_orientation === 'portrait') {
            canvasWidth = 1123;
            canvasHeight = 1587;
          } else {
            canvasWidth = 1587;
            canvasHeight = 1123;
          }
        }
        updateData.canvas_width = canvasWidth;
        updateData.canvas_height = canvasHeight;
      }
    }
    if (body.background_image_url !== undefined) updateData.background_image_url = body.background_image_url;
    if (body.background_color !== undefined) updateData.background_color = body.background_color;
    if (body.design_json !== undefined) updateData.design_json = body.design_json;
    if (body.html_template !== undefined) updateData.html_template = body.html_template;
    if (body.css_styles !== undefined) updateData.css_styles = body.css_styles;
    if (body.margins_top !== undefined) updateData.margins_top = body.margins_top;
    if (body.margins_bottom !== undefined) updateData.margins_bottom = body.margins_bottom;
    if (body.margins_left !== undefined) updateData.margins_left = body.margins_left;
    if (body.margins_right !== undefined) updateData.margins_right = body.margins_right;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.is_default !== undefined) updateData.is_default = body.is_default;

    const { data: updatedTemplate, error: updateError } = await supabase
      .from('certificate_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating template:', updateError);
      return NextResponse.json(
        { error: 'Failed to update template', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedTemplate }, { status: 200 });
  } catch (error) {
    console.error('Error in PATCH /api/certificates/templates/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/certificates/templates/[id]
 * Soft delete a certificate template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceRoleClient();

    // Check if template exists
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('certificate_templates')
      .select('id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Check if template is being used (has issued certificates)
    const { data: issuedCertificates } = await supabase
      .from('certificates_issued')
      .select('id')
      .eq('template_id', id)
      .limit(1);

    if (issuedCertificates && issuedCertificates.length > 0) {
      // Soft delete instead of hard delete
      const { error: deleteError } = await supabase
        .from('certificate_templates')
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq('id', id);

      if (deleteError) {
        console.error('Error soft deleting template:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete template', details: deleteError.message },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { message: 'Template archived (has issued certificates)' },
        { status: 200 }
      );
    }

    // Hard delete if no certificates issued
    const { error: deleteError } = await supabase
      .from('certificate_templates')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting template:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete template', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Template deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/certificates/templates/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
