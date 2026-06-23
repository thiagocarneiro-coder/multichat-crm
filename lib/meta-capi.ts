import crypto from 'crypto';

/**
 * Envia evento de conversão para a Meta Conversions API (CAPI).
 * 
 * Quando a IA classifica um lead como "COMPROU", este módulo envia
 * o evento Purchase de volta para o Meta Ads, permitindo que o
 * algoritmo otimize para conversões reais.
 */

const META_API_VERSION = 'v21.0';

function hashSHA256(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

type ConversionEvent = {
  pixelId: string;
  accessToken: string;
  eventName: 'Purchase' | 'Lead' | 'InitiateCheckout';
  phone: string;        // número do lead (55XXXXXXXXXXX)
  value?: number;       // valor da venda em BRL
  fbclid?: string;      // Facebook Click ID (da click_session)
  eventSourceUrl?: string;
  eventId?: string;     // para deduplicação
};

export async function sendMetaConversion(event: ConversionEvent): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://graph.facebook.com/${META_API_VERSION}/${event.pixelId}/events?access_token=${event.accessToken}`;

    // Formatar o fbc (Facebook Click Cookie)
    const fbc = event.fbclid ? `fb.1.${Date.now()}.${event.fbclid}` : undefined;

    const payload = {
      data: [
        {
          event_name: event.eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: event.eventId || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          action_source: 'website',
          user_data: {
            ph: [hashSHA256(event.phone)],
            ...(fbc && { fbc }),
          },
          ...(event.eventName === 'Purchase' && event.value && {
            custom_data: {
              currency: 'BRL',
              value: event.value,
            },
          }),
          ...(event.eventSourceUrl && { event_source_url: event.eventSourceUrl }),
        },
      ],
    };

    console.log(`[Meta CAPI] Enviando evento ${event.eventName} para pixel ${event.pixelId}...`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`[Meta CAPI] ❌ Erro:`, result);
      return { success: false, error: result.error?.message || 'Erro desconhecido' };
    }

    console.log(`[Meta CAPI] ✅ Evento enviado! Events received: ${result.events_received}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[Meta CAPI] ❌ Exceção:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Envia evento Lead (quando o contato inicia conversa).
 */
export async function sendMetaLead(opts: {
  pixelId: string;
  accessToken: string;
  phone: string;
  fbclid?: string;
  eventSourceUrl?: string;
}) {
  return sendMetaConversion({
    ...opts,
    eventName: 'Lead',
  });
}

/**
 * Envia evento Purchase (quando a IA detecta venda).
 */
export async function sendMetaPurchase(opts: {
  pixelId: string;
  accessToken: string;
  phone: string;
  value?: number;
  fbclid?: string;
  eventSourceUrl?: string;
}) {
  return sendMetaConversion({
    ...opts,
    eventName: 'Purchase',
  });
}
