'use client';

import { useState } from 'react';
import { Building2, Calendar, Link as LinkIcon, Code2, ChevronDown, ChevronUp, Copy, Check, Terminal, MessageCircle } from 'lucide-react';

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

  // Consider in production that this should be dynamic based on window.location.origin
  const appDomain = typeof window !== 'undefined' ? window.location.origin : 'https://seusaas.com';

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
          <button className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2">
            <Code2 className="w-3.5 h-3.5" />
            Instruções de Integração
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
                  Use esta estrutura de URL no campo de destino das suas campanhas se enviar direto para o WhatsApp.
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
