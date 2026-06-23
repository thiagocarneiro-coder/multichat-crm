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
  const [isDeleting, setIsDeleting] = useState(false);
  const [metaPixelId, setMetaPixelId] = useState(workspace.meta_pixel_id || '');
  const [metaToken, setMetaToken] = useState(workspace.meta_access_token || '');
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaSaved, setMetaSaved] = useState(false);
  const router = useRouter();

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

          {/* Meta Ads CAPI Config */}
          <div className="bg-white rounded-2xl p-5 mt-6 border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.93 3.78-3.93 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 008.44-9.9c0-5.53-4.5-10.02-10-10.02z"/></svg>
              Meta Ads — Conversions API
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Configure para enviar conversões reais automaticamente ao Meta Ads e otimizar suas campanhas.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Pixel ID</label>
                <input
                  type="text"
                  value={metaPixelId}
                  onChange={(e) => { setMetaPixelId(e.target.value); setMetaSaved(false); }}
                  placeholder="Ex: 1234567890123456"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Access Token (CAPI)</label>
                <input
                  type="password"
                  value={metaToken}
                  onChange={(e) => { setMetaToken(e.target.value); setMetaSaved(false); }}
                  placeholder="Token do System User do Meta Business"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
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
                      setMetaSaved(true);
                    }
                  } catch {} finally {
                    setSavingMeta(false);
                  }
                }}
                disabled={savingMeta || (!metaPixelId && !metaToken)}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {savingMeta ? 'Salvando...' : metaSaved ? '✅ Salvo!' : 'Salvar configuração Meta'}
              </button>
            </div>
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
