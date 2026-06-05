import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Extração segura baseada no formato da Evolution API v2 (messages.upsert)
    const data = body?.data;
    if (!data || !data.key) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (data.key.fromMe === true) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const remoteJid = data.key.remoteJid;
    const phoneNumber = remoteJid.split('@')[0];
    const pushName = data.pushName || phoneNumber;
    const textMessage = data.message?.conversation || data.message?.extendedTextMessage?.text || "";

    if (!textMessage.trim()) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    console.log('\n=============================================');
    console.log('🟢 NOVA MENSAGEM RECEBIDA:');
    console.log('📱 De:', remoteJid, `(${pushName})`);
    console.log('💬 Texto:', textMessage);
    console.log('=============================================\n');

    // 1. Upsert do Contato no Supabase
    let contactId = null;
    const { data: contactData, error: contactError } = await supabase
      .from('contacts')
      .upsert({
        phone_number: phoneNumber,
        name: pushName,
        last_message: textMessage,
        updated_at: new Date().toISOString()
      }, { onConflict: 'phone_number' })
      .select('id, status')
      .single();

    if (contactError) {
      console.error('❌ Erro ao upsertar contato:', contactError);
    } else if (contactData) {
      contactId = contactData.id;
      
      // Incrementa unread apenas na chegada da mensagem do cliente (antes do bot responder)
      try {
        await supabase.rpc('increment_unread', { row_id: contactId });
      } catch (err) {
         // Fallback se a função RPC não existir (apenas para evitar crash)
      }
      
      // 2. Insere a mensagem do cliente
      await supabase.from('messages').insert({
        contact_id: contactId,
        sender: 'client',
        text: textMessage
      });
    }

    // 3. Integração Gemini com Classificação Semântica
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash',
        generationConfig: { responseMimeType: "application/json" }
      });
      
      const prompt = `Você é um assistente virtual de uma agência de audiovisual chamada Ursa Filme. 
Um cliente enviou a seguinte mensagem: "${textMessage}". 

Atue como atendente e como classificador de funil de vendas. Analise a intenção da mensagem do cliente e classifique-o ESTRITAMENTE em uma destas categorias:
- "CURIOSO": perguntas vagas, sem intenção clara de fechamento ou orçamento imediato.
- "NEGOCIACAO": pediu orçamento, está discutindo escopo de projeto, prazos ou valores.
- "VENDA_FECHADA": fechou contrato, aprovou a proposta ou realizou o pagamento.
- "NAO_RESPONDE": abandonou o fluxo (use apenas se o contexto exigir, mas geralmente você deve focar nas 3 acima).

Retorne OBRIGATORIAMENTE um objeto JSON com as seguintes chaves:
{
  "status_detectado": "A CATEGORIA DETECTADA",
  "resposta_texto": "A SUA RESPOSTA PROFISSIONAL E CURTA PARA O CLIENTE"
}`;
      
      const result = await model.generateContent(prompt);
      const rawText = result.response.text();
      
      let statusDetectado = 'NOVO';
      let respostaIA = '';

      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        const parsedJSON = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
        statusDetectado = parsedJSON.status_detectado || 'NOVO';
        respostaIA = parsedJSON.resposta_texto || 'Desculpe, não consegui processar o pedido.';
      } catch (e) {
        console.error('Erro ao parsear JSON do Gemini:', e);
        respostaIA = "Desculpe, tivemos uma falha interna na IA.";
      }
      
      console.log('🧠 CLASSIFICAÇÃO DA IA:', statusDetectado);
      console.log('🧠 RESPOSTA DA IA:', respostaIA);

      // Atualiza o status e a ultima mensagem (do bot) no Supabase
      if (contactId) {
        const { error: updateError } = await supabase
          .from('contacts')
          .update({ 
            status: statusDetectado,
            last_message: respostaIA,
            updated_at: new Date().toISOString()
          })
          .eq('id', contactId);

        if (updateError) {
          console.error('❌ Falha ao atualizar status no Supabase:', updateError);
        } else {
          console.log(`✅ Status do contato atualizado para: ${statusDetectado}`);
          
          // Insere a mensagem do sistema
          await supabase.from('messages').insert({
            contact_id: contactId,
            sender: 'system',
            text: respostaIA
          });
        }
      }

      // Envia a resposta de volta para o cliente via Evolution API
      const instanceName = body.instance;
      const evolutionApiUrl = process.env.EVOLUTION_API_URL;
      const evolutionApiKey = process.env.EVOLUTION_GLOBAL_KEY;

      if (evolutionApiUrl && evolutionApiKey && instanceName) {
        try {
          const sendResponse = await fetch(`${evolutionApiUrl}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionApiKey
            },
            body: JSON.stringify({
              number: remoteJid,
              text: respostaIA
            })
          });

          if (sendResponse.ok) {
            console.log('✅ Mensagem enviada com sucesso para o WhatsApp!');
          } else {
            console.error('❌ Falha ao enviar mensagem para WhatsApp. Status:', sendResponse.status);
          }
        } catch (sendError) {
          console.error('❌ Erro no fetch de envio da mensagem:', sendError);
        }
      } else {
        console.warn('⚠️ Credenciais da Evolution API ou instanceName ausentes. Resposta não enviada.');
      }
    } else {
      console.log('⚠️ GEMINI_API_KEY não encontrada. Pulando processamento de IA.');
    }

    // Retorno obrigatório de 200 OK para a Evolution API não re-enviar o webhook
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Erro ao processar Webhook do WhatsApp:', error);
    // Mesmo em caso de erro de parsing, é seguro retornar 200 para webhooks de third-party pararem de tentar,
    // mas se quisermos debug, podemos retornar 500. A regra de ouro é: retorne 200 OK a menos que queira retry.
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 200 });
  }
}
