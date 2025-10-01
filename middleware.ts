import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to login, unauthorized, API routes, and static assets
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/unauthorized') ||
    pathname.startsWith('/api/login') ||
    pathname.startsWith('/api/logout') ||
    pathname.startsWith('/api/session') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get('admin-session');

  if (!sessionCookie) {
    // Redirect to login page
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Validate session
  try {
    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, 'base64').toString()
    );

    // Check if session is expired (7 days)
    const maxAge = 60 * 60 * 24 * 7 * 1000; // 7 days in ms
    if (Date.now() - sessionData.timestamp > maxAge) {
      const unauthorizedUrl = new URL('/unauthorized', request.url);
      const response = NextResponse.redirect(unauthorizedUrl);
      response.cookies.delete('admin-session');
      return response;
    }

    // Session is valid, allow access
    return NextResponse.next();
  } catch (error) {
    // Invalid session, redirect to unauthorized
    const unauthorizedUrl = new URL('/unauthorized', request.url);
    const response = NextResponse.redirect(unauthorizedUrl);
    response.cookies.delete('admin-session');
    return response;
  }
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
