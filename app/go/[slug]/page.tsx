'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { MessageCircle, Shield, Clock, CheckCircle2 } from 'lucide-react';

/**
 * Bridge Page — Riguetto Tracker
 * 
 * Página ponte profissional que intercepta UTMs antes de redirecionar ao WhatsApp.
 * Projetada para parecer uma landing page legítima para a Meta não rejeitar.
 * 
 * Fluxo: Campanha (Meta/Google/etc) → Bridge Page → Captura UTMs → WhatsApp
 */

export default function BridgePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  // 1. Buscar o telefone do workspace e montar URL de redirect
  useEffect(() => {
    const fetchDestination = async () => {
      try {
        const slug = params?.slug as string;
        if (!slug) return;

        const response = await fetch(`/api/get-instance-phone?slug=${slug}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });

        if (!response.ok) throw new Error('Falha na resposta da API');
        
        const data = await response.json();
        if (!data?.phone) {
          setError('Serviço temporariamente indisponível. Tente novamente em instantes.');
          return;
        }

        const cleanPhone = String(data.phone).replace(/\D/g, '');
        if (cleanPhone.length < 10) {
          setError('Configuração em andamento. Tente novamente em instantes.');
          return;
        }

        setPhone(cleanPhone);

        const utmSource = searchParams.get('utm_source') || 'direto';
        const utmCampaign = searchParams.get('utm_campaign') || 'não informado';
        const mensagem = `Olá! Gostaria de mais informações. [utm_source: ${utmSource}, utm_campaign: ${utmCampaign}]`;
        setRedirectUrl(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensagem)}`);

      } catch (err) {
        setError('Erro de comunicação. Tente novamente.');
      }
    };

    fetchDestination();
  }, [params, searchParams]);

  // 2. Countdown de 5 segundos → redirect
  useEffect(() => {
    if (!redirectUrl) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = redirectUrl;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [redirectUrl]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Estamos preparando tudo</h1>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex flex-col">
      
      {/* Header minimalista — parece LP real */}
      <header className="w-full py-4 px-6 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-800 text-sm">Atendimento Especializado</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <Shield className="w-3.5 h-3.5" />
            Conexão segura
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center">
          
          {/* Ícone animado */}
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto relative">
              <MessageCircle className="w-12 h-12 text-emerald-600" />
              {/* Pulse ring */}
              <div className="absolute inset-0 rounded-full border-2 border-emerald-300 animate-ping opacity-30"></div>
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
            Agradecemos pelo seu interesse!
          </h1>
          <p className="text-slate-500 text-lg mb-8">
            Estamos conectando você com o próximo atendente disponível via WhatsApp.
          </p>

          {/* Countdown */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative w-16 h-16">
                {/* Circular progress */}
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                  <circle 
                    cx="32" cy="32" r="28" fill="none" 
                    stroke="#10b981" strokeWidth="4" 
                    strokeLinecap="round"
                    strokeDasharray={`${(countdown / 5) * 175.93} 175.93`}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-2xl font-black text-emerald-600">
                  {countdown}
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-500">
              Redirecionando em <strong className="text-slate-700">{countdown} segundos</strong>...
            </p>

            {redirectUrl && (
              <a 
                href={redirectUrl}
                className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-md text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                Ir agora para o WhatsApp
              </a>
            )}
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Dados protegidos
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              Atendimento humano
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Resposta em minutos
            </div>
          </div>
        </div>
      </main>

      {/* Footer minimalista */}
      <footer className="py-4 text-center border-t border-slate-100 bg-white/60">
        <p className="text-xs text-slate-400">© {new Date().getFullYear()} • Atendimento seguro e verificado</p>
      </footer>
    </div>
  );
}
