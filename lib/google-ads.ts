import crypto from 'crypto';

/**
 * Google Ads Conversion via GA4 Measurement Protocol
 * 
 * Envia evento 'purchase' para o GA4 do workspace.
 * Se o GA4 estiver vinculado ao Google Ads, a conversão 
 * é automaticamente importada como conversão offline.
 * 
 * Requisitos no lado do cliente:
 * 1. Criar um GA4 Measurement ID (G-XXXXXXXX)
 * 2. Gerar um API Secret em GA4 > Admin > Data Streams > Measurement Protocol API secrets
 * 3. Vincular GA4 ao Google Ads (GA4 > Admin > Google Ads Links)
 * 4. Marcar 'purchase' como conversão no Google Ads
 */

type GooglePurchaseParams = {
  measurementId: string;   // G-XXXXXXXX
  apiSecret: string;       // API secret do GA4
  phone: string;           // telefone do lead
  saleValue?: number;      // valor da venda
  gclid?: string | null;   // Google Click ID (para atribuição)
  transactionId?: string;  // ID único da transação
};

export async function sendGooglePurchase({
  measurementId,
  apiSecret,
  phone,
  saleValue,
  gclid,
  transactionId,
}: GooglePurchaseParams): Promise<boolean> {
  try {
    if (!measurementId || !apiSecret) {
      console.log('[Google] ⏭️ Sem config GA4, pulando...');
      return false;
    }

    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;

    // client_id é obrigatório - usamos hash do phone como identificador único
    const clientId = crypto.createHash('sha256').update(phone).digest('hex').slice(0, 36);
    const txnId = transactionId || `rig_${Date.now()}_${phone.slice(-4)}`;

    const body: any = {
      client_id: clientId,
      events: [
        {
          name: 'purchase',
          params: {
            currency: 'BRL',
            value: saleValue || 0,
            transaction_id: txnId,
            items: [
              {
                item_name: 'Venda WhatsApp',
                quantity: 1,
                price: saleValue || 0,
              }
            ],
          },
        },
      ],
    };

    // Se temos gclid, adicionar para atribuição direta ao Google Ads
    if (gclid) {
      body.events[0].params.gclid = gclid;
    }

    // user_data para Enhanced Conversions
    const hashedPhone = crypto.createHash('sha256').update(phone).digest('hex');
    body.user_data = {
      sha256_phone_number: [hashedPhone],
    };

    console.log(`[Google] 📊 Enviando purchase: R$${saleValue || 0} | gclid: ${gclid ? '✅' : '❌'}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // GA4 Measurement Protocol retorna 204 em sucesso (sem body)
    if (response.status === 204 || response.ok) {
      console.log(`[Google] ✅ Conversão enviada com sucesso!`);
      return true;
    } else {
      const errorText = await response.text();
      console.error(`[Google] ❌ Erro ${response.status}: ${errorText}`);
      return false;
    }
  } catch (error: any) {
    console.error(`[Google] ❌ Erro ao enviar:`, error.message);
    return false;
  }
}
