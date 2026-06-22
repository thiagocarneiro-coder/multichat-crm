import Stripe from 'stripe';

/**
 * Stripe Server Client — SERVER-SIDE ONLY
 * Nunca expor a secret key no frontend.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

// Re-exportar planos para uso server-side
export { PLANS, type PlanKey } from './plans';
