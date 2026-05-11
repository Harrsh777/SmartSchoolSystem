import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSuperAdminSession } from '@/lib/super-admin-api';

export interface ContactInquiry {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  institution_name: string;
  message: string;
  status: 'new' | 'read' | 'responded' | 'archived';
  ip_address: string | null;
  user_agent: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const ALLOWED_STATUSES = ['new', 'read', 'responded', 'archived'] as const;

/**
 * GET /api/admin/contact-inquiries
 * Returns every contact inquiry, newest first. Super-admin session required.
 */
export async function GET(request: NextRequest) {
  const denied = await requireSuperAdminSession(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    let query = supabase
      .from('contact_inquiries')
      .select(
        'id, full_name, email, phone, institution_name, message, status, ip_address, user_agent, created_at, updated_at'
      )
      .order('created_at', { ascending: false });

    if (statusFilter && (ALLOWED_STATUSES as readonly string[]).includes(statusFilter)) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching contact inquiries:', error);
      return NextResponse.json(
        { error: 'Failed to fetch contact inquiries', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error('Unexpected error in GET /api/admin/contact-inquiries:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/contact-inquiries
 * Body: { id: string, status: 'new' | 'read' | 'responded' | 'archived' }
 * Allows the super-admin to move an inquiry through the workflow.
 */
export async function PATCH(request: NextRequest) {
  const denied = await requireSuperAdminSession(request);
  if (denied) return denied;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    const status = typeof body.status === 'string' ? body.status.trim() : '';

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    if (!(ALLOWED_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json(
        { error: `status must be one of ${ALLOWED_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('contact_inquiries')
      .update({ status })
      .eq('id', id)
      .select('id, status, updated_at')
      .single();

    if (error) {
      console.error('Error updating contact inquiry status:', error);
      return NextResponse.json(
        { error: 'Could not update inquiry status', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Unexpected error in PATCH /api/admin/contact-inquiries:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/contact-inquiries?id=...
 * Permanently removes an inquiry.
 */
export async function DELETE(request: NextRequest) {
  const denied = await requireSuperAdminSession(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const id = (searchParams.get('id') || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('contact_inquiries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting contact inquiry:', error);
      return NextResponse.json(
        { error: 'Could not delete inquiry', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in DELETE /api/admin/contact-inquiries:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
