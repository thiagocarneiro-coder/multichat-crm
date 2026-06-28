import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/whatsapp/send — MultiChat CRM
 * 
 * Envia uma mensagem de texto via Evolution API e registra no banco.
 * 
 * Body: { phone: string, message: string, contactId: string }
 */
export async function POST(request: Request) {
  try {
    const { phone, message, contactId, senderId } = await request.json();

    if (!phone || !message || !contactId) {
      return NextResponse.json(
        { error: 'phone, message e contactId são obrigatórios' },
        { status: 400 }
      );
    }

    const API_URL = process.env.EVOLUTION_API_URL;
    const API_KEY = process.env.EVOLUTION_GLOBAL_KEY;

    if (!API_URL || !API_KEY) {
      return NextResponse.json(
        { error: 'Evolution API não configurada no .env' },
        { status: 500 }
      );
    }

    // 1. Buscar o workspace do contato para identificar a instância
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('workspace_id')
      .eq('id', contactId)
      .single();

    if (!contact) {
      return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 });
    }

    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('slug')
      .eq('id', contact.workspace_id)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
    }

    // 2. Encontrar a instância ativa para este workspace
    let instanceName: string | null = null;

    try {
      const listRes = await fetch(`${API_URL}/instance/fetchInstances`, {
        headers: { 'apikey': API_KEY },
        cache: 'no-store'
      });

      if (listRes.ok) {
        const instances = await listRes.json();
        const workspaceInstances = instances
          .filter((inst: any) => {
            const name = inst?.instance?.instanceName || inst?.name || '';
            return name.startsWith(`${workspace.slug}-`);
          })
          .filter((inst: any) => {
            const status = inst?.instance?.status || inst?.connectionStatus || '';
            return status === 'open';
          })
          .sort((a: any, b: any) => {
            const dateA = a?.instance?.createdAt || a?.createdAt || '';
            const dateB = b?.instance?.createdAt || b?.createdAt || '';
            return new Date(dateB).getTime() - new Date(dateA).getTime();
          });

        if (workspaceInstances.length > 0) {
          const latest = workspaceInstances[0];
          instanceName = latest?.instance?.instanceName || latest?.name || null;
        }
      }
    } catch (err) {
      console.error('[WhatsApp Send] Erro ao buscar instância:', err);
    }

    if (!instanceName) {
      return NextResponse.json(
        { error: 'WhatsApp não está conectado. Conecte primeiro nas Configurações.' },
        { status: 400 }
      );
    }

    // 3. Enviar mensagem via Evolution API
    const sendRes = await fetch(`${API_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY,
      },
      body: JSON.stringify({
        number: phone,
        textMessage: {
          text: message
        }
      }),
    });

    if (!sendRes.ok) {
      const errorText = await sendRes.text();
      console.error('[WhatsApp Send] Erro na Evolution API:', errorText);
      return NextResponse.json(
        { error: 'Falha ao enviar mensagem via WhatsApp' },
        { status: 500 }
      );
    }

    // 4. Registrar a mensagem no banco
    const { error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({
        contact_id: contactId,
        content: message,
        role: 'assistant',
        direction: 'outbound',
        sender_id: senderId || null,
      });

    if (msgError) {
      console.error('[WhatsApp Send] Erro ao salvar mensagem:', msgError.message);
    }

    // 5. Atualizar last_message e updated_at do contato
    await supabaseAdmin
      .from('contacts')
      .update({
        last_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId);

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    console.error('[WhatsApp Send] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
