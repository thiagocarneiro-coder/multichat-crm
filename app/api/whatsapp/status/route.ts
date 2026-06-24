import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'slug do workspace é obrigatório' }, { status: 400 });
  }

  const API_URL = process.env.EVOLUTION_API_URL;
  const API_KEY = process.env.EVOLUTION_GLOBAL_KEY;

  if (!API_URL || !API_KEY) {
    return NextResponse.json({ error: 'Evolution API não configurada no .env' }, { status: 500 });
  }

  try {
    const response = await fetch(`${API_URL}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': API_KEY,
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      return NextResponse.json({ success: true, state: 'close' }, { status: 200 });
    }

    const instances = await response.json();
    
    // Compatível com v1.8.x (inst.instance.instanceName) e v2.x (inst.name)
    const workspaceInstances = instances.filter((inst: any) => {
      const name = inst.instance?.instanceName || inst.name || '';
      return name.startsWith(`${slug}-`);
    });

    if (workspaceInstances.length === 0) {
      return NextResponse.json({ success: true, state: 'close' }, { status: 200 });
    }

    // Pegar a mais recente
    const latest = workspaceInstances[0];
    
    // v1.8.x: status em inst.instance.status ('open'/'close'/'connecting')
    // v2.x: status em inst.connectionStatus
    const instanceName = latest.instance?.instanceName || latest.name;
    const state = latest.instance?.status || latest.connectionStatus || 'close';

    return NextResponse.json({ 
      success: true, 
      state: state === 'open' ? 'open' : 'close',
      instanceName
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('Erro ao checar status global:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro desconhecido' }, { status: 500 });
  }
}
