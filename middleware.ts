import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware — Tracker-SaaS Security Layer
 * 
 * Protects internal API routes with Bearer token validation.
 * Runs BEFORE the route handler, at the edge.
 * 
 * Protected routes: /api/whatsapp/create, /api/whatsapp/status
 * Excluded (public): webhooks, redirects, bridge page APIs, cron (has its own auth)
 */

// Routes that require internal Bearer token authentication
const PROTECTED_ROUTES = [
  '/api/whatsapp/create',
  '/api/whatsapp/status',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only intercept protected API routes
  const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

  if (!isProtected) {
    return NextResponse.next();
  }

  // Validate Bearer token
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.NEXT_PUBLIC_INTERNAL_API_SECRET;

  if (!expectedToken) {
    console.error('[Middleware] NEXT_PUBLIC_INTERNAL_API_SECRET not configured');
    return NextResponse.json(
      { error: 'Server misconfiguration' },
      { status: 500 }
    );
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const token = authHeader.replace('Bearer ', '');

  if (token !== expectedToken) {
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

// Only run middleware on API routes (skip static assets, pages, etc.)
export const config = {
  matcher: '/api/:path*',
};
