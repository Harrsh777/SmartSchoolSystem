import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/admin-panel-session';

/**
 * Require a valid super-admin panel session (erp_admin_sid cookie).
 * Use on routes that must never be called without logging in at /admin.
 */
export async function requireSuperAdminSession(
  request: NextRequest
): Promise<NextResponse | null> {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Super admin session required' }, { status: 401 });
  }
  return null;
}
