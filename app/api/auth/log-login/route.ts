import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, getUserAgent } from '@/lib/get-client-ip';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * Option A — Server-side logging for login audit.
 * Call this from the frontend after Supabase Auth (or any login) success/failure.
 * Server captures IP and User-Agent from the request; client sends who/role/status.
 */
export async function POST(request: NextRequest) {
  try {
    const rate = await checkRateLimit(request, 'auth-log-login', { windowMs: 60 * 1000, max: 30 });
    if (!rate.success) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }
  } catch {
    // Fail open so logging never blocks login
  }

  try {
    const body = await request.json();
    const userId = typeof body.userId === 'string' ? body.userId : null;
    const name = String(body.name ?? 'Unknown').trim().slice(0, 500) || 'Unknown';
    const role = String(body.role ?? 'Unknown').slice(0, 100);
    const loginType = typeof body.loginType === 'string' ? body.loginType : null;
    const status = body.status === 'success' ? 'success' : 'failed';

    const ipAddress = getClientIp(request);
    const userAgent = getUserAgent(request);

    const row = {
      user_id: userId,
      name,
      role,
      login_type: loginType,
      ip_address: ipAddress?.slice(0, 100) ?? null,
      user_agent: (userAgent && userAgent.slice(0, 1000)) || null,
      status,
    };

    const client = (() => {
      try {
        return getServiceRoleClient();
      } catch {
        return supabase;
      }
    })();

    // Dedupe: same user+ip+status within 2s (avoids double log when API already logged)
    const since = new Date(Date.now() - 2000).toISOString();
    let dedupeQuery = client
      .from('login_audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('status', status)
      .gte('login_at', since)
      .limit(1);
    if (row.ip_address != null && row.ip_address !== '') {
      dedupeQuery = dedupeQuery.eq('ip_address', row.ip_address);
    }
    if (userId) {
      dedupeQuery = dedupeQuery.eq('user_id', userId);
    } else {
      dedupeQuery = dedupeQuery.eq('name', name);
    }
    const dedupeRes = await dedupeQuery;
    if (dedupeRes.count != null && dedupeRes.count > 0) {
      return NextResponse.json({ ok: true, skipped: 'duplicate' });
    }

    const { data, error } = await client.from('login_audit_log').insert(row).select('id').maybeSingle();
    if (error) {
      console.error('[LoginAudit] log-login insert failed:', error.code, error.message, error.details);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (err) {
    console.error('[LoginAudit] log-login threw:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

/**
 * GET ?test=1 — insert a test row and return result (for debugging / production check).
 * On production, hit https://your-domain.com/api/auth/log-login?test=1 to verify env and table.
 */
export async function GET(request: NextRequest) {
  const test = request.nextUrl.searchParams.get('test');
  if (test !== '1') {
    return NextResponse.json({ error: 'Use ?test=1 to run insert test' }, { status: 400 });
  }
  try {
    let client;
    try {
      client = getServiceRoleClient();
    } catch (clientErr) {
      const msg = clientErr instanceof Error ? clientErr.message : String(clientErr);
      return NextResponse.json({
        ok: false,
        error: 'Supabase client failed. On production, set SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in your host (e.g. Vercel env).',
        detail: msg,
      }, { status: 500 });
    }
    const row = {
      user_id: null,
      name: 'Test Login Audit',
      role: 'Test',
      login_type: null,
      ip_address: getClientIp(request),
      user_agent: getUserAgent(request)?.slice(0, 200) || null,
      status: 'success',
    };
    const { data, error } = await client.from('login_audit_log').insert(row).select('id').maybeSingle();
    if (error) {
      return NextResponse.json({ ok: false, error: error.message, code: error.code, details: error.details }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: data?.id, message: 'Row inserted. Check login_audit_log table.' });
  } catch (err) {
    return NextResponse.json({ ok: false, thrown: String(err) }, { status: 500 });
  }
}
