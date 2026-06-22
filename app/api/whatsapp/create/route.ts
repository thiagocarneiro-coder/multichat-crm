import { NextResponse } from 'next/server';

/**
 * WhatsApp Instance Create/Reconnect — Riguetto Tracker
 * 
 * Fluxo seguro para evitar banimento:
 * 1. Primeiro verifica se já existe uma instância para o workspace (slug)
 * 2. Se existe e está 'open' → retorna sucesso (já conectada)
 * 3. Se existe e está 'close' → tenta reconectar (gera novo QR)
 * 4. Se não existe → cria nova instância
 * 
 * Nunca cria instâncias duplicadas para o mesmo workspace.
 */

export async function POST(request: Request) {
  try {
    const { instanceName: baseInstanceName } = await request.json();

    const API_URL = process.env.EVOLUTION_API_URL;
    const API_KEY = process.env.EVOLUTION_GLOBAL_KEY;

    if (!API_URL || !API_KEY) {
      return NextResponse.json({ error: 'Evolution API não configurada no .env' }, { status: 500 });
    }

    // Extrair o slug base (ex: "agencia-demo-1234567" → "agencia-demo")
    const slug = baseInstanceName.replace(/-\d+$/, '');

    // ─── Etapa 1: Verificar instâncias existentes para este workspace ───
    console.log(`[WhatsApp] Verificando instâncias existentes para slug: ${slug}`);

    let existingInstance: any = null;
    try {
      const listRes = await fetch(`${API_URL}/instance/fetchInstances`, {
        headers: { 'apikey': API_KEY },
        cache: 'no-store'
      });

      if (listRes.ok) {
        const instances = await listRes.json();
        // Encontrar instâncias deste workspace (slug-*)
        const workspaceInstances = instances
          .filter((inst: any) => inst.name.startsWith(`${slug}-`))
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (workspaceInstances.length > 0) {
          existingInstance = workspaceInstances[0]; // Mais recente
          console.log(`[WhatsApp] Instância existente encontrada: ${existingInstance.name} (Status: ${existingInstance.connectionStatus})`);

          // Se já está conectada, retorna sucesso direto
          if (existingInstance.connectionStatus === 'open') {
            console.log(`[WhatsApp] ✅ Já conectada! Retornando sucesso.`);
            return NextResponse.json({ 
              success: true, 
              alreadyConnected: true,
              instanceName: existingInstance.name 
            }, { status: 200 });
          }

          // Limpar instâncias antigas (manter só a mais recente)
          for (let i = 1; i < workspaceInstances.length; i++) {
            const oldInst = workspaceInstances[i];
            console.log(`[WhatsApp] 🗑️ Removendo instância órfã: ${oldInst.name}`);
            try {
              await fetch(`${API_URL}/instance/delete/${oldInst.name}`, {
                method: 'DELETE',
                headers: { 'apikey': API_KEY }
              });
            } catch { /* silencioso */ }
          }
        }
      }
    } catch (err) {
      console.log('[WhatsApp] Erro ao buscar instâncias existentes (não bloqueante):', err);
    }

    // ─── Etapa 2: Reconectar instância existente OU criar nova ───

    let instanceName: string;
    let base64: string | null = null;

    if (existingInstance && existingInstance.connectionStatus !== 'open') {
      // Reconectar a instância existente
      instanceName = existingInstance.name;
      console.log(`[WhatsApp] 🔄 Reconectando instância existente: ${instanceName}`);

      // Tentar connect para gerar novo QR
      const connectRes = await fetch(`${API_URL}/instance/connect/${instanceName}`, {
        headers: { 'apikey': API_KEY },
        cache: 'no-store'
      });

      if (connectRes.ok) {
        const connectData = await connectRes.json();
        base64 = connectData?.qrcode?.base64 || connectData?.base64 || connectData?.base64qr || connectData?.qrcode?.code;
      }

    } else if (!existingInstance) {
      // Criar nova instância
      instanceName = `${slug}-${Date.now()}`;
      console.log(`[WhatsApp] ➕ Criando nova instância: ${instanceName}`);

      const createResponse = await fetch(`${API_URL}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': API_KEY,
        },
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS'
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        if (!errorText.includes('already exists')) {
          return NextResponse.json({ error: 'Falha ao criar instância', details: errorText }, { status: 500 });
        }
      }

      const createData = await createResponse.json().catch(() => ({}));
      base64 = createData?.qrcode?.base64 || createData?.base64 || createData?.hash?.qrcode;
    } else {
      instanceName = existingInstance.name;
    }

    // ─── Etapa 3: Polling para QR Code (se ainda não obteve) ───

    if (!base64) {
      console.log(`[WhatsApp] QR Code não veio direto. Iniciando polling...`);
      let attempts = 0;
      const maxAttempts = 12;

      while (attempts < maxAttempts && !base64) {
        attempts++;
        console.log(`[WhatsApp] Polling ${attempts}/${maxAttempts}... aguardando 3s`);
        await new Promise(resolve => setTimeout(resolve, 3000));

        try {
          const qrResponse = await fetch(`${API_URL}/instance/connect/${instanceName}?t=${Date.now()}`, {
            headers: { 'apikey': API_KEY },
            cache: 'no-store'
          });

          if (qrResponse.ok) {
            const qrData = await qrResponse.json();
            base64 = qrData?.qrcode?.base64 || qrData?.base64 || qrData?.base64qr || qrData?.qrcode?.code;
            if (base64) {
              console.log(`[WhatsApp] ✅ QR Code obtido na tentativa ${attempts}`);
              break;
            }
          }
        } catch (e) {
          console.log(`[WhatsApp] Erro na tentativa ${attempts}:`, e);
        }
      }

      if (!base64) {
        return NextResponse.json({ 
          error: 'Tempo esgotado ao aguardar o QR Code. Tente novamente em 1 minuto.' 
        }, { status: 504 });
      }
    }

    // ─── Etapa 4: Configurar webhook automaticamente ───
    const WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/whatsapp`
      : 'https://tracker-saas-ten.vercel.app/api/webhook/whatsapp';
    const WEBHOOK_SECRET = process.env.WEBHOOK_GLOBAL_SECRET;

    try {
      await fetch(`${API_URL}/webhook/set/${instanceName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': API_KEY },
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: WEBHOOK_URL,
            webhookByEvents: false,
            events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
            headers: WEBHOOK_SECRET ? { 'x-webhook-secret': WEBHOOK_SECRET } : {}
          }
        })
      });
      console.log(`[WhatsApp] 🔗 Webhook configurado: ${WEBHOOK_URL}`);
    } catch (e) {
      console.log('[WhatsApp] ⚠️ Erro ao configurar webhook (não bloqueante):', e);
    }

    return NextResponse.json({ 
      success: true, 
      base64, 
      instanceName 
    }, { status: 200 });

  } catch (error: any) {
    console.error('[WhatsApp] Erro ao conectar:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
