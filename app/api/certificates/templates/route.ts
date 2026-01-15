import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/certificates/templates
 * Get all certificate templates for a school
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const type = searchParams.get('type'); // 'student' | 'staff'
    const isActive = searchParams.get('is_active');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Build query
    let query = supabase
      .from('certificate_templates')
      .select('*')
      .eq('school_code', schoolCode)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('Error fetching certificate templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch templates', details: error.message },
        { status: 500 }
      );
    }

    // Get usage count for each template (count of issued certificates)
    const templateIds = (templates || []).map((t) => t.id);
    const { data: usageCounts } = await supabase
      .from('certificates_issued')
      .select('template_id')
      .in('template_id', templateIds);

    const usageCountMap = new Map<string, number>();
    (usageCounts || []).forEach((cert) => {
      usageCountMap.set(cert.template_id, (usageCountMap.get(cert.template_id) || 0) + 1);
    });

    const templatesWithUsage = (templates || []).map((template) => ({
      ...template,
      usage_count: usageCountMap.get(template.id) || 0,
    }));

    return NextResponse.json({ data: templatesWithUsage }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/certificates/templates:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/certificates/templates
 * Create a new certificate template
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      name,
      description,
      type,
      page_size = 'A4',
      page_orientation = 'portrait',
      background_image_url,
      background_color = '#FFFFFF',
      design_json,
      html_template,
      css_styles,
      margins_top = 50,
      margins_bottom = 50,
      margins_left = 50,
      margins_right = 50,
      created_by,
    } = body;

    if (!school_code || !name || !type) {
      return NextResponse.json(
        { error: 'School code, name, and type are required' },
        { status: 400 }
      );
    }

    if (!['student', 'staff'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be "student" or "staff"' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

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

    // Calculate canvas dimensions based on page size and orientation
    // A4 dimensions at 96 DPI:
    // Portrait: 794 x 1123 px
    // Landscape: 1123 x 794 px
    let canvasWidth = 794;
    let canvasHeight = 1123;
    
    if (page_size === 'A4') {
      if (page_orientation === 'landscape') {
        canvasWidth = 1123;
        canvasHeight = 794;
      }
    } else if (page_size === 'A3') {
      if (page_orientation === 'portrait') {
        canvasWidth = 1123;
        canvasHeight = 1587;
      } else {
        canvasWidth = 1587;
        canvasHeight = 1123;
      }
    }

    // Default design_json if not provided
    const defaultDesignJson = design_json || {
      elements: [],
      background: {
        type: background_image_url ? 'image' : 'color',
        url: background_image_url || null,
        color: background_color,
      },
    };

    // Create template
    const { data: template, error: insertError } = await supabase
      .from('certificate_templates')
      .insert([
        {
          school_id: schoolData.id,
          school_code,
          name,
          description: description || null,
          type,
          page_size,
          page_orientation,
          canvas_width: canvasWidth,
          canvas_height: canvasHeight,
          background_image_url: background_image_url || null,
          background_color,
          design_json: defaultDesignJson,
          html_template: html_template || null,
          css_styles: css_styles || null,
          margins_top,
          margins_bottom,
          margins_left,
          margins_right,
          created_by: created_by || null,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating template:', insertError);
      return NextResponse.json(
        { error: 'Failed to create template', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/certificates/templates:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
