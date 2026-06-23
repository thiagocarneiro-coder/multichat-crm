/**
 * Planos disponíveis — IDs dos preços criados na Stripe.
 * Arquivo separado para poder ser importado no client-side.
 */
export const PLANS = {
  starter: {
    name: 'Starter',
    priceId: 'price_1TlJocFW48jZ8SzwvUalCuTa',
    price: 97,
    maxWorkspaces: 1,
    maxLeads: -1,
    features: ['1 workspace', 'Leads ilimitados', 'Rastreamento de origem', 'Dashboard completo'],
  },
  pro: {
    name: 'Pro',
    priceId: 'price_1TlJodFW48jZ8SzwPvdEF3CM',
    price: 197,
    maxWorkspaces: 5,
    maxLeads: -1,
    features: ['5 workspaces', 'Leads ilimitados', 'IA classificação', 'Bridge Page personalizada', 'Suporte por email'],
  },
  agency: {
    name: 'Agency',
    priceId: 'price_1TlJodFW48jZ8Szw2MPRrOJV',
    price: 397,
    maxWorkspaces: -1,
    maxLeads: -1,
    features: ['Workspaces ilimitados', 'Leads ilimitados', 'IA classificação 4x/dia', 'API WhatsApp Oficial', 'Suporte prioritário', 'White-label (em breve)'],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
