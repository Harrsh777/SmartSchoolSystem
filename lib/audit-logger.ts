import { NextRequest } from 'next/server';
import { getClientIp, getUserAgent } from '@/lib/get-client-ip';
import { parseUserAgentSummary } from '@/lib/parse-user-agent';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';

export type AuditSeverity = 'CRITICAL' | 'MEDIUM';

export interface AuditPayload {
  userId?: string | null;
  userName: string;
  role: string;
  actionType: string;
  entityType: string;
  entityId?: string | null;
  severity: AuditSeverity;
  /** Small, structured object only. No PII dump or message content. */
  metadata?: Record<string, unknown> | null;
}

/**
 * Log a state-changing action to audit_logs. Call only from mutation APIs (POST/PUT/PATCH/DELETE, approvals, payments, config).
 * Async and non-blocking: do not await. Never logs navigation, views, or read-only actions.
 */
export function logAudit(request: NextRequest | null, payload: AuditPayload): void {
  void doLog(request, payload).catch((err) => {
    console.error('[AuditLog] insert failed:', err);
  });
}

async function doLog(request: NextRequest | null, payload: AuditPayload): Promise<void> {
  const ip = request ? getClientIp(request) : null;
  const ua = request ? getUserAgent(request) : null;
  const deviceSummary = ua ? parseUserAgentSummary(ua) : null;

  const row = {
    user_id: payload.userId ?? null,
    user_name: String(payload.userName || 'Unknown').slice(0, 500),
    role: String(payload.role || 'Unknown').slice(0, 100),
    action_type: String(payload.actionType).slice(0, 100),
    entity_type: String(payload.entityType).slice(0, 100),
    entity_id: payload.entityId != null ? String(payload.entityId).slice(0, 500) : null,
    severity: payload.severity === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM',
    ip_address: ip?.slice(0, 100) ?? null,
    device_summary: deviceSummary?.slice(0, 200) ?? null,
    metadata: payload.metadata && Object.keys(payload.metadata).length > 0 ? payload.metadata : {},
  };

  try {
    const client = (() => {
      try {
        return getServiceRoleClient();
      } catch {
        return supabase;
      }
    })();
    await client.from('audit_logs').insert(row);
  } catch (err) {
    console.error('[AuditLog] insert threw:', err);
    throw err;
  }
}
