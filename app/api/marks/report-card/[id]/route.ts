import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/marks/report-card/[id]
 * Serve HTML for a saved report card by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Report card ID is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    const { data, error } = await supabase
      .from('report_cards')
      .select('html_content, student_name, academic_year')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Report card not found' }, { status: 404 });
    }

    const html = data.html_content as string;
    const filename = `report_card_${(data.student_name || '').replace(/\s+/g, '_')}_${(data.academic_year || '').replace(/\s+/g, '_')}.html`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error serving report card:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/marks/report-card/[id]
 * Delete a report card by ID
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Report card ID is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    const { error } = await supabase
      .from('report_cards')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Report card not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Report card deleted successfully' });
  } catch (error) {
    console.error('Error deleting report card:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
