import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  isPublicPath,
  parseSessionToken,
  getRoleDefaultPortal,
  canAccessPath,
} from '@medibooking/types';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Extract session token from cookie or Authorization header
  const sessionCookie = request.cookies.get('medibooking_session')?.value;
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = sessionCookie || bearerToken;

  const session = parseSessionToken(token);

  // 2. If visiting /login while already authenticated, redirect to user's portal
  if (pathname === '/login' && session) {
    const destination = getRoleDefaultPortal(session.role);
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // 3. Bypass authentication for public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // 4. If unauthenticated on a protected portal route, redirect to /login
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. RBAC Authorization: Check whether user's role can access this specific portal
  if (!canAccessPath(session.role, pathname)) {
    // If not permitted, redirect to the user's authorized home portal
    const allowedPortal = getRoleDefaultPortal(session.role);
    return NextResponse.redirect(new URL(allowedPortal, request.url));
  }

  // 6. Enrich downstream request headers with resolved context
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', session.userId);
  requestHeaders.set('x-user-role', session.role);
  if (session.clinicId) {
    requestHeaders.set('x-clinic-id', session.clinicId);
  }
  if (session.doctorId) {
    requestHeaders.set('x-doctor-id', session.doctorId);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
