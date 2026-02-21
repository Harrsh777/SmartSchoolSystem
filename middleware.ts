import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, parseAuthCookie } from '@/lib/auth-cookie';

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

/** CORS: allow Expo web (localhost) and production app origin when calling /api/* */
const CORS_ALLOWED_ORIGINS = [
  'http://localhost:8081',      // Expo web dev
  'http://localhost:19006',     // Expo web alternate
  'http://127.0.0.1:8081',
  'http://127.0.0.1:19006',
  // Add your production app domain when you deploy (e.g. https://your-app.vercel.app)
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function isApiOrStatic(pathname: string): boolean {
  return pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.');
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CORS for /api/* (Expo web at localhost:8081 → Vercel API)
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

  // /dashboard/:school/* — require school session
  if (pathname.startsWith('/dashboard/')) {
    if (!auth || auth.role !== 'school') {
      const login = new URL(LOGIN_PATH, request.url);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  // /teacher/* — require teacher session
  if (pathname.startsWith('/teacher/')) {
    if (!auth || auth.role !== 'teacher') {
      const login = new URL('/staff/login', request.url);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  // /student/* — require student session (allow /student and /student/login)
  if (pathname.startsWith('/student/')) {
    if (pathname === '/student/login' || pathname === '/student') {
      return NextResponse.next();
    }
    if (!auth || auth.role !== 'student') {
      const login = new URL('/student/login', request.url);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  // /admin — super admin panel (password modal on page) and /admin/login — school admin login (public)
  // Allow all /admin/* through: super admin uses client-side password (educorerp@123), school admin uses /admin/login
  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // /accountant/* — require accountant session
  if (pathname.startsWith('/accountant/')) {
    if (pathname === '/accountant/login') {
      return NextResponse.next();
    }
    if (!auth || auth.role !== 'accountant') {
      const login = new URL('/accountant/login', request.url);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
