import { supabaseAdmin } from '@/lib/supabase';

/**
 * Dispara webhooks configurados para um workspace quando o status do lead muda.
 * 
 * O webhook envia um POST com JSON contendo:
 * - event: 'lead.status_changed'
 * - phone: telefone do lead
 * - old_status: status anterior
 * - new_status: novo status
 * - sale_value: valor da venda (se houver)
 * - detected_source: fonte detectada pela IA
 * - timestamp: ISO timestamp
 */

type WebhookPayload = {
  event: string;
  phone: string;
  old_status: string | null;
  new_status: string;
  sale_value?: number | null;
  detected_source?: string | null;
  workspace_id: string;
  timestamp: string;
};

export async function fireWebhooks(workspaceId: string, payload: WebhookPayload) {
  try {
    // Buscar webhook_url do workspace
    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('webhook_url')
      .eq('id', workspaceId)
      .single();

    if (!workspace?.webhook_url) return;

    const url = workspace.webhook_url;
    console.log(`[Webhook] 🔔 Disparando para ${url}...`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Source': 'riguetto-tracker',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (response.ok) {
      console.log(`[Webhook] ✅ Disparado com sucesso (${response.status})`);
    } else {
      console.error(`[Webhook] ❌ Resposta ${response.status}: ${await response.text()}`);
    }
  } catch (error: any) {
    console.error(`[Webhook] ❌ Erro ao disparar:`, error.message);
  }
}
