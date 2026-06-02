import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { instanceName: baseInstanceName } = await request.json();
    const uniqueInstanceName = `wp-${Date.now()}`;

    const API_URL = process.env.EVOLUTION_API_URL;
    const API_KEY = process.env.EVOLUTION_GLOBAL_KEY;

    if (!API_URL || !API_KEY) {
      console.error('ERRO: Evolution API não configurada!', { API_URL, API_KEY });
      return NextResponse.json({ error: 'Evolution API não configurada no .env' }, { status: 500 });
    }

    console.log(`[Evolution API] Criando instância única: ${uniqueInstanceName} no host ${API_URL}`);

    // Etapa 1: Cria a instância
    const createResponse = await fetch(`${API_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY,
      },
      body: JSON.stringify({
        instanceName: uniqueInstanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      }),
    });

    console.log("STATUS DA EVOLUTION (CREATE):", createResponse.status);

    let createData: any = {};
    const createText = await createResponse.text();
    try {
      createData = JSON.parse(createText);
      console.log("RESPOSTA DA EVOLUTION (CREATE):", createData);
    } catch (e) {
      console.log("RESPOSTA TEXTO DA EVOLUTION (CREATE):", createText);
    }

    if (!createResponse.ok && !createText.includes('already exists')) {
      return NextResponse.json({ error: 'Falha ao criar instância', details: createData || createText }, { status: 500 });
    }

    // Tenta extrair da própria criação (Evolution V1/algumas V2)
    let base64 = createData?.qrcode?.base64 || createData?.base64 || createData?.hash?.qrcode;

    // Etapa 2: Se não veio na criação, tenta no endpoint de connect com polling
    if (!base64) {
      console.log("[Evolution API] QR Code não veio no create. Iniciando polling...");
      let attempts = 0;
      const maxAttempts = 15;

      while (attempts < maxAttempts && !base64) {
        attempts++;
        console.log(`[Evolution API] Polling tentativa ${attempts}/${maxAttempts}... aguardando 3s`);
        await new Promise(resolve => setTimeout(resolve, 3000));

        try {
          const qrResponse = await fetch(`${API_URL}/instance/connect/${uniqueInstanceName}`, {
            method: 'GET',
            headers: { 'apikey': API_KEY },
          });

          if (qrResponse.ok) {
            const qrText = await qrResponse.text();
            try {
              const qrData = JSON.parse(qrText);
              console.log(`[Evolution API] DADOS DO CONNECT (Tentativa ${attempts}):`, qrData);
              
              base64 = qrData?.qrcode?.base64 || qrData?.base64 || qrData?.base64qr;
              
              if (base64) {
                console.log("[Evolution API] QR Code obtido com sucesso!");
                break;
              }
            } catch (e) {
              console.log('ERRO PARSING QR CODE (CONNECT):', qrText);
            }
          } else {
             console.log(`STATUS DA EVOLUTION (CONNECT) [${attempts}]:`, qrResponse.status);
          }
        } catch (e) {
          console.log(`Erro no fetch do connect na tentativa ${attempts}:`, e);
        }
      }

      if (!base64) {
        return NextResponse.json({ error: 'Tempo esgotado ao aguardar o QR Code da Evolution API. Tente novamente.' }, { status: 504 });
      }
    }
    
    return NextResponse.json({ success: true, base64: base64, instanceName: uniqueInstanceName }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao conectar WhatsApp na API route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
