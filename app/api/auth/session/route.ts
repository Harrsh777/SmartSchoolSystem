import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session-store';

/**
 * GET /api/auth/session
 * Returns the current user from the server-side session (session_id cookie).
 * Use this instead of sessionStorage to get the current user; the server is the source of truth.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = session.user_payload ?? null;
    return NextResponse.json({
      success: true,
      role: session.role,
      school_code: session.school_code ?? undefined,
      user_id: session.user_id ?? undefined,
      user,
    }, { status: 200 });
  } catch (error) {
    console.error('Session fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
