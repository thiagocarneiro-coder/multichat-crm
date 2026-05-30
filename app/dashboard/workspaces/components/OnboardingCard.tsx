'use client';

import { useState } from 'react';
import { Copy, Check, Terminal, ExternalLink } from 'lucide-react';

export default function OnboardingCard({ workspaceId, slug }: { workspaceId: string, slug: string }) {
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Consider in production that this should be dynamic based on window.location.origin
  const appDomain = typeof window !== 'undefined' ? window.location.origin : 'https://seusaas.com';
  const redirectUrl = `${appDomain}/go/${slug}`;
  const webhookUrl = `${appDomain}/api/whatsapp/webhook`;

  const scriptContent = `<!-- Tracker SaaS Script -->
<script src="${appDomain}/tracker.js"></script>
<script>
  window.TRACKER_WORKSPACE_ID = '${workspaceId}';
</script>`;

  const copyToClipboard = (text: string, type: 'script' | 'webhook') => {
    navigator.clipboard.writeText(text);
    if (type === 'script') {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } else {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl p-6 text-slate-300 mt-4 border border-slate-800 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <Terminal className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-white font-bold text-lg">Instruções de Implementação</h3>
          <p className="text-sm text-slate-400">Integre o Tracker no site deste cliente em 2 minutos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pass 1: GTM Script */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-slate-200">1. Script do Frontend (GTM)</h4>
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
            Adicione este código no Google Tag Manager ou no &lt;head&gt; do site do cliente. Ele fará o rastreamento das UTMs.
          </p>
        </div>

        {/* Pass 2: Links */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-slate-200">URL do Redirecionador Invisível</h4>
            </div>
            <div className="flex items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
              <code className="text-xs text-slate-300 flex-1 truncate">{redirectUrl}?phone=5511999999999</code>
              <a href={redirectUrl} target="_blank" rel="noreferrer" className="ml-3 text-slate-500 hover:text-white transition-colors">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Use este link nas campanhas em vez de wa.me. Não esqueça de passar o ?phone=.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-slate-200">URL do Webhook (Meta)</h4>
              <button 
                onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                className="text-xs flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
              >
                {copiedWebhook ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedWebhook ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <code className="text-xs text-emerald-400">{webhookUrl}</code>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Configure esta URL no painel de desenvolvedores do Facebook. Ela é única para toda a plataforma.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
