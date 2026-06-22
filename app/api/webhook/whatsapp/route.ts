import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateWebhookSecret } from '@/lib/auth';

/**
 * Webhook Unificado — Riguetto Tracker
 * 
 * Recebe mensagens do WhatsApp via Evolution API ou Meta Oficial.
 * 
 * Fluxo:
 * 1. Valida webhook secret
 * 2. Extrai telefone + texto do payload (Evolution ou Meta format)
 * 3. Intercepta UTMs injetadas pela Bridge Page
 * 4. Upsert em `contacts` + insert em `messages` (para o Inbox)
 * 5. Se encontrar session_code [XXX-0000], faz matching com click_sessions
 *    e upsert em `leads` (para o Dashboard)
 * 6. Incrementa contador de unread
 * 
 * REGRA DE OURO: Sempre retorna 200 OK para evitar retries.
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Security: validate webhook secret from Evolution API
    const auth = validateWebhookSecret(request);
    if (!auth.valid) return auth.response!;

    console.log('\n=============================================');
    console.log("WEBHOOK UNIFICADO — PAYLOAD RECEBIDO:", JSON.stringify(body, null, 2));
    console.log('=============================================\n');

    // ─── 1. Extrair dados do payload (suporta Evolution API e Meta) ───

    let phone_number = '';
    let message_text = '';
    let pushName = 'Desconhecido';
    let fromMe = false;

    if (body?.data?.key?.remoteJid) {
      // Formato Evolution API (messages.upsert com data.key)
      const messageData = body.data;
      const remoteJid = messageData.key.remoteJid || '';
      fromMe = messageData.key.fromMe || false;
      pushName = messageData.pushName || body?.data?.pushName || 'Desconhecido';
      phone_number = remoteJid.split('@')[0];
      message_text = messageData.message?.conversation 
        || messageData.message?.extendedTextMessage?.text 
        || '';
    } else if (body?.event === 'messages.upsert' && body?.data?.message) {
      // Formato Evolution API alternativo (event wrapper)
      const msgData = body.data.message;
      fromMe = msgData?.key?.fromMe || false;
      pushName = body.data?.pushName || 'Desconhecido';
      const remoteJid = msgData?.key?.remoteJid || '';
      phone_number = remoteJid.split('@')[0];
      const content = msgData?.message;
      message_text = content?.conversation || content?.extendedTextMessage?.text || '';
    } else if (body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      // Formato Meta Oficial (Cloud API)
      const messageObj = body.entry[0].changes[0].value.messages[0];
      phone_number = messageObj.from || '';
      message_text = messageObj.text?.body || '';
      pushName = body.entry[0].changes[0].value?.contacts?.[0]?.profile?.name || 'Desconhecido';
    }

    // ─── Evento de conexão: salvar phone no workspace automaticamente ───
    if (body?.event === 'connection.update' && body?.data?.state === 'open' && body?.sender) {
      const ownerPhone = body.sender.split('@')[0];
      const instanceName = body?.instance || '';
      // Extrai o slug do nome da instância (ex: agencia-demo-1234567 → agencia-demo)
      const slugMatch = instanceName.match(/^(.+)-\d+$/);
      if (slugMatch && ownerPhone) {
        const slug = slugMatch[1];
        const { error } = await supabaseAdmin
          .from('workspaces')
          .update({ phone: ownerPhone })
          .eq('slug', slug);
        if (!error) {
          console.log(`📱 Phone ${ownerPhone} salvo automaticamente no workspace '${slug}'`);
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
    if (fromMe) {
      // Mensagens do próprio bot: registrar mas não processar como lead
    }

    const messageRole = fromMe ? 'assistant' : 'user';

    // ─── 3. Interceptar e limpar UTMs injetadas pela Bridge Page ───

    let finalMessage = message_text;
    let utmSource: string | null = null;
    let utmCampaign: string | null = null;

    const utmMatch = message_text.match(/\[utm_source:\s*(.*?),.*utm_campaign:\s*(.*?)\]/);
    if (utmMatch) {
      utmSource = utmMatch[1] !== 'não informado' ? utmMatch[1].trim() : null;
      utmCampaign = utmMatch[2] !== 'não informado' ? utmMatch[2].trim() : null;
      finalMessage = message_text.replace(/\[utm_source:.*\]/, '').trim();
    }

    // ─── 4. Upsert em contacts + insert em messages (Inbox) ───

    console.log('📝 Gravando contato e mensagem para:', phone_number);

    let { data: contactData, error: upsertError } = await supabaseAdmin
      .from('contacts')
      .upsert({ 
        phone: phone_number, 
        name: pushName, 
        last_message: finalMessage,
        utm_source: utmSource || undefined,
        utm_campaign: utmCampaign || undefined,
        updated_at: new Date().toISOString()
      }, { onConflict: 'phone' })
      .select('id')
      .single();

    if (upsertError) {
      console.error('❌ Erro no Upsert do contato:', upsertError.message);
    }

    let contactId = contactData?.id;

    // Fallback: buscar pelo telefone se o upsert não retornou ID
    if (!contactId) {
      const { data: fallbackData } = await supabaseAdmin
        .from('contacts')
        .select('id')
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
        content: finalMessage,
        role: messageRole,
        direction: fromMe ? 'outbound' : 'inbound'
      });

    if (msgError) {
      console.error('❌ Erro ao inserir mensagem:', msgError.message);
    } else {
      console.log('✅ Mensagem gravada com sucesso!');
    }

    // ─── 5. Matching com session_code → leads (Dashboard) ───

    const codeRegex = /\[([a-zA-Z0-9-]+)\]/;
    const codeMatch = message_text.match(codeRegex);

    if (codeMatch && codeMatch[1] && !fromMe) {
      const session_code = codeMatch[1];
      console.log(`🔗 Código de sessão detectado: ${session_code}`);

      const { data: sessionData, error: sessionError } = await supabaseAdmin
        .from('click_sessions')
        .select('id, workspace_id, curso')
        .eq('session_code', session_code)
        .single();

      if (!sessionError && sessionData) {
        const { data: leadData, error: leadError } = await supabaseAdmin
          .from('leads')
          .upsert([{
            workspace_id: sessionData.workspace_id,
            phone_number: phone_number,
            click_session_id: sessionData.id,
            curso: sessionData.curso
          }], { onConflict: 'workspace_id,phone_number' })
          .select()
          .single();

        if (leadError) {
          console.error('❌ Erro ao vincular lead à sessão:', leadError.message);
        } else if (leadData) {
          console.log(`✅ Lead ${phone_number} vinculado à sessão ${session_code}`);
        }
      } else {
        console.log(`⚠️ Código ${session_code} recebido, mas sessão não encontrada no banco.`);
      }
    }

    // Retorno obrigatório de 200 OK
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('❌ Erro ao processar Webhook:', error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

/**
 * GET handler para verificação do webhook da Meta (Cloud API).
 * A Meta envia um GET com hub.mode, hub.verify_token e hub.challenge.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}
