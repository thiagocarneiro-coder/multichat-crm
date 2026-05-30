import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { analyzeLeadIntent } from '@/lib/ai';



export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Extrai os dados do payload oficial do WhatsApp Cloud API com optional chaining
    const messageObj = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const phone_number = messageObj?.from;
    const message_text = messageObj?.text?.body;

    if (phone_number && message_text) {
      // Regex para capturar o código no formato [XXX-0000]
      // A expressão pega exatamente o que está dentro dos colchetes
      const codeRegex = /\[([A-Z]{3}-\d{4})\]/;
      const match = message_text.match(codeRegex);

      if (match && match[1]) {
        // match[1] contém apenas o código limpo (sem colchetes), ex: AYE-9614
        const session_code = match[1]; 

        // 1. Busca a sessão correspondente no Supabase
        const { data: sessionData, error: sessionError } = await supabase
          .from('click_sessions')
          .select('id, workspace_id')
          .eq('session_code', session_code)
          .single();

        // Só prossegue se a sessão existir e não houver erros na busca
        if (!sessionError && sessionData) {
          const click_session_id = sessionData.id;
          const workspace_id = sessionData.workspace_id;

          // 2. Faz o insert/upsert na tabela de leads
          const { data: leadData, error: leadError } = await supabase
            .from('leads')
            .upsert([
              {
                workspace_id,
                phone_number,
                click_session_id
              }
            ], { onConflict: 'workspace_id,phone_number' })
            .select()
            .single();

          if (leadError) {
            console.error('Webhook Error: Falha ao inserir lead no banco', leadError);
          } else if (leadData) {
            console.log(`Webhook Success: Match realizado! Lead ${phone_number} vinculado à sessão ${session_code}`);
            
            // 3. Classificação Semântica com IA
            const intentStatus = await analyzeLeadIntent(message_text);
            
            // Atualiza o status do lead recém-criado/atualizado
            const { error: updateError } = await supabase
              .from('leads')
              .update({ status: intentStatus })
              .eq('id', leadData.id);
              
            if (updateError) {
              console.error('Webhook Error: Falha ao atualizar status do lead', updateError);
            } else {
              console.log(`Webhook AI Success: Lead classificado como ${intentStatus}`);
            }
          }
        } else {
          console.error('Webhook Error: Código recebido, mas sessão não encontrada no banco.');
        }
      } else {
        console.log('Webhook Info: Mensagem recebida, mas sem código de rastreamento.');
      }
    } else {
      console.log('Webhook Info: Payload ignorado (não contém telefone ou texto).');
    }
  } catch (error) {
    // Captura qualquer erro de parse JSON ou falha na requisição para não quebrar a execução
    console.error('Webhook Critical Error: Falha inesperada ao processar o webhook', error);
  }

  // REGRA DE OURO: Retornar 200 OK em ABSOLUTAMENTE TODOS os cenários
  // Isso impede que a Meta faça retentativas (loop) no nosso servidor.
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}

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
