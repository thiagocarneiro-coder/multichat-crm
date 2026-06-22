'use client';

import { useState, useEffect } from 'react';
import { Building2, Calendar, Link as LinkIcon, Code2, ChevronDown, ChevronUp, Copy, Check, Terminal, MessageCircle, Smartphone, QrCode, Loader2 } from 'lucide-react';
import { authenticatedFetch } from '@/lib/api';

type Workspace = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export default function WorkspaceCard({ workspace }: { workspace: Workspace }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedBridge, setCopiedBridge] = useState(false);

  // Estados de Conexão WhatsApp
  const [isConnecting, setIsConnecting] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<'open' | 'connecting' | 'close'>('close');
  const [activeInstanceName, setActiveInstanceName] = useState<string | null>(null);

  // Usar a URL pública definida nas variáveis de ambiente, ou fallback para a origem local
  const appDomain = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://seusaas.com');

  const scriptContent = `<script>
  // Script de Interceptação - GTM
  fetch('${appDomain}/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workspace: '${workspace.slug}',
      url: window.location.href,
      // outros dados customizados
    })
  });
</script>`;

  const whatsappLink = `https://wa.me/SEU_NUMERO_AQUI?text=Olá, vim pelo anúncio! [TRACK-{{telefone}}]`;

  const copyToClipboard = (text: string, type: 'script' | 'link' | 'bridge') => {
    navigator.clipboard.writeText(text);
    if (type === 'script') {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } else if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else if (type === 'bridge') {
      setCopiedBridge(true);
      setTimeout(() => setCopiedBridge(false), 2000);
    }
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
        if (!res.base64) {
          setConnectionState('close');
          alert('A Evolution API retornou sucesso, mas não enviou o QR Code (base64 vazio). Verifique os logs do backend.');
          setIsConnecting(false);
          return;
        }
        
        // Ajusta o prefixo base64 se já não vier em formato URI
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
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Terminal className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Integração do Cliente</h3>
                <p className="text-sm text-slate-400">Instruções para rastreio e campanhas deste workspace.</p>
              </div>
            </div>

            <div className="space-y-8">
              {/* Bloco 1: Intercepção via GTM */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-slate-200">1. Intercepção (GTM)</h4>
                  <button 
                    onClick={() => copyToClipboard(scriptContent, 'script')}
                    className="text-xs flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedScript ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
                  <pre className="text-xs text-blue-300 font-mono">
                    <code>{scriptContent}</code>
                  </pre>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Adicione este script no Google Tag Manager para interceptar as ações. O slug <strong className="text-slate-300">{workspace.slug}</strong> já está injetado automaticamente!
                </p>
              </div>

              {/* Bloco 2: Macete do WhatsApp */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-slate-200">2. Macete do WhatsApp (Meta Ads)</h4>
                  <button 
                    onClick={() => copyToClipboard(whatsappLink, 'link')}
                    className="text-xs flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedLink ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <div className="flex items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <code className="text-xs text-emerald-400 flex-1 break-all">{whatsappLink}</code>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  Use esta estrutura de URL no campo de destino das suas campanhas se enviar direto para o WhatsApp sem Bridge Page.
                </p>
              </div>

              {/* Bloco 3: Bridge Page Pública */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-slate-200">3. Bridge Page (Página Ponte Segura)</h4>
                  <button 
                    onClick={() => copyToClipboard(`${appDomain}/go/${workspace.slug}`, 'bridge')}
                    className="text-xs flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedBridge ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedBridge ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <div className="flex items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <code className="text-xs text-blue-400 flex-1 break-all">{`${appDomain}/go/${workspace.slug}`}</code>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  URL pública segura para usar como Destino nas campanhas do Facebook Ads caso você não possua landing page própria.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
