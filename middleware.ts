import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Next.js Middleware — MultiChat CRM Security Layer
 * 
 * 1. Protege rotas /dashboard/* → redireciona para /login se não autenticado
 * 2. Protege APIs internas com Bearer token
 * 3. Rotas públicas (webhooks, auth) passam sem autenticação
 */

// Rotas que requerem Bearer token interno (chamadas do frontend)
const BEARER_PROTECTED_ROUTES = [
  '/api/whatsapp/create',
  '/api/whatsapp/status',
  '/api/whatsapp/send',
  '/api/contacts',
];

// Rotas sempre públicas (sem auth nenhuma)
const PUBLIC_ROUTES = [
  '/api/webhook',
  '/api/auth',
  '/login',
  '/signup',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Rotas públicas: passar direto ───
  const isPublic = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
  if (isPublic || pathname === '/') {
    return NextResponse.next();
  }

  // ─── APIs com Bearer token ───
  const needsBearer = BEARER_PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  if (needsBearer) {
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.NEXT_PUBLIC_INTERNAL_API_SECRET;

    if (!expectedToken) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.replace('Bearer ', '') !== expectedToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // ─── Dashboard: verificar sessão Supabase Auth ───
  if (pathname.startsWith('/dashboard')) {
    let response = NextResponse.next({
      request: { headers: request.headers },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
