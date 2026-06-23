import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/stripe/portal
 * Cria uma sessão do Stripe Customer Portal para gerenciar assinatura.
 */
export async function POST() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar o customer ID do Stripe
    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .not('stripe_customer_id', 'is', null)
      .limit(1)
      .single();

    if (!workspace?.stripe_customer_id) {
      return NextResponse.json({ error: 'Nenhuma assinatura encontrada' }, { status: 404 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: workspace.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/configuracoes`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error('[Stripe Portal]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
