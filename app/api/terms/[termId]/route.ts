import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const TABLE = 'exam_terms';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ termId: string }> }
) {
  try {
    const { termId } = await params;
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const raw = String(body.name ?? '').trim();
      updates.name = raw;
      updates.normalized_name = raw.toLowerCase();
      updates.slug = raw
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
    if (body.serial !== undefined) updates.serial = Number(body.serial);
    if (body.start_date !== undefined) updates.start_date = body.start_date || null;
    if (body.end_date !== undefined) updates.end_date = body.end_date || null;
    if (body.academic_year !== undefined) updates.academic_year = body.academic_year || null;
    if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);

    const { data, error } = await supabase.from(TABLE).update(updates).eq('id', termId).select().single();
    if (error) {
      return NextResponse.json({ error: 'Failed to update term', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ data }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', details: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ termId: string }> }
) {
  try {
    const { termId } = await params;

    // Block hard-delete if exams exist under this term.
    const { data: exams, error: examsErr } = await supabase
      .from('examinations')
      .select('id')
      .eq('term_id', termId)
      .limit(1);
    if (!examsErr && exams && exams.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete term because exams exist under it. Deactivate it instead.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from(TABLE)
      .update({ is_deleted: true, is_active: false })
      .eq('id', termId)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: 'Failed to delete term', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ data }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', details: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 }
    );
  }
}

