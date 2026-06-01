'use client';

import { useState } from 'react';
import { MessageCircle, Loader2 } from 'lucide-react';

export default function WhatsAppButton({ workspaceId, defaultPhone }: { workspaceId: string, defaultPhone?: string }) {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleClick = async () => {
    setIsRedirecting(true);
    
    // Gera código único
    const trackCode = `[TRK-${Date.now()}]`;
    
    try {
      // 1. Grava no nosso servidor via API
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          track_code: trackCode,
          url: window.location.href,
        })
      });
    } catch (e) {
      console.error('Falha ao rastrear o clique', e);
      // Ignora e redireciona de qualquer forma para não travar o usuário
    }

    // 2. Monta o Link
    // Se o workspace não tiver um telefone configurado (no momento não temos o campo no banco), usamos um placeholder ou deixamos o link mais limpo.
    const phone = defaultPhone || ''; 
    const text = encodeURIComponent(`Olá, vim pelo anúncio! Código: ${trackCode}`);
    const whatsappUrl = `https://wa.me/${phone}?text=${text}`;
    
    // 3. Redireciona
    window.location.href = whatsappUrl;
  };

  return (
    <button 
      onClick={handleClick}
      disabled={isRedirecting}
      className="mt-8 w-full max-w-sm mx-auto flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-full shadow-lg shadow-green-600/20 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-70 disabled:scale-100"
    >
      {isRedirecting ? (
        <Loader2 className="w-6 h-6 animate-spin" />
      ) : (
        <MessageCircle className="w-6 h-6" />
      )}
      {isRedirecting ? 'Iniciando conversa...' : 'Falar com Atendimento'}
    </button>
  );
}
