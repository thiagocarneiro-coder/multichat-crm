/**
 * Auth Utilities — MultiChat CRM
 * 
 * Centralized security validation for API routes.
 */

import { NextResponse } from 'next/server';

type AuthResult = {
  valid: boolean;
  response?: NextResponse;
};

/**
 * Validates requests from the frontend using a shared Bearer token.
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
 * Validates webhook requests from the Evolution API.
 */
export function validateWebhookSecret(request: Request): AuthResult {
  const webhookSecret = request.headers.get('x-webhook-secret') 
    || request.headers.get('apikey');
  const expectedSecret = process.env.WEBHOOK_GLOBAL_SECRET;

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
