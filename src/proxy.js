import { NextResponse } from 'next/server';

export function proxy(request) {
  const { pathname } = request.nextUrl;

  // Allow the login page, SSE event stream, and health checks to pass through freely
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/signal/events') ||
    pathname.startsWith('/api/health')
  ) {
    return NextResponse.next();
  }

  // Check for your secure auth cookie
  const authCookie = request.cookies.get('localdrop_auth');
  const expectedPass = process.env.AUTH_PASS;

  if (authCookie?.value === expectedPass) {
    return NextResponse.next();
  }

  // Redirect unauthenticated requests straight to /login
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};