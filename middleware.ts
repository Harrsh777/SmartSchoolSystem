import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  buildAuthCookieValue,
  cookieNameToSlotKey,
  getAuthCookieOptions,
  parseAuthCookie,
  SESSION_MAX_AGE,
  slotKeyToCookieName,
} from '@/lib/auth-cookie';
import { getServiceRoleClient } from '@/lib/supabase-admin';

const LOGIN_PATH = '/login';
const PUBLIC_PATHS = [
  '/login',
  '/staff/login',
  '/student/login',
  '/admin/login',
  '/accountant/login',
  '/signup',
  '/demo',
  '/auth',
];

const CORS_ALLOWED_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:19006',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:19006',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = origin && CORS_ALLOWED_ORIGINS.includes(origin)
    ? origin
    : CORS_ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Token',
    'Access-Control-Max-Age': '86400',
  };
}

function activateSlotOnResponse(request: NextRequest, slotKey: string): NextResponse {
  const res = NextResponse.next();
  res.cookies.set(AUTH_COOKIE_NAME, slotKey, getAuthCookieOptions(SESSION_MAX_AGE));
  return res;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api')) {
    const origin = request.headers.get('origin') ?? null;

    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: getCorsHeaders(origin),
      });
    }

    const response = NextResponse.next();
    Object.entries(getCorsHeaders(origin)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const auth = cookieValue ? parseAuthCookie(cookieValue) : null;

  if (pathname.startsWith('/dashboard/')) {
    const pathParts = pathname.split('/').filter(Boolean);
    const schoolCodeInPath = pathParts.length > 1 ? String(pathParts[1] || '').toUpperCase() : '';
    const desiredSlotKey = schoolCodeInPath ? buildAuthCookieValue('school', schoolCodeInPath) : '';

    const isAcademicYearSetupRoute = pathname.includes('/academic-year-management/year-setup');

    if (
      auth?.role === 'school' &&
      schoolCodeInPath &&
      auth.schoolCode?.toUpperCase() === schoolCodeInPath
    ) {
      // Force academic year setup if school has no current academic year.
      // We use `academic_years.is_current=true` as the source of truth.
      if (!isAcademicYearSetupRoute) {
        try {
          const supabase = getServiceRoleClient();
          const { data: currentYearRow } = await supabase
            .from('academic_years')
            .select('id')
            .eq('school_code', schoolCodeInPath)
            .eq('is_current', true)
            .maybeSingle();

          if (!currentYearRow) {
            const setupUrl = new URL(
              `/dashboard/${schoolCodeInPath}/academic-year-management/year-setup`,
              request.url
            );
            setupUrl.searchParams.set('required', '1');
            return NextResponse.redirect(setupUrl);
          }
        } catch {
          // Fail open (don't block if the check fails).
        }
      }
      return NextResponse.next();
    }

    if (desiredSlotKey && request.cookies.get(slotKeyToCookieName(desiredSlotKey))?.value) {
      return activateSlotOnResponse(request, desiredSlotKey);
    }

    if (!auth || auth.role !== 'school') {
      const login = new URL(LOGIN_PATH, request.url);
      return NextResponse.redirect(login);
    }
    const login = new URL(LOGIN_PATH, request.url);
    return NextResponse.redirect(login);
  }

  if (pathname.startsWith('/teacher/')) {
    if (auth?.role === 'teacher') {
      return NextResponse.next();
    }
    for (const c of request.cookies.getAll()) {
      const sk = cookieNameToSlotKey(c.name);
      if (sk === 'teacher' || (typeof sk === 'string' && sk.startsWith('teacher:'))) {
        if (c.value) {
          return activateSlotOnResponse(request, sk);
        }
      }
    }
    const login = new URL('/staff/login', request.url);
    return NextResponse.redirect(login);
  }

  if (pathname.startsWith('/student/')) {
    if (pathname === '/student/login' || pathname === '/student') {
      return NextResponse.next();
    }
    if (auth?.role === 'student') {
      return NextResponse.next();
    }
    for (const c of request.cookies.getAll()) {
      const sk = cookieNameToSlotKey(c.name);
      if (sk === 'student' || (typeof sk === 'string' && sk.startsWith('student:'))) {
        if (c.value) {
          return activateSlotOnResponse(request, sk);
        }
      }
    }
    const login = new URL('/student/login', request.url);
    return NextResponse.redirect(login);
  }

  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/accountant/')) {
    if (pathname === '/accountant/login') {
      return NextResponse.next();
    }
    if (auth?.role === 'accountant') {
      return NextResponse.next();
    }
    for (const c of request.cookies.getAll()) {
      const sk = cookieNameToSlotKey(c.name);
      if (sk === 'accountant' || (typeof sk === 'string' && sk.startsWith('accountant:'))) {
        if (c.value) {
          return activateSlotOnResponse(request, sk);
        }
      }
    }
    const login = new URL('/accountant/login', request.url);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
