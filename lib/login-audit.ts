import { NextRequest } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';
import { getClientIp, getUserAgent } from '@/lib/get-client-ip';

export type LoginAuditStatus = 'success' | 'failed';
export type LoginType = 'school' | 'teacher' | 'student' | 'accountant';

export interface LoginAuditPayload {
  userId?: string | null;
  name: string;
  role: string;
  loginType?: LoginType;
  status: LoginAuditStatus;
}

/** Dedupe window: skip insert if same identity+ip+status already logged within this many ms. */
const DEDUPE_WINDOW_MS = 2000;

/**
 * Insert one immutable login audit record. Logs only once per (user+ip+status) within a short window to avoid duplicates from API + frontend or retries.
 * Call from each login route on both success and failure.
 * Requires login_audit_log table in Supabase (see docs/LOGIN_AUDIT_LOG_SCHEMA.md).
 */
export async function createLoginAuditLog(
  request: NextRequest,
  payload: LoginAuditPayload
): Promise<void> {
  const ipAddress = getClientIp(request);
  const userAgent = getUserAgent(request);
  const name = String(payload.name || 'Unknown').slice(0, 500);
  const status = payload.status === 'success' ? 'success' : 'failed';
  const row = {
    user_id: payload.userId ?? null,
    name,
    role: String(payload.role || 'Unknown').slice(0, 100),
    login_type: payload.loginType ?? null,
    ip_address: ipAddress?.slice(0, 100) ?? null,
    user_agent: (userAgent && userAgent.slice(0, 1000)) || null,
    login_at: new Date().toISOString(),
    status,
  };
  try {
    const client = (() => {
      try {
        return getServiceRoleClient();
      } catch {
        return supabase;
      }
    })();
    const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
    let dedupeQuery = client
      .from('login_audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('status', status)
      .gte('login_at', since)
      .limit(1);
    if (row.ip_address != null && row.ip_address !== '') {
      dedupeQuery = dedupeQuery.eq('ip_address', row.ip_address);
    }
    if (row.user_id) {
      dedupeQuery = dedupeQuery.eq('user_id', row.user_id);
    } else {
      dedupeQuery = dedupeQuery.eq('name', name);
    }
    const dedupeRes = await dedupeQuery;
    if (dedupeRes.count != null && dedupeRes.count > 0) {
      return;
    }
    const { data, error } = await client.from('login_audit_log').insert(row).select('id').maybeSingle();
    if (error) {
      console.error('[LoginAudit] insert failed:', error.code, error.message, error.details);
      return;
    }
    if (data?.id) {
      console.info('[LoginAudit] logged:', row.role, row.status, row.name?.slice(0, 30));
    }
  } catch (err) {
    console.error('[LoginAudit] insert threw:', err);
  }
}
