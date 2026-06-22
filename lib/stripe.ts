import Stripe from 'stripe';

/**
 * Stripe Server Client — SERVER-SIDE ONLY
 * Nunca expor a secret key no frontend.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

/**
 * Planos disponíveis — IDs dos preços criados na Stripe.
 */
export const PLANS = {
  starter: {
    name: 'Starter',
    priceId: 'price_1TlFUbFW48jZ8SzwP1xemTz0',
    price: 97,
    maxWorkspaces: 1,
    maxLeads: 100,
    features: ['1 workspace', '100 leads/mês', 'Rastreamento de origem', 'Dashboard básico'],
  },
  pro: {
    name: 'Pro',
    priceId: 'price_1TlFUbFW48jZ8SzwSZaCK8tt',
    price: 197,
    maxWorkspaces: 5,
    maxLeads: -1, // ilimitado
    features: ['5 workspaces', 'Leads ilimitados', 'IA classificação', 'Bridge Page personalizada', 'Suporte por email'],
  },
  agency: {
    name: 'Agency',
    priceId: 'price_1TlFUcFW48jZ8SzwkSHuBCGt',
    price: 397,
    maxWorkspaces: -1, // ilimitado
    maxLeads: -1,
    features: ['Workspaces ilimitados', 'Leads ilimitados', 'IA classificação 4x/dia', 'API WhatsApp Oficial', 'Suporte prioritário', 'White-label (em breve)'],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
