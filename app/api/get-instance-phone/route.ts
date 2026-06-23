import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic'; // Evita cache agressivo

/**
 * GET /api/get-instance-phone?slug=xxx
 * 
 * Retorna o telefone do workspace para a bridge page redirecionar ao WhatsApp.
 * 
 * Estratégia de fallback:
 * 1. Campo `phone` do workspace (configurado manualmente)
 * 2. Número do WhatsApp conectado via Evolution API (ownerJid)
 * 3. Primeiro contato registrado no workspace (último recurso)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Slug não fornecido' }, { status: 400 });
    }

    const { data: workspace, error } = await supabaseAdmin
      .from('workspaces') 
      .select('id, phone')
      .eq('slug', slug)
      .single();

    if (error || !workspace) {
      return NextResponse.json({ error: 'Destino não encontrado' }, { status: 404 });
    }

    let phone = workspace.phone;

    // Fallback 1: Buscar número do WhatsApp conectado na Evolution API
    if (!phone) {
      try {
        const API_URL = process.env.EVOLUTION_API_URL;
        const API_KEY = process.env.EVOLUTION_GLOBAL_KEY;
        
        if (API_URL && API_KEY) {
          const res = await fetch(`${API_URL}/instance/fetchInstances`, {
            headers: { 'apikey': API_KEY },
            cache: 'no-store'
          });
          
          if (res.ok) {
            const instances = await res.json();
            const wsInstance = instances
              .filter((i: any) => i.name?.startsWith(`${slug}-`) && i.connectionStatus === 'open')
              .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
            
            if (wsInstance?.ownerJid) {
              // ownerJid vem como "5511999998888@s.whatsapp.net"
              phone = wsInstance.ownerJid.split('@')[0];
              
              // Salvar no workspace pra não precisar buscar de novo
              await supabaseAdmin
                .from('workspaces')
                .update({ phone })
                .eq('id', workspace.id);
            }
          }
        }
      } catch (e) {
        console.error('Fallback Evolution API falhou:', e);
      }
    }

    // Fallback 2: Buscar do primeiro lead/contato registrado
    if (!phone) {
      try {
        const { data: lead } = await supabaseAdmin
          .from('leads')
          .select('phone_number')
          .eq('workspace_id', workspace.id)
          .limit(1)
          .single();
        
        // Lead phone é do CLIENTE, não do atendente. Não usar como fallback final.
        // Melhor retornar erro claro.
      } catch {}
    }

    if (!phone) {
      return NextResponse.json({ 
        error: 'Número WhatsApp não configurado. Conecte o WhatsApp no painel do Tracker.',
        workspace_id: workspace.id 
      }, { status: 404 });
    }

    return NextResponse.json({ phone, workspace_id: workspace.id }, { status: 200 });

  } catch (error) {
    console.error('Erro fatal na API get-instance-phone:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
