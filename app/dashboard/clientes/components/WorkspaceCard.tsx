'use client';

import { useState, useEffect } from 'react';
import { Building2, Calendar, Link as LinkIcon, Code2, ChevronDown, ChevronUp, Copy, Check, Terminal, MessageCircle, Smartphone, QrCode, Loader2, Trash2 } from 'lucide-react';
import { authenticatedFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';

// ─── Componente reutilizável para cada link de rastreamento ───
function TrackingLinkBlock({ step, emoji, title, subtitle, link, instructions, color }: {
  step: number;
  emoji: string;
  title: string;
  subtitle: string;
  link: string;
  instructions: string[];
  color: string;
}) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const colorMap: Record<string, string> = {
    blue: 'border-blue-500/30 bg-blue-500/5',
    pink: 'border-pink-500/30 bg-pink-500/5',
    emerald: 'border-emerald-500/30 bg-emerald-500/5',
    red: 'border-red-500/30 bg-red-500/5',
    slate: 'border-slate-500/30 bg-slate-500/5',
  };

  const badgeMap: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-300',
    pink: 'bg-pink-500/20 text-pink-300',
    emerald: 'bg-emerald-500/20 text-emerald-300',
    red: 'bg-red-500/20 text-red-300',
    slate: 'bg-slate-500/20 text-slate-300',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] || colorMap.blue}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-lg">{emoji}</span>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              {title}
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badgeMap[color] || badgeMap.blue}`}>
                Passo {step}
              </span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Link copiável */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 bg-slate-950 px-3 py-2.5 rounded-lg border border-slate-800 overflow-x-auto">
          <code className="text-xs text-emerald-400 break-all whitespace-nowrap">{link}</code>
        </div>
        <button
          onClick={handleCopy}
          className={`flex-shrink-0 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
            copied 
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
              : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white'
          }`}
        >
          {copied ? '✓ Copiado' : 'Copiar'}
        </button>
      </div>

      {/* Instruções */}
      <ul className="space-y-1.5">
        {instructions.map((inst, i) => (
          <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
            <span className="text-slate-600 mt-0.5 flex-shrink-0">•</span>
            <span dangerouslySetInnerHTML={{ __html: inst.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-300">$1</strong>').replace(/`(.*?)`/g, '<code class="text-blue-400 bg-slate-800 px-1 rounded">$1</code>') }} />
          </li>
        ))}
      </ul>
    </div>
  );
}
type Workspace = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  meta_pixel_id?: string | null;
  meta_access_token?: string | null;
  webhook_url?: string | null;
  share_token?: string | null;
  ga4_measurement_id?: string | null;
  ga4_api_secret?: string | null;
};

export default function WorkspaceCard({ workspace }: { workspace: Workspace }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedBridge, setCopiedBridge] = useState(false);

  // Estados de Conexão WhatsApp
  const [isConnecting, setIsConnecting] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<'open' | 'connecting' | 'close'>('close');
  const [activeInstanceName, setActiveInstanceName] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [metaPixelId, setMetaPixelId] = useState(workspace.meta_pixel_id || '');
  const [metaToken, setMetaToken] = useState(workspace.meta_access_token || '');
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaConnected, setMetaConnected] = useState(!!(workspace.meta_pixel_id && workspace.meta_access_token));
  const [editingMeta, setEditingMeta] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(workspace.webhook_url || '');
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [webhookConnected, setWebhookConnected] = useState(!!workspace.webhook_url);
  const [editingWebhook, setEditingWebhook] = useState(false);
  const [shareToken, setShareToken] = useState(workspace.share_token || '');
  const [generatingShare, setGeneratingShare] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [ga4MeasurementId, setGa4MeasurementId] = useState(workspace.ga4_measurement_id || '');
  const [ga4ApiSecret, setGa4ApiSecret] = useState(workspace.ga4_api_secret || '');
  const [savingGoogle, setSavingGoogle] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(!!(workspace.ga4_measurement_id && workspace.ga4_api_secret));
  const [editingGoogle, setEditingGoogle] = useState(false);
  const router = useRouter();

  // Usar a URL pública definida nas variáveis de ambiente, ou fallback para a origem local
  const appDomain = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://seusaas.com');

  const bridgeUrl = `${appDomain}/go/${workspace.slug}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBridge(true);
    setTimeout(() => setCopiedBridge(false), 2000);
  };

  const handleConnectWhatsApp = async () => {
    setIsConnecting(true);
    setConnectionState('connecting');
    try {
      const instanceName = `${workspace.slug}-${Date.now()}`;
      
      const response = await authenticatedFetch('/api/whatsapp/create', {
        method: 'POST',
        body: JSON.stringify({ instanceName })
      });
      
      const res = await response.json();

      if (response.ok && res.success && res.instanceName) {
        // Caso 1: Já estava conectado — mostrar badge direto
        if (res.alreadyConnected) {
          setConnectionState('open');
          setActiveInstanceName(res.instanceName);
          setIsConnecting(false);
          return;
        }

        // Caso 2: QR não veio (erro real)
        if (!res.base64) {
          setConnectionState('close');
          alert('Não foi possível gerar o QR Code. Tente novamente em 1 minuto.');
          setIsConnecting(false);
          return;
        }
        
        // Caso 3: QR veio — mostrar na tela
        const qrData = res.base64.startsWith('data:image') ? res.base64 : `data:image/png;base64,${res.base64}`;
        setQrCodeData(qrData);
        setActiveInstanceName(res.instanceName);
      } else {
        setConnectionState('close');
        alert('Falha ao conectar: ' + (res.error || 'Erro na resposta da API'));
      }
    } catch (error: any) {
      setConnectionState('close');
      alert('Falha ao conectar: ' + error.message);
    }
    setIsConnecting(false);
  };

  // Checagem de status no carregamento inicial
  useEffect(() => {
    const checkInitialStatus = async () => {
      try {
        const response = await authenticatedFetch(`/api/whatsapp/status?slug=${workspace.slug}`);
        const res = await response.json();
        
        if (response.ok && res.success) {
          if (res.state === 'open') {
            setConnectionState('open');
            if (res.instanceName) setActiveInstanceName(res.instanceName);
          } else if (res.state === 'close') {
            setConnectionState('close');
          }
        }
      } catch (error) {
        console.error("Erro ao checar status inicial:", error);
      }
    };
    
    checkInitialStatus();
  }, [workspace.slug]);

  // Polling para checar o status se estiver esperando ler o QR
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (qrCodeData && connectionState === 'connecting' && activeInstanceName) {
      interval = setInterval(async () => {
        try {
          const response = await authenticatedFetch(`/api/whatsapp/status?slug=${workspace.slug}`);
          const res = await response.json();
          
          if (response.ok && res.success) {
            if (res.state === 'open') {
              setConnectionState('open');
              setQrCodeData(null);
            } else if (res.state === 'close') {
              setConnectionState('close');
              setQrCodeData(null);
            }
          }
        } catch (error) {
          console.error("Erro no polling:", error);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [qrCodeData, connectionState, activeInstanceName, workspace.slug]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
      <div 
        className="p-6 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{workspace.name}</h3>
            <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <LinkIcon className="w-3 h-3" />
                {workspace.slug}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Criado em {new Date(workspace.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {connectionState === 'open' && (
            <span className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 rounded-lg flex items-center gap-1.5 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              WhatsApp Conectado
            </span>
          )}
          {metaConnected && (
            <span className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-100 rounded-lg flex items-center gap-1.5 border border-blue-200">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              Meta Conectado
            </span>
          )}
          <button className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2">
            <Code2 className="w-3.5 h-3.5" />
            Configurações
          </button>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </div>
      
      {/* Área Expandida com Instruções */}
      {isExpanded && (
        <div className="px-6 pb-6 bg-slate-50 border-t border-slate-100">

          {/* Link de Rastreamento (Bridge Page) */}
          <div className="bg-white rounded-2xl p-5 mt-6 border border-emerald-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
              Link de Rastreamento
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Use este link nos seus anúncios (Meta Ads, Google Ads). Ele captura UTMs, fbclid e gclid automaticamente.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={bridgeUrl}
                className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
              />
              <button
                onClick={() => copyToClipboard(bridgeUrl)}
                className={`px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                  copiedBridge
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                }`}
              >
                {copiedBridge ? '✓ Copiado!' : 'Copiar'}
              </button>
            </div>
            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[10px] font-bold text-slate-600 mb-1">Exemplo de URL com UTMs:</p>
              <code className="text-[10px] text-slate-500 break-all">
                {bridgeUrl}?utm_source=meta&utm_campaign=minha-campanha
              </code>
            </div>
          </div>

          <div className={`bg-white rounded-2xl p-5 mt-6 border shadow-sm ${metaConnected ? 'border-blue-200' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.93 3.78-3.93 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 008.44-9.9c0-5.53-4.5-10.02-10-10.02z"/></svg>
                Meta Ads — Conversions API
              </h3>
              {metaConnected && !editingMeta && (
                <span className="px-3 py-1 text-xs font-bold text-blue-700 bg-blue-50 rounded-full border border-blue-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Conectado
                </span>
              )}
            </div>

            {metaConnected && !editingMeta ? (
              <div className="mt-3">
                <p className="text-xs text-slate-500">Pixel ID: <span className="font-mono text-slate-700">{metaPixelId.slice(0, 6)}...{metaPixelId.slice(-4)}</span></p>
                <button
                  onClick={() => setEditingMeta(true)}
                  className="mt-3 px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Editar configuração
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Configure para enviar conversões reais automaticamente ao Meta Ads e otimizar suas campanhas.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Pixel ID</label>
                    <input
                      type="text"
                      value={metaPixelId}
                      onChange={(e) => setMetaPixelId(e.target.value)}
                      placeholder="Ex: 1234567890123456"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Access Token (CAPI)</label>
                    <input
                      type="password"
                      value={metaToken}
                      onChange={(e) => setMetaToken(e.target.value)}
                      placeholder="Token do System User do Meta Business"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        setSavingMeta(true);
                        try {
                          const res = await authenticatedFetch(`/api/workspaces/${workspace.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ meta_pixel_id: metaPixelId, meta_access_token: metaToken }),
                          });
                          if (res.ok) {
                            setMetaConnected(!!(metaPixelId && metaToken));
                            setEditingMeta(false);
                          }
                        } catch {} finally {
                          setSavingMeta(false);
                        }
                      }}
                      disabled={savingMeta || !metaPixelId || !metaToken}
                      className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
                    >
                      {savingMeta ? 'Salvando...' : 'Salvar e conectar'}
                    </button>
                    {editingMeta && (
                      <button
                        onClick={() => setEditingMeta(false)}
                        className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Google Ads Config */}
          <div className={`bg-white rounded-2xl p-5 mt-4 border shadow-sm ${googleConnected ? 'border-red-200' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google Ads
              </h3>
              {googleConnected && !editingGoogle && (
                <span className="px-3 py-1 text-xs font-bold text-red-700 bg-red-50 rounded-full border border-red-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Conectado
                </span>
              )}
            </div>

            {googleConnected && !editingGoogle ? (
              <div className="mt-3">
                <p className="text-xs text-slate-500">GA4 ID: <span className="font-mono text-slate-700">{ga4MeasurementId}</span></p>
                <p className="text-[10px] text-slate-400 mt-1">Conversões purchase são enviadas automaticamente ao GA4 → Google Ads.</p>
                <button
                  onClick={() => setEditingGoogle(true)}
                  className="mt-3 px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Editar configuração
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500 mt-1 mb-3">
                  Envie conversões automaticamente para o Google Ads via GA4. Vincule o GA4 ao Google Ads para otimizar campanhas.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Measurement ID</label>
                    <input
                      type="text"
                      value={ga4MeasurementId}
                      onChange={(e) => setGa4MeasurementId(e.target.value)}
                      placeholder="G-XXXXXXXXXX"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">API Secret</label>
                    <input
                      type="password"
                      value={ga4ApiSecret}
                      onChange={(e) => setGa4ApiSecret(e.target.value)}
                      placeholder="Gerado em GA4 > Admin > Data Streams > API Secrets"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        setSavingGoogle(true);
                        try {
                          const res = await authenticatedFetch(`/api/workspaces/${workspace.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ga4_measurement_id: ga4MeasurementId, ga4_api_secret: ga4ApiSecret }),
                          });
                          if (res.ok) {
                            setGoogleConnected(!!(ga4MeasurementId && ga4ApiSecret));
                            setEditingGoogle(false);
                          }
                        } catch {} finally {
                          setSavingGoogle(false);
                        }
                      }}
                      disabled={savingGoogle || !ga4MeasurementId || !ga4ApiSecret}
                      className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50"
                    >
                      {savingGoogle ? 'Salvando...' : 'Salvar e conectar'}
                    </button>
                    {editingGoogle && (
                      <button
                        onClick={() => setEditingGoogle(false)}
                        className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Webhook Config */}
          <div className={`bg-white rounded-2xl p-5 mt-4 border shadow-sm ${webhookConnected ? 'border-amber-200' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                Webhook
              </h3>
              {webhookConnected && !editingWebhook && (
                <span className="px-3 py-1 text-xs font-bold text-amber-700 bg-amber-50 rounded-full border border-amber-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Ativo
                </span>
              )}
            </div>

            {webhookConnected && !editingWebhook ? (
              <div className="mt-3">
                <p className="text-xs text-slate-500">URL: <span className="font-mono text-slate-700 truncate">{webhookUrl.slice(0, 40)}...</span></p>
                <p className="text-[10px] text-slate-400 mt-1">Dispara em toda mudança de status do lead (NOVO → COMPROU etc.)</p>
                <button
                  onClick={() => setEditingWebhook(true)}
                  className="mt-3 px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Editar webhook
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500 mt-1 mb-3">
                  Receba notificações automáticas quando o status de um lead mudar. Integre com Zapier, Make, n8n ou seu CRM.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">URL do Webhook</label>
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://hooks.zapier.com/... ou https://hook.us1.make.com/..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        setSavingWebhook(true);
                        try {
                          const res = await authenticatedFetch(`/api/workspaces/${workspace.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ webhook_url: webhookUrl }),
                          });
                          if (res.ok) {
                            setWebhookConnected(!!webhookUrl);
                            setEditingWebhook(false);
                          }
                        } catch {} finally {
                          setSavingWebhook(false);
                        }
                      }}
                      disabled={savingWebhook || !webhookUrl}
                      className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-50"
                    >
                      {savingWebhook ? 'Salvando...' : 'Salvar e ativar'}
                    </button>
                    {editingWebhook && (
                      <button
                        onClick={() => setEditingWebhook(false)}
                        className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Dashboard Compartilhável */}
          <div className={`bg-white rounded-2xl p-5 mt-4 border shadow-sm ${shareToken ? 'border-indigo-200' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                Dashboard para Clientes
              </h3>
              {shareToken && (
                <span className="px-3 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 rounded-full border border-indigo-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  Ativo
                </span>
              )}
            </div>

            {shareToken ? (
              <div className="mt-3 space-y-3">
                <p className="text-xs text-slate-500">Seu cliente pode acessar o dashboard por este link (somente leitura):</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${appDomain}/share/${shareToken}`}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${appDomain}/share/${shareToken}`);
                      setCopiedShare(true);
                      setTimeout(() => setCopiedShare(false), 2000);
                    }}
                    className={`px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                      copiedShare
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-indigo-600 text-white hover:bg-indigo-500'
                    }`}
                  >
                    {copiedShare ? '✓ Copiado!' : 'Copiar'}
                  </button>
                </div>
                <button
                  onClick={async () => {
                    if (!confirm('Revogar acesso? O link atual deixará de funcionar.')) return;
                    try {
                      const res = await authenticatedFetch(`/api/workspaces/${workspace.id}/share`, { method: 'DELETE' });
                      if (res.ok) setShareToken('');
                    } catch {}
                  }}
                  className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                >
                  Revogar acesso
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500 mt-1 mb-3">
                  Gere um link público para seu cliente acompanhar as métricas em tempo real, sem precisar de login.
                </p>
                <button
                  onClick={async () => {
                    setGeneratingShare(true);
                    try {
                      const res = await authenticatedFetch(`/api/workspaces/${workspace.id}/share`, { method: 'POST' });
                      if (res.ok) {
                        const data = await res.json();
                        setShareToken(data.share_token);
                      }
                    } catch {} finally {
                      setGeneratingShare(false);
                    }
                  }}
                  disabled={generatingShare}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
                  {generatingShare ? 'Gerando...' : 'Gerar link compartilhável'}
                </button>
              </>
            )}
          </div>

          {/* Botão Remover Cliente */}
          <div className="bg-white rounded-2xl p-5 mt-6 border border-red-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Remover Cliente</h3>
                <p className="text-xs text-slate-500 mt-0.5">Remove o workspace e todos os leads associados. Esta ação não pode ser desfeita.</p>
              </div>
              <button
                onClick={async () => {
                  if (!confirm(`Tem certeza que deseja remover "${workspace.name}"? Todos os leads serão perdidos.`)) return;
                  setIsDeleting(true);
                  try {
                    const res = await authenticatedFetch(`/api/workspaces/${workspace.id}`, { method: 'DELETE' });
                    if (res.ok) {
                      router.refresh();
                    } else {
                      const data = await res.json();
                      alert(data.error || 'Erro ao remover');
                    }
                  } catch (e: any) {
                    alert('Erro: ' + e.message);
                  }
                  setIsDeleting(false);
                }}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isDeleting ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
          
          {/* Conexão WhatsApp (Evolution API) */}
          <div className="bg-white rounded-2xl p-6 mt-6 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-slate-900 font-bold text-lg">Conexão WhatsApp</h3>
                  <p className="text-sm text-slate-500">Conecte o número de atendimento do cliente escaneando o QR Code.</p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <span className="text-amber-500 mt-0.5 text-sm">⚠️</span>
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  <strong>ATENÇÃO:</strong> Nunca desconecte a sessão do WhatsApp manualmente pelo seu celular. Quedas frequentes ou desconexões manuais em APIs não-oficiais ativam o filtro de spam da Meta e causam banimento imediato do número.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 min-w-[200px]">
              {connectionState === 'open' ? (
                <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-100 w-full">
                  <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-emerald-800">Conectado com Sucesso</p>
                </div>
              ) : qrCodeData ? (
                <div className="text-center">
                  <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm mb-2">
                    <img src={qrCodeData} alt="WhatsApp QR Code" className="w-40 h-40 object-contain" />
                  </div>
                  <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Aguardando leitura...
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleConnectWhatsApp}
                  disabled={isConnecting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />}
                  {isConnecting ? 'Gerando...' : 'Gerar QR Code'}
                </button>
              )}
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-6 text-slate-300 mt-6 border border-slate-800 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Terminal className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Links de Rastreamento</h3>
                <p className="text-sm text-slate-400">Use os links abaixo nas suas fontes de tráfego para rastrear 100% dos leads.</p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3 mb-6">
              <span className="text-emerald-400 mt-0.5 text-sm">💡</span>
              <p className="text-xs text-emerald-300 leading-relaxed">
                <strong>Siga os passos abaixo</strong> para rastrear todos os seus leads. Cada plataforma tem um link específico — basta copiar e colar no local indicado.
              </p>
            </div>

            <div className="space-y-6">

              {/* ─── 1. Meta Ads (Pulo do Gato) ─── */}
              <TrackingLinkBlock
                step={1}
                emoji="📘"
                title="Meta Ads (Facebook & Instagram Ads)"
                subtitle="O 'pulo do gato' — campanha de conversão para site"
                link={`${appDomain}/go/${workspace.slug}?utm_source=meta_ads&utm_campaign=NOME_DA_CAMPANHA`}
                instructions={[
                  "No Gerenciador de Anúncios, crie uma campanha de **Vendas** com destino **Site**.",
                  "No campo 'URL do Site', cole o link acima (troque NOME_DA_CAMPANHA pelo nome real).",
                  "O lead será redirecionado para o WhatsApp automaticamente pela nossa Bridge Page.",
                  "A origem **Meta Ads** ficará registrada automaticamente em cada lead."
                ]}
                color="blue"
              />

              {/* ─── 2. Instagram Bio ─── */}
              <TrackingLinkBlock
                step={2}
                emoji="📸"
                title="Instagram (Link na Bio)"
                subtitle="Rastreie leads que vêm da bio do seu Instagram"
                link={`${appDomain}/go/${workspace.slug}?utm_source=instagram&utm_campaign=bio`}
                instructions={[
                  "Vá em **Editar Perfil** no Instagram e cole este link no campo 'Site'.",
                  "Todo lead que clicar no link da bio será rastreado como **Instagram**."
                ]}
                color="pink"
              />

              {/* ─── 3. Google Ads ─── */}
              <TrackingLinkBlock
                step={3}
                emoji="🔍"
                title="Google Ads"
                subtitle="Campanhas de busca, display ou YouTube Ads"
                link={`${appDomain}/go/${workspace.slug}?utm_source=google_ads&utm_campaign=NOME_DA_CAMPANHA&gclid={gclid}`}
                instructions={[
                  "Use este link como **URL final** da campanha no Google Ads.",
                  "O `{gclid}` será preenchido automaticamente pelo Google.",
                  "Funciona para campanhas de Busca, Display e Performance Max."
                ]}
                color="emerald"
              />

              {/* ─── 4. YouTube ─── */}
              <TrackingLinkBlock
                step={4}
                emoji="▶️"
                title="YouTube"
                subtitle="Link na descrição de vídeos ou canal"
                link={`${appDomain}/go/${workspace.slug}?utm_source=youtube&utm_campaign=NOME_DO_VIDEO`}
                instructions={[
                  "Cole na **descrição do vídeo** ou nos **cards/telas finais**.",
                  "Troque NOME_DO_VIDEO pelo título ou referência do conteúdo."
                ]}
                color="red"
              />

              {/* ─── 5. TikTok ─── */}
              <TrackingLinkBlock
                step={5}
                emoji="🎵"
                title="TikTok"
                subtitle="Link na bio ou TikTok Ads"
                link={`${appDomain}/go/${workspace.slug}?utm_source=tiktok&utm_campaign=NOME_DA_CAMPANHA`}
                instructions={[
                  "Use na **bio do TikTok** ou como URL de destino em **TikTok Ads**.",
                  "Para ads, troque NOME_DA_CAMPANHA pela identificação da campanha."
                ]}
                color="slate"
              />

              {/* ─── 6. Landing Pages / Botões ─── */}
              <TrackingLinkBlock
                step={6}
                emoji="🌐"
                title="Landing Pages & Sites (Botões de WhatsApp)"
                subtitle="Links personalizados para botões CTA na sua LP"
                link={`${appDomain}/go/${workspace.slug}?utm_source=landing_page&utm_campaign=NOME_DA_PAGINA`}
                instructions={[
                  "Use como `href` dos botões **'Falar no WhatsApp'** da sua landing page.",
                  "Cada botão pode ter uma campanha diferente para rastrear qual página converte mais.",
                  "Também funciona para links em e-mails marketing e newsletters."
                ]}
                color="blue"
              />

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
