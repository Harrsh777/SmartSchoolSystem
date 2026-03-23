import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/school/login-audit?school_code=XXX&limit=100&role=&status=
 * School dashboard: sign-in audit for one school (requires login_audit_log.school_code).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolCode = searchParams.get('school_code')?.trim().toUpperCase();
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '100', 10) || 100));
    const roleFilter = searchParams.get('role')?.trim();
    const statusFilter = searchParams.get('status')?.trim();
    const loginTypeFilter = searchParams.get('login_type')?.trim();

    if (!schoolCode) {
      return NextResponse.json({ error: 'school_code is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    let query = supabase
      .from('login_audit_log')
      .select(
        'id, user_id, name, role, login_type, ip_address, user_agent, login_at, status, school_code, created_at'
      )
      .eq('school_code', schoolCode)
      .order('login_at', { ascending: false })
      .limit(limit);

    if (roleFilter && roleFilter !== 'all') {
      query = query.eq('role', roleFilter);
    }
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    if (loginTypeFilter && loginTypeFilter !== 'all') {
      query = query.eq('login_type', loginTypeFilter);
    }

    const { data, error } = await query;

    if (error) {
      const msg = `${error.message || ''} ${(error as { details?: string }).details || ''}`;
      if (/school_code|column|schema cache/i.test(msg)) {
        return NextResponse.json({
          data: [],
          schoolScoped: false,
          hint: 'Add column school_code to login_audit_log (see docs/LOGIN_AUDIT_LOG_SCHEMA.md), then new sign-ins will appear here.',
        });
      }
      return NextResponse.json(
        { error: 'Failed to fetch login audit', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      schoolScoped: true,
    });
  } catch (e) {
    console.error('school login-audit GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
