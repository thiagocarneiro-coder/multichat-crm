import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { instanceName } = await request.json();

    const API_URL = process.env.EVOLUTION_API_URL;
    const API_KEY = process.env.EVOLUTION_GLOBAL_KEY;

    if (!API_URL || !API_KEY) {
      console.error('ERRO: Evolution API não configurada!', { API_URL, API_KEY });
      return NextResponse.json({ error: 'Evolution API não configurada no .env' }, { status: 500 });
    }

    // 1. Cria a instância
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
      const err = await createResponse.text();
      if (!err.includes('already exists')) {
        return NextResponse.json({ error: `Falha ao criar instância: ${err}` }, { status: 500 });
      }
    }

    // 2. Busca o QR Code gerado
    const qrResponse = await fetch(`${API_URL}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': API_KEY,
      },
    });

    if (!qrResponse.ok) {
      const err = await qrResponse.text();
      return NextResponse.json({ error: `Falha ao obter QR Code: ${err}` }, { status: 500 });
    }

    const qrData = await qrResponse.json();
    return NextResponse.json({ success: true, qrcode: qrData.base64, instanceName }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao conectar WhatsApp na API route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
