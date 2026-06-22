/**
 * Authenticated Fetch Helper — Tracker-SaaS
 * 
 * Wraps fetch() to automatically inject the internal API Bearer token.
 * Use this for all frontend → backend API calls to protected routes.
 */

export async function authenticatedFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const token = process.env.NEXT_PUBLIC_INTERNAL_API_SECRET;

  if (!token) {
    console.error('[API] NEXT_PUBLIC_INTERNAL_API_SECRET is not set');
  }

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
}
