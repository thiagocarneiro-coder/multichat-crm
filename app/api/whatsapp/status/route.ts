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
    
    // Filtra as instâncias cujo nome começam com o slug
    const workspaceInstances = instances.filter((inst: any) => inst.name.startsWith(`${slug}-`));

    if (workspaceInstances.length === 0) {
      return NextResponse.json({ success: true, state: 'close' }, { status: 200 });
    }

    // Ordena da mais recente para a mais antiga baseado na data de criação
    workspaceInstances.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const latestInstance = workspaceInstances[0];

    return NextResponse.json({ 
      success: true, 
      state: latestInstance.connectionStatus || 'close',
      instanceName: latestInstance.name
    }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao checar status global:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
