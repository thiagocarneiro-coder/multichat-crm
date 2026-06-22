'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

export default function BridgePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDestination = async () => {
      try {
        const slug = params?.slug as string;
        if (!slug) return;
        
        console.log('🚀 Iniciando busca do destino para o slug:', slug);

        const response = await fetch(`/api/get-instance-phone?slug=${slug}`, {
          method: 'GET',
          headers: {
            'ngrok-skip-browser-warning': 'true',
            'Content-Type': 'application/json'
          }
        });

        console.log('📥 Resposta do backend recebida. Status:', response.status);
        
        if (!response.ok) {
          throw new Error('Falha na resposta da API');
        }
        
        const data = await response.json();

        if (!data || !data.phone) {
          setError('Destino não encontrado ou número não configurado no banco de dados.');
          setLoading(false);
          return;
        }

        const cleanPhone = String(data.phone).replace(/\D/g, '');
        
        if (cleanPhone.length < 10) {
          setError('O número de telefone configurado é inválido.');
          setLoading(false);
          return;
        }

        const utmSource = searchParams.get('utm_source') || 'não informado';
        const utmCampaign = searchParams.get('utm_campaign') || 'não informado';
        const mensagem = `Olá! Vim pelo anúncio e gostaria de mais informações. [utm_source: ${utmSource}, utm_campaign: ${utmCampaign}]`;

        setTimeout(() => {
          window.location.href = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensagem)}`;
        }, 1500);

      } catch (err) {
        console.error('Erro na Bridge Page:', err);
        setError('Erro de comunicação com o servidor.');
        setLoading(false);
      }
    };

    fetchDestination();
  }, [params, searchParams]);

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
        <div className="text-center text-red-600 font-medium p-6 bg-white rounded-lg shadow-sm border border-red-100">
          ⚠️ {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mb-4"></div>
      <p className="text-gray-600 font-medium">Aguarde, você está sendo direcionado para um atendente agora...</p>
    </div>
  );
}
