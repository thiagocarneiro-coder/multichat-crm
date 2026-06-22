import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import Stripe from 'stripe';

/**
 * POST /api/stripe/webhook
 * Recebe eventos do Stripe (checkout completo, assinatura cancelada, etc.)
 * e atualiza o plano do usuário no Supabase.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  // Se tiver webhook secret configurado, valida a assinatura
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // Em desenvolvimento/teste, aceita sem validação
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err: any) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log(`[Stripe Webhook] Event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan;
        const customerId = session.customer as string;

        if (userId && plan) {
          // Atualizar TODOS os workspaces do usuário com o plano e customer ID
          await supabaseAdmin
            .from('workspaces')
            .update({
              plan,
              stripe_customer_id: customerId,
              plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 dias
            })
            .eq('user_id', userId);

          console.log(`[Stripe] ✅ Plano ${plan} ativado para user ${userId}`);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Renovar o plano por mais 30 dias
        await supabaseAdmin
          .from('workspaces')
          .update({
            plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        console.log(`[Stripe] 🔄 Plano renovado para customer ${customerId}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Downgrade para free
        await supabaseAdmin
          .from('workspaces')
          .update({ plan: 'free', plan_expires_at: null })
          .eq('stripe_customer_id', customerId);

        console.log(`[Stripe] ❌ Assinatura cancelada para customer ${customerId}`);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Stripe Webhook] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
