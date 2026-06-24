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
    console.error('[WA Status] Missing env vars:', { API_URL: !!API_URL, API_KEY: !!API_KEY });
    return NextResponse.json({ error: 'Evolution API não configurada no .env' }, { status: 500 });
  }

  try {
    console.log(`[WA Status] Fetching instances from ${API_URL}`);
    
    const response = await fetch(`${API_URL}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': API_KEY,
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.log(`[WA Status] Evolution API returned ${response.status}`);
      return NextResponse.json({ success: true, state: 'close' }, { status: 200 });
    }

    const instances = await response.json();
    console.log(`[WA Status] Got ${instances.length} instances`);
    
    // Compatível com v1.8.x (inst.instance.instanceName) e v2.x (inst.name)
    const workspaceInstances = instances.filter((inst: any) => {
      const name = inst?.instance?.instanceName || inst?.name || '';
      return name.startsWith(`${slug}-`);
    });

    console.log(`[WA Status] Found ${workspaceInstances.length} instances for slug "${slug}"`);

    if (workspaceInstances.length === 0) {
      return NextResponse.json({ success: true, state: 'close' }, { status: 200 });
    }

    // Pegar a primeira (mais recente)
    const latest = workspaceInstances[0];
    
    // v1.8.x: status em inst.instance.status ('open'/'close'/'connecting')
    // v2.x: status em inst.connectionStatus
    const instanceName = latest?.instance?.instanceName || latest?.name || '';
    const rawState = latest?.instance?.status || latest?.connectionStatus || 'close';
    const state = rawState === 'open' ? 'open' : 'close';

    console.log(`[WA Status] Instance: ${instanceName} | Raw: ${rawState} | State: ${state}`);

    return NextResponse.json({ 
      success: true, 
      state,
      instanceName
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('[WA Status] Exception:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ success: true, state: 'close', debug: message }, { status: 200 });
  }
}
