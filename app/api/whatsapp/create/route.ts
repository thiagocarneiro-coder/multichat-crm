import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { instanceName } = await request.json();

    const API_URL = 'http://3.18.103.80:8080';
    const API_KEY = '@Narutogoku1';

    console.log('Testando API:', API_URL, 'com chave:', API_KEY);

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
