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

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
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
        const subscriptionId = session.subscription as string;

        if (userId && plan) {
          // Atualizar TODOS os workspaces do usuário com o plano
          const { error } = await supabaseAdmin
            .from('workspaces')
            .update({
              plan,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq('user_id', userId);

          if (error) {
            console.error(`[Stripe] ❌ Erro ao atualizar plano:`, error.message);
          } else {
            console.log(`[Stripe] ✅ Plano ${plan} ativado para user ${userId} (customer: ${customerId})`);
          }
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
          .update({ plan: 'free', plan_expires_at: null, stripe_subscription_id: null })
          .eq('stripe_customer_id', customerId);

        console.log(`[Stripe] ❌ Assinatura cancelada para customer ${customerId}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Verificar se foi cancelada com agendamento
        if (subscription.cancel_at_period_end) {
          console.log(`[Stripe] ⏳ Assinatura será cancelada no fim do período para customer ${customerId}`);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Stripe Webhook] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
