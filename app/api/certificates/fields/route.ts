import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/certificates/fields
 * Get all available certificate fields (placeholders)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceType = searchParams.get('source_type'); // Filter by source_type
    const isActive = searchParams.get('is_active');

    const supabase = getServiceRoleClient();

    let query = supabase
      .from('certificate_fields')
      .select('*')
      .order('source_type', { ascending: true })
      .order('field_label', { ascending: true });

    if (sourceType) {
      query = query.eq('source_type', sourceType);
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true');
    } else {
      query = query.eq('is_active', true);
    }

    const { data: fields, error } = await query;

    if (error) {
      console.error('Error fetching certificate fields:', error);
      return NextResponse.json(
        { error: 'Failed to fetch fields', details: error.message },
        { status: 500 }
      );
    }

    // Group fields by source_type for easier consumption
    const groupedFields = (fields || []).reduce((acc, field) => {
      const type = field.source_type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(field);
      return acc;
    }, {} as Record<string, typeof fields>);

    return NextResponse.json(
      {
        data: fields || [],
        grouped: groupedFields,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/certificates/fields:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
