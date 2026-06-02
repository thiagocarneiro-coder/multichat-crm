import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const instanceName = searchParams.get('instanceName');

  if (!instanceName) {
    return NextResponse.json({ error: 'instanceName é obrigatório' }, { status: 400 });
  }

  const API_URL = 'http://3.18.103.80:8080';
  const API_KEY = '@Narutogoku1';

  try {
    const response = await fetch(`${API_URL}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': API_KEY,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ success: true, state: 'close' }, { status: 200 });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, state: data.instance?.state || 'close' }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao checar status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
