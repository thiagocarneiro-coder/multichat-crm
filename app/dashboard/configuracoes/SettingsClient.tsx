'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { User, Mail, Lock, CreditCard, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type Props = {
  userEmail: string;
  userName: string;
  planName: string | null;
  subscriptionId: string | null;
};

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter — R$97/mês',
  pro: 'Pro — R$197/mês',
  agency: 'Agency — R$397/mês',
};

export default function SettingsClient({ userEmail, userName, planName, subscriptionId }: Props) {
  const [name, setName] = useState(userName);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleUpdateName = async () => {
    setLoading('name');
    setMessage(null);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Nome atualizado com sucesso!' });
    }
    setLoading('');
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'A nova senha precisa ter pelo menos 6 caracteres.' });
      return;
    }
    setLoading('password');
    setMessage(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
      setCurrentPassword('');
      setNewPassword('');
    }
    setLoading('');
  };

  return (
    <div className="py-8 px-6 lg:px-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-slate-500">Gerencie sua conta e assinatura.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Perfil */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-slate-400" /> Perfil
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500">
              <Mail className="w-4 h-4" /> {userEmail}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleUpdateName}
            disabled={loading === 'name' || name === userName}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading === 'name' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar nome'}
          </button>
        </div>
      </div>

      {/* Senha */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-slate-400" /> Alterar Senha
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Nova senha</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleUpdatePassword}
            disabled={loading === 'password' || !newPassword}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading === 'password' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Alterar senha'}
          </button>
        </div>
      </div>

      {/* Plano */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-slate-400" /> Assinatura
        </h2>
        {planName ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="font-bold text-slate-900">{PLAN_LABELS[planName] || planName}</p>
                <p className="text-xs text-slate-500 mt-0.5">Assinatura ativa</p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Ativo</span>
            </div>
            <p className="text-xs text-slate-400">
              Para gerenciar sua assinatura, acesse o portal do cliente Stripe ou entre em contato pelo{' '}
              <a href="https://wa.me/553182324668" className="text-blue-500">WhatsApp</a>.
            </p>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-slate-500 text-sm mb-4">Você ainda não tem um plano ativo.</p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-500 transition-colors"
            >
              Ver planos e preços
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
