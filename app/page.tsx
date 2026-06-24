'use client';

import Link from 'next/link';
import { MessageCircle, Columns3, Zap, Shield, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 lg:px-12 py-5">
        <div className="flex items-center gap-2.5 font-bold text-lg">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <MessageCircle className="w-4.5 h-4.5 text-white" />
          </div>
          Multi<span className="text-emerald-400">Chat</span> <span className="text-slate-500 font-normal">CRM</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2">
            Entrar
          </Link>
          <Link href="/signup" className="text-sm font-bold bg-emerald-600 hover:bg-emerald-500 px-5 py-2 rounded-xl transition-colors shadow-lg shadow-emerald-500/20">
            Começar grátis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-5xl mx-auto px-6 pt-20 pb-32 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-semibold mb-8">
            <Zap className="w-3 h-3" /> Atendimento WhatsApp + CRM em uma plataforma
          </div>

          <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-tight">
            Atenda pelo
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 text-transparent bg-clip-text">
              WhatsApp
            </span>
            , organize no
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 text-transparent bg-clip-text">
              CRM
            </span>
          </h1>

          <p className="text-lg text-slate-400 mt-6 max-w-2xl mx-auto leading-relaxed">
            Conecte seu WhatsApp, responda conversas direto pelo navegador e organize seus contatos em um pipeline visual de vendas. Tudo em tempo real.
          </p>

          <div className="flex items-center justify-center gap-4 mt-10">
            <Link 
              href="/signup" 
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold rounded-2xl hover:from-emerald-500 hover:to-teal-400 transition-all shadow-xl shadow-emerald-500/25 text-sm"
            >
              Começar gratuitamente <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-all">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold mb-2">Chat WhatsApp</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Receba e envie mensagens do WhatsApp direto pelo navegador. Tudo em tempo real com notificações instantâneas.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-all">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
              <Columns3 className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold mb-2">CRM Kanban</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Organize seus contatos em etapas do funil com drag-and-drop. Visualize todo seu pipeline de vendas num relance.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-all">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold mb-2">Seguro & Rápido</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Seus dados ficam seguros com autenticação robusta. Infraestrutura otimizada para respostas em milissegundos.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center">
        <p className="text-slate-600 text-sm">
          © {new Date().getFullYear()} MultiChat CRM. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
