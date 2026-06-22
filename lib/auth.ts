/**
 * Auth Utilities — Tracker-SaaS
 * 
 * Centralized security validation for API routes.
 * Three levels of protection:
 *   1. Internal API: Bearer token for frontend → backend calls
 *   2. Cron: Vercel Cron Secret for scheduled jobs
 *   3. Webhook: Evolution API / Meta webhook signature validation
 */

import { NextResponse } from 'next/server';

type AuthResult = {
  valid: boolean;
  response?: NextResponse;
};

/**
 * Validates requests from the frontend (dashboard) using a shared Bearer token.
 * The token is set via NEXT_PUBLIC_INTERNAL_API_SECRET (available to both client and server).
 */
export function validateInternalRequest(request: Request): AuthResult {
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.NEXT_PUBLIC_INTERNAL_API_SECRET;

  if (!expectedToken) {
    console.error('[Auth] NEXT_PUBLIC_INTERNAL_API_SECRET not configured');
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 }
      ),
    };
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.replace('Bearer ', '');

  if (token !== expectedToken) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      ),
    };
  }

  return { valid: true };
}

/**
 * Validates Vercel Cron Job requests.
 * Vercel automatically sends an `Authorization: Bearer <CRON_SECRET>` header
 * when invoking cron routes defined in vercel.json.
 */
export function validateCronRequest(request: Request): AuthResult {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[Auth] CRON_SECRET not configured');
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      ),
    };
  }

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[Auth] Unauthorized cron access attempt');
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
    };
  }

  return { valid: true };
}

/**
 * Validates webhook requests from the Evolution API using a shared secret.
 * The Evolution API sends the secret in the `x-webhook-secret` header
 * (or can be configured to do so).
 */
export function validateWebhookSecret(request: Request): AuthResult {
  const webhookSecret = request.headers.get('x-webhook-secret') 
    || request.headers.get('apikey');
  const expectedSecret = process.env.WEBHOOK_GLOBAL_SECRET;

  // If no secret is configured, allow all requests (backwards compatibility during dev)
  if (!expectedSecret) {
    console.warn('[Auth] WEBHOOK_GLOBAL_SECRET not configured — webhook validation SKIPPED');
    return { valid: true };
  }

  if (!webhookSecret || webhookSecret !== expectedSecret) {
    console.warn('[Auth] Invalid webhook secret received');
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'Invalid webhook secret' },
        { status: 401 }
      ),
    };
  }

  return { valid: true };
}
