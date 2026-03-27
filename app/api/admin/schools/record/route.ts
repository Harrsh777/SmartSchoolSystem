import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

function normalizeSchoolName(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

/**
 * DELETE /api/admin/schools/record
 * Permanently remove a school signup, accepted school, or rejected-school record.
 * Body: { id, source: 'pending' | 'accepted' | 'rejected', confirm_name }
 * confirm_name must match the stored school_name (trim + collapsed spaces).
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, source, confirm_name } = body as {
      id?: string;
      source?: string;
      confirm_name?: string;
    };

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'School id is required' }, { status: 400 });
    }
    if (!source || !['pending', 'accepted', 'rejected'].includes(source)) {
      return NextResponse.json(
        { error: 'source must be pending, accepted, or rejected' },
        { status: 400 }
      );
    }
    if (!confirm_name || typeof confirm_name !== 'string' || !confirm_name.trim()) {
      return NextResponse.json(
        { error: 'confirm_name is required. Type the full school name to confirm deletion.' },
        { status: 400 }
      );
    }

    const table =
      source === 'pending'
        ? 'school_signups'
        : source === 'accepted'
          ? 'accepted_schools'
          : 'rejected_schools';

    const supabase = getServiceRoleClient();

    const { data: row, error: fetchErr } = await supabase
      .from(table)
      .select('id, school_name')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) {
      console.error('Delete school fetch error:', fetchErr);
      return NextResponse.json(
        { error: 'Failed to load school record', details: fetchErr.message },
        { status: 500 }
      );
    }
    if (!row) {
      return NextResponse.json({ error: 'School record not found' }, { status: 404 });
    }

    const expected = normalizeSchoolName(String(row.school_name || ''));
    const got = normalizeSchoolName(confirm_name);
    if (!expected || got !== expected) {
      return NextResponse.json(
        {
          error:
            'School name does not match. Type the exact school name shown on the card (same spelling and spacing).',
        },
        { status: 400 }
      );
    }

    const { error: delErr } = await supabase.from(table).delete().eq('id', id);

    if (delErr) {
      console.error('Delete school error:', delErr);
      return NextResponse.json(
        {
          error: 'Could not delete this school. It may still be linked to students, staff, or other data.',
          details: delErr.message,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'School record deleted permanently.',
    });
  } catch (error) {
    console.error('DELETE /api/admin/schools/record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
