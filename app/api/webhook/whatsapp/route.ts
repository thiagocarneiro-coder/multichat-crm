import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateWebhookSecret } from '@/lib/auth';

/**
 * Webhook WhatsApp — MultiChat CRM
 * 
 * Recebe mensagens do WhatsApp via Evolution API.
 * 
 * Fluxo:
 * 1. Valida webhook secret
 * 2. Extrai telefone + texto do payload
 * 3. Upsert em `contacts` + insert em `messages`
 * 4. Incrementa contador de unread (para mensagens de clientes)
 * 
 * REGRA DE OURO: Sempre retorna 200 OK para evitar retries.
 */

export async function POST(request: Request) {
  let debugStep = 'init';
  try {
    debugStep = 'parse_body';
    const body = await request.json();

    debugStep = 'validate_secret';
    const auth = validateWebhookSecret(request);
    if (!auth.valid) return auth.response!;

    console.log('\n=============================================');
    console.log("MULTICHAT CRM — WEBHOOK RECEBIDO:", JSON.stringify(body, null, 2).slice(0, 500));
    console.log('=============================================\n');

    // ─── 1. Extrair dados do payload (Evolution API) ───

    let phone_number = '';
    let message_text = '';
    let pushName = 'Desconhecido';
    let fromMe = false;
    const instanceName = body?.instance || '';

    if (body?.data?.key?.remoteJid) {
      const messageData = body.data;
      const remoteJid = messageData.key.remoteJid || '';
      fromMe = messageData.key.fromMe || false;
      pushName = messageData.pushName || body?.data?.pushName || 'Desconhecido';
      // Preservar o @lid para contas ocultas (Click-to-WhatsApp ads)
      phone_number = remoteJid.includes('@lid') ? remoteJid : remoteJid.split('@')[0];
      message_text = messageData.message?.conversation 
        || messageData.message?.extendedTextMessage?.text 
        || '';
    } else if (body?.event === 'messages.upsert' && body?.data?.message) {
      const msgData = body.data.message;
      fromMe = msgData?.key?.fromMe || false;
      pushName = body.data?.pushName || 'Desconhecido';
      const remoteJid = msgData?.key?.remoteJid || '';
      // Preservar o @lid para contas ocultas (Click-to-WhatsApp ads)
      phone_number = remoteJid.includes('@lid') ? remoteJid : remoteJid.split('@')[0];
      const content = msgData?.message;
      message_text = content?.conversation || content?.extendedTextMessage?.text || '';
    }

    // ─── Evento de conexão: salvar phone no workspace automaticamente ───
    if (body?.event === 'connection.update' && body?.data?.state === 'open' && body?.sender) {
      const ownerPhone = body.sender.split('@')[0];
      const slugMatch = instanceName.match(/^(.+)-\d+$/);
      if (slugMatch && ownerPhone) {
        const slug = slugMatch[1];
        const { error } = await supabaseAdmin
          .from('workspaces')
          .update({ phone: ownerPhone })
          .eq('slug', slug);
        if (!error) {
          console.log(`📱 Phone ${ownerPhone} salvo no workspace '${slug}'`);
        }
      }
      return new Response('Connection update processed', { status: 200 });
    }

    // ─── 2. Filtros essenciais ───

    if (!phone_number || phone_number.includes('@g.us')) {
      return new Response('Ignorando grupo/sem JID', { status: 200 });
    }
    if (!message_text) {
      return new Response('Ignorando mensagem sem texto', { status: 200 });
    }

    const messageRole = fromMe ? 'assistant' : 'user';

    // ─── 3. Identificar workspace a partir da instância ───

    let workspaceId: string | null = null;
    const slugMatch = instanceName.match(/^(.+)-\d+$/);
    if (slugMatch) {
      const slug = slugMatch[1];
      const { data: ws } = await supabaseAdmin
        .from('workspaces')
        .select('id')
        .eq('slug', slug)
        .single();
      workspaceId = ws?.id || null;
    }

    // Fallback: pegar o primeiro workspace (para dev)
    if (!workspaceId) {
      const { data: firstWs } = await supabaseAdmin
        .from('workspaces')
        .select('id')
        .limit(1)
        .single();
      workspaceId = firstWs?.id || null;
    }

    if (!workspaceId) {
      console.error('❌ Nenhum workspace encontrado');
      return new Response('Nenhum workspace configurado', { status: 200 });
    }

    // ─── 4. Upsert em contacts + insert em messages ───

    console.log('📝 Gravando contato e mensagem para:', phone_number);

    let { data: contactData, error: upsertError } = await supabaseAdmin
      .from('contacts')
      .upsert({ 
        workspace_id: workspaceId,
        phone: phone_number, 
        name: pushName, 
        last_message: message_text,
        updated_at: new Date().toISOString()
      }, { onConflict: 'workspace_id,phone' })
      .select('id')
      .single();

    if (upsertError) {
      console.error('❌ Erro no Upsert do contato:', upsertError.message);
    }

    let contactId = contactData?.id;

    // Fallback: buscar pelo telefone
    if (!contactId) {
      const { data: fallbackData } = await supabaseAdmin
        .from('contacts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('phone', phone_number)
        .single();
      contactId = fallbackData?.id;
    }

    if (!contactId) {
      console.error('❌ ERRO CRÍTICO: Não foi possível obter ID do contato.');
      return new Response('Erro ao identificar contato', { status: 200 });
    }

    // Incrementar unreads para mensagens de clientes
    if (messageRole === 'user') {
      try {
        await supabaseAdmin.rpc('increment_unread', { row_id: contactId });
      } catch {
        // Fallback silencioso
      }
    }

    // Inserir mensagem
    const { error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({
        contact_id: contactId,
        content: message_text,
        role: messageRole,
        direction: fromMe ? 'outbound' : 'inbound'
      });

    if (msgError) {
      console.error('❌ Erro ao inserir mensagem:', msgError.message);
    } else {
      console.log('✅ Mensagem gravada com sucesso!');
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Erro ao processar Webhook:', debugStep, error);
    return NextResponse.json({ 
      success: false, 
      step: debugStep,
      error: error?.message || String(error) || 'Unknown error'
    }, { status: 200 });
  }
}
