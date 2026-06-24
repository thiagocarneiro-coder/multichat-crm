'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { User, Mail, Lock, Loader2, CheckCircle, AlertCircle, Smartphone, QrCode, Wifi, WifiOff } from 'lucide-react';
import { authenticatedFetch } from '@/lib/api';

type Props = {
  userEmail: string;
  userName: string;
};

export default function SettingsClient({ userEmail, userName }: Props) {
  const [name, setName] = useState(userName);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // WhatsApp connection state
  const [whatsappState, setWhatsappState] = useState<'open' | 'connecting' | 'close'>('close');
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Checar status WhatsApp no carregamento
  useEffect(() => {
    const checkWhatsAppStatus = async () => {
      try {
        // Buscar workspace do usuário para obter slug
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('[WA Status] No user found');
          return;
        }

        const { data: workspace } = await supabase
          .from('workspaces')
          .select('slug')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (!workspace) {
          console.log('[WA Status] No workspace found');
          return;
        }

        console.log('[WA Status] Checking slug:', workspace.slug);
        const res = await authenticatedFetch(`/api/whatsapp/status?slug=${workspace.slug}`);
        const data = await res.json();
        console.log('[WA Status] Response:', res.status, JSON.stringify(data));
        
        if (res.ok && data.success && data.state === 'open') {
          setWhatsappState('open');
          console.log('[WA Status] ✅ WhatsApp is OPEN');
        } else {
          console.log('[WA Status] ❌ WhatsApp not open. state:', data.state);
        }
      } catch (err) {
        console.error('[WA Status] Error:', err);
      }
    };

    checkWhatsAppStatus();
  }, []);

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
      setNewPassword('');
    }
    setLoading('');
  };

  const handleConnectWhatsApp = async () => {
    setIsConnecting(true);
    setWhatsappState('connecting');
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('slug')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (!workspace) {
        setMessage({ type: 'error', text: 'Workspace não encontrado.' });
        setIsConnecting(false);
        setWhatsappState('close');
        return;
      }

      const instanceName = `${workspace.slug}-${Date.now()}`;
      const res = await authenticatedFetch('/api/whatsapp/create', {
        method: 'POST',
        body: JSON.stringify({ instanceName }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.alreadyConnected) {
          setWhatsappState('open');
          setIsConnecting(false);
          setMessage({ type: 'success', text: 'WhatsApp já está conectado!' });
          return;
        }

        if (data.base64) {
          const qr = data.base64.startsWith('data:image') ? data.base64 : `data:image/png;base64,${data.base64}`;
          setQrCodeData(qr);
        } else {
          setWhatsappState('close');
          setMessage({ type: 'error', text: 'Não foi possível gerar o QR Code. Tente novamente.' });
        }
      } else {
        setWhatsappState('close');
        setMessage({ type: 'error', text: data.error || 'Erro ao conectar WhatsApp.' });
      }
    } catch (err: unknown) {
      setWhatsappState('close');
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erro desconhecido' });
    }

    setIsConnecting(false);
  };

  // Polling para checar status após QR Code
  useEffect(() => {
    if (!qrCodeData || whatsappState !== 'connecting') return;

    const checkConnection = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: workspace } = await supabase
          .from('workspaces')
          .select('slug')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (!workspace) return;

        const res = await authenticatedFetch(`/api/whatsapp/status?slug=${workspace.slug}`);
        const data = await res.json();

        if (res.ok && data.success && data.state === 'open') {
          setWhatsappState('open');
          setQrCodeData(null);
          setMessage({ type: 'success', text: 'WhatsApp conectado com sucesso!' });
        }
      } catch (err) {
        console.error('Erro no polling:', err);
      }
    };

    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, [qrCodeData, whatsappState]);

  return (
    <div className="py-8 px-6 lg:px-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-slate-500">Gerencie sua conta e conexão WhatsApp.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* WhatsApp Connection */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-emerald-500" /> Conexão WhatsApp
        </h2>

        {whatsappState === 'open' ? (
          <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <Wifi className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-emerald-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                WhatsApp Conectado
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">Mensagens sendo recebidas e enviadas normalmente.</p>
            </div>
          </div>
        ) : qrCodeData ? (
          <div className="text-center py-4">
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm inline-block mb-3">
              <img src={qrCodeData} alt="WhatsApp QR Code" className="w-48 h-48 object-contain" />
            </div>
            <p className="text-sm text-slate-600 font-medium flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Aguardando leitura do QR Code...
            </p>
            <p className="text-xs text-slate-400 mt-1">Abra o WhatsApp no celular → Configurações → Aparelhos Conectados → Conectar</p>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                <WifiOff className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                <p className="font-bold text-slate-700">WhatsApp Desconectado</p>
                <p className="text-xs text-slate-500 mt-0.5">Conecte seu WhatsApp para começar a receber e enviar mensagens.</p>
              </div>
            </div>
            <button
              onClick={handleConnectWhatsApp}
              disabled={isConnecting}
              className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
              {isConnecting ? 'Gerando...' : 'Conectar'}
            </button>
          </div>
        )}

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>⚠️ ATENÇÃO:</strong> Nunca desconecte a sessão do WhatsApp manualmente pelo seu celular. Quedas frequentes ou desconexões manuais causam banimento do número.
          </p>
        </div>
      </div>

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
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>
          <button
            onClick={handleUpdateName}
            disabled={loading === 'name' || name === userName}
            className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center gap-2"
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
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>
          <button
            onClick={handleUpdatePassword}
            disabled={loading === 'password' || !newPassword}
            className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading === 'password' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Alterar senha'}
          </button>
        </div>
      </div>
    </div>
  );
}
