import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * POST /api/marks/report-card/send
 * Mark report cards as sent to students (set sent_at).
 * Body: { school_code: string, report_card_ids: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, report_card_ids } = body;

    if (!school_code || !Array.isArray(report_card_ids) || report_card_ids.length === 0) {
      return NextResponse.json(
        { error: 'school_code and report_card_ids (non-empty array) are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('report_cards')
      .update({ sent_at: now })
      .eq('school_code', school_code)
      .in('id', report_card_ids)
      .select('id');

    if (error) {
      console.error('Error sending report cards:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const updatedCount = data?.length ?? 0;
    return NextResponse.json({
      message: `${updatedCount} report card(s) sent successfully`,
      sent_count: updatedCount,
      ids: data?.map((r) => r.id) ?? [],
    });
  } catch (error) {
    console.error('Error in send report card:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
