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

    // 1. Cria a instância
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

    if (!createResponse.ok) {
      const errText = await createResponse.text();
      let errorData = errText;
      try {
        errorData = JSON.parse(errText);
      } catch (e) {
        // failed to parse JSON, keep as text
      }
      console.log("ERRO DA EVOLUTION (CREATE):", errorData);
      
      if (!errText.includes('already exists')) {
        return NextResponse.json({ error: 'Falha ao criar instância', details: errorData }, { status: 500 });
      }
    }

    // 2. Busca o QR Code gerado
    const qrResponse = await fetch(`${API_URL}/instance/connect/${uniqueInstanceName}`, {
      method: 'GET',
      headers: {
        'apikey': API_KEY,
      },
    });

    console.log("STATUS DA EVOLUTION (CONNECT/QR):", qrResponse.status);

    if (!qrResponse.ok) {
      const errText = await qrResponse.text();
      let errorData = errText;
      try {
        errorData = JSON.parse(errText);
      } catch (e) { }
      console.log("ERRO DA EVOLUTION (CONNECT/QR):", errorData);
      
      return NextResponse.json({ error: 'Falha ao obter QR Code', details: errorData }, { status: 500 });
    }

    const qrData = await qrResponse.json();
    return NextResponse.json({ success: true, qrcode: qrData.base64, instanceName: uniqueInstanceName }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao conectar WhatsApp na API route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
