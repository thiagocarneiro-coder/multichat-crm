'use client';

import { useState } from 'react';
import { PLANS, PlanKey } from '@/lib/plans';
import { Check, Zap, Crown, Building2, Loader2, ArrowLeft, BarChart3 } from 'lucide-react';
import Link from 'next/link';

const PLAN_ICONS: Record<PlanKey, React.ReactNode> = {
  starter: <Zap className="w-6 h-6" />,
  pro: <Crown className="w-6 h-6" />,
  agency: <Building2 className="w-6 h-6" />,
};

const PLAN_COLORS: Record<PlanKey, { bg: string; border: string; badge: string; btn: string }> = {
  starter: {
    bg: 'from-slate-800 to-slate-900',
    border: 'border-slate-700',
    badge: 'bg-slate-700 text-slate-300',
    btn: 'bg-white text-slate-900 hover:bg-slate-100',
  },
  pro: {
    bg: 'from-blue-600 to-blue-800',
    border: 'border-blue-400/30 ring-2 ring-blue-400/20',
    badge: 'bg-blue-500 text-white',
    btn: 'bg-white text-blue-700 hover:bg-blue-50',
  },
  agency: {
    bg: 'from-purple-700 to-purple-900',
    border: 'border-purple-500/30',
    badge: 'bg-purple-500 text-white',
    btn: 'bg-white text-purple-700 hover:bg-purple-50',
  },
};

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (plan: string) => {
    setLoading(plan);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error === 'Não autenticado') {
        window.location.href = `/login?plan=${plan}`;
      } else {
        alert(data.error || 'Erro ao criar checkout');
      }
    } catch (err) {
      alert('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 text-sm">
            <ArrowLeft className="w-4 h-4" /> Voltar ao início
          </Link>

          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/25">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            Escolha seu plano
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Rastreie a origem de cada lead do WhatsApp. Comece pequeno e escale conforme cresce.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {(Object.keys(PLANS) as PlanKey[]).map((key) => {
            const plan = PLANS[key];
            const colors = PLAN_COLORS[key];
            const isPro = key === 'pro';

            return (
              <div
                key={key}
                className={`relative rounded-2xl bg-gradient-to-b ${colors.bg} ${colors.border} border p-8 flex flex-col ${
                  isPro ? 'md:-mt-4 md:mb-0 md:scale-105 shadow-2xl shadow-blue-500/10' : 'shadow-xl'
                } transition-transform hover:scale-[1.02]`}
              >
                {isPro && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-blue-400 text-white text-xs font-bold rounded-full shadow-lg uppercase tracking-wider">
                      Mais popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <div className={`w-12 h-12 rounded-xl ${colors.badge} flex items-center justify-center mb-4`}>
                    {PLAN_ICONS[key]}
                  </div>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-slate-400">R$</span>
                    <span className="text-5xl font-extrabold text-white">{plan.price}</span>
                    <span className="text-slate-400 text-sm">/mês</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-slate-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(key)}
                  disabled={loading === key}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 ${colors.btn}`}
                >
                  {loading === key ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Começar agora'
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ / Trust signals */}
        <div className="text-center mt-16 space-y-3">
          <p className="text-slate-500 text-sm">
            💳 Pagamento seguro via Stripe · Cancele quando quiser · Teste grátis de 7 dias
          </p>
          <p className="text-slate-600 text-xs">
            Precisa de algo personalizado? <a href="https://wa.me/553182324668" className="text-blue-400 hover:text-blue-300">Fale conosco</a>
          </p>
        </div>
      </div>
    </div>
  );
}
