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

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function isApiOrStatic(pathname: string): boolean {
  return pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isApiOrStatic(pathname)) {
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

  // /admin (super admin / school admin page) — require school session
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
      return NextResponse.next();
    }
    if (!auth || auth.role !== 'school') {
      const login = new URL('/admin/login', request.url);
      return NextResponse.redirect(login);
    }
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
