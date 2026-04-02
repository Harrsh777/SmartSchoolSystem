import { NextRequest, NextResponse } from 'next/server';
import {
  parseAuthCookie,
  redirectPathForAuth,
  setAuthCookieFromSlotKey,
  slotKeyToCookieName,
  SESSION_MAX_AGE,
} from '@/lib/auth-cookie';
import { getSession, sessionMatchesParsedAuth } from '@/lib/session-store';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

async function verifyPasswordForTargetSession(
  role: 'school' | 'teacher' | 'student' | 'accountant',
  schoolCode: string | null,
  userId: string | null,
  userPayload: Record<string, unknown> | null,
  password: string
): Promise<boolean> {
  if (role === 'school') {
    const code = String(schoolCode ?? userPayload?.school_code ?? '').trim().toUpperCase();
    if (!code) return false;
    const { data, error } = await supabase
      .from('accepted_schools')
      .select('password')
      .eq('school_code', code)
      .maybeSingle();
    if (error || !data?.password) return false;
    const stored = String(data.password);
    return stored.startsWith('$2') ? bcrypt.compare(password, stored) : stored === password;
  }

  if (role === 'teacher' || role === 'accountant') {
    const code = String(schoolCode ?? '').trim().toUpperCase();
    if (!code) return false;
    const payloadStaffId =
      role === 'accountant'
        ? String(
            ((userPayload?.staff as Record<string, unknown> | undefined)?.staff_id as string | undefined) ?? ''
          ).trim()
        : String((userPayload?.staff_id as string | undefined) ?? '').trim();
    if (!payloadStaffId) return false;
    const { data, error } = await supabase
      .from('staff_login')
      .select('password_hash, password')
      .eq('school_code', code)
      .eq('staff_id', payloadStaffId)
      .maybeSingle();
    if (error || !data) return false;
    const stored = String((data.password_hash ?? data.password ?? '') as string);
    if (!stored) return false;
    return stored.startsWith('$2') ? bcrypt.compare(password, stored) : stored === password;
  }

  if (role === 'student') {
    const code = String(schoolCode ?? '').trim().toUpperCase();
    const admissionNo = String((userPayload?.admission_no as string | undefined) ?? '').trim();
    if (!code || !admissionNo) return false;
    const { data, error } = await supabase
      .from('student_login')
      .select('password_hash')
      .eq('school_code', code)
      .eq('admission_no', admissionNo)
      .maybeSingle();
    if (error || !data?.password_hash) return false;
    return bcrypt.compare(password, String(data.password_hash));
  }

  if (userId) {
    const code = String(schoolCode ?? '').trim().toUpperCase();
    if (!code) return false;
    const { data, error } = await supabase
      .from('staff')
      .select('staff_id')
      .eq('id', userId)
      .eq('school_code', code)
      .maybeSingle();
    if (error || !data?.staff_id) return false;
    const { data: loginData, error: loginError } = await supabase
      .from('staff_login')
      .select('password_hash, password')
      .eq('school_code', code)
      .eq('staff_id', String(data.staff_id))
      .maybeSingle();
    if (loginError || !loginData) return false;
    const stored = String((loginData.password_hash ?? loginData.password ?? '') as string);
    return stored.startsWith('$2') ? bcrypt.compare(password, stored) : stored === password;
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { slotKey?: string; password?: string };
    const slotKey = typeof body.slotKey === 'string' ? body.slotKey.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!slotKey) {
      return NextResponse.json({ error: 'slotKey is required' }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const parsed = parseAuthCookie(slotKey);
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid slot' }, { status: 400 });
    }

    const token = request.cookies.get(slotKeyToCookieName(slotKey))?.value;
    if (!token) {
      return NextResponse.json({ error: 'No session for this role' }, { status: 401 });
    }

    const row = await getSession(token, {
      sliding: true,
      extendSeconds: SESSION_MAX_AGE,
    });
    if (!row || !sessionMatchesParsedAuth(row, parsed)) {
      return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
    }

    const passwordOk = await verifyPasswordForTargetSession(
      parsed.role,
      row.school_code,
      row.user_id,
      row.user_payload,
      password
    );
    if (!passwordOk) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const res = NextResponse.json({
      success: true,
      redirectTo: redirectPathForAuth(parsed),
    });
    setAuthCookieFromSlotKey(res, slotKey, SESSION_MAX_AGE);
    return res;
  } catch (e) {
    console.error('auth/switch', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
