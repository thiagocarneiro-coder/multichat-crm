import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '@/lib/supabase';
import { validateCronRequest } from '@/lib/auth';

export const maxDuration = 60; // Configuração para Vercel rodar o cron por mais tempo se precisar (dependendo do plano)

export async function GET(request: Request) {
  try {
    // Security: validate Vercel Cron Secret
    const auth = validateCronRequest(request);
    if (!auth.valid) return auth.response!;

    console.log('\n=============================================');
    console.log('🕒 Iniciando CRON Job: Classificação de Leads em Lote...');
    console.log('=============================================\n');

    // 1. Busca contatos (case insensitive e null) - Trava de 24h removida temporariamente
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('contacts')
      .select('id, phone, status, updated_at')
      .or('status.in.(NOVO,Novo,novo,CURIOSO,Curioso,curioso),status.is.null');

    if (contactsError) {
      console.error('❌ Erro ao buscar contatos no banco:', contactsError.message);
      return NextResponse.json({ error: 'Erro ao buscar contatos' }, { status: 500 });
    }

    if (!contacts || contacts.length === 0) {
      console.log('✅ Nenhum contato precisa de classificação no momento.');
      return NextResponse.json({ message: 'Nenhum contato para processar' }, { status: 200 });
    }

    console.log(`📊 Encontrados ${contacts.length} contatos para processamento.`);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('⚠️ GEMINI_API_KEY não encontrada nas variáveis de ambiente.');
      return NextResponse.json({ error: 'API Key não configurada' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    let processados = 0;

    // 2. Loop sobre os contatos para análise individual
    for (const contact of contacts) {
      // 3. Busca as últimas 10 mensagens do contato
      const { data: messages, error: msgsError } = await supabaseAdmin
        .from('messages')
        .select('content, role, created_at')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false }) // Pega as 10 mais recentes
        .limit(10);

      if (msgsError) {
        console.error(`❌ Erro ao buscar mensagens para o contato ${contact.id}:`, msgsError.message);
        continue;
      }

      if (!messages || messages.length === 0) {
        console.log(`⚠️ Nenhuma mensagem encontrada para o contato ${contact.phone} (ID: ${contact.id}).`);
        continue;
      }

      // Inverte para ficar na ordem cronológica (ASC) correta para o prompt
      messages.reverse();

      // 4. Montar a string do histórico
      const historico = messages.map(msg => {
        const remetente = msg.role === 'user' ? 'Cliente' : 'Agência';
        return `${remetente}: ${msg.content}`;
      }).join('\n');

      console.log(`\n---------------------------------------------`);
      console.log(`🔎 Analisando contato: ${contact.phone} (ID: ${contact.id})`);
      console.log(`📌 Status Atual: ${contact.status}`);
      console.log(`💬 Histórico de Mensagens (${messages.length}):\n${historico}`);
      console.log(`---------------------------------------------\n`);

      const prompt = `Você é um analista de qualificação de leads de uma agência de marketing, tráfego pago e produção audiovisual (ex: Ursa Filme).
Sua tarefa é analisar o HISTÓRICO COMPLETO da conversa com o cliente e definir em qual etapa do funil ele está no momento.

Histórico da conversa:
${historico}

Regras: Responda APENAS com UMA das palavras abaixo, sem pontuação, sem explicações e em letras maiúsculas:
- NOVO (Se for apenas um cumprimento básico como "Oi", "Boa tarde", ou algo vago)
- CURIOSO (Se perguntou como funciona, pediu orçamento, valores, portfólio ou tirou dúvidas iniciais)
- EM NEGOCIAÇÃO (Se está enviando dados da empresa, discutindo detalhes técnicos, pediu contrato ou está alinhando a gravação/campanha)
- COMPROU (Se confirmou pagamento, enviou comprovante ou disse claramente que fechou)
`;

      // Delay entre chamadas para respeitar rate limit do Gemini free tier
      if (contacts.indexOf(contact) > 0) {
        console.log('⏳ Aguardando 5s para respeitar rate limit...');
        await new Promise(r => setTimeout(r, 5000));
      }

      try {
        let result;
        try {
          result = await model.generateContent(prompt);
        } catch (retryErr: any) {
          if (retryErr?.status === 429) {
            console.log('⏳ Rate limit atingido. Aguardando 30s e tentando novamente...');
            await new Promise(r => setTimeout(r, 30000));
            result = await model.generateContent(prompt);
          } else {
            throw retryErr;
          }
        }
        const statusRaw = result.response.text().trim().toUpperCase();

        const validStatuses = ['NOVO', 'CURIOSO', 'EM NEGOCIAÇÃO', 'COMPROU'];
        const finalStatus = validStatuses.includes(statusRaw) ? statusRaw : contact.status;

        console.log(`🤖 IA classificou o lead ${contact.phone} como: [ ${finalStatus} ]`);

        // 5. Atualizar o status do contato no Supabase
        if (finalStatus !== contact.status) {
          const { error: updateError } = await supabaseAdmin
            .from('contacts')
            .update({ status: finalStatus })
            .eq('id', contact.id);

          if (updateError) {
            console.error(`❌ Erro ao atualizar status do contato ${contact.id}:`, updateError.message);
          } else {
            console.log(`✅ Status de ${contact.phone} atualizado de ${contact.status} para ${finalStatus}!`);
            processados++;
          }
        } else {
           console.log(`⏸️ Status mantido como ${finalStatus}. Nenhuma alteração feita.`);
        }
      } catch (iaError) {
        console.error(`⚠️ Erro na IA ao processar contato ${contact.id} (Possível falta de cota ou instabilidade):`, iaError);
      }
    }

    console.log(`\n=============================================`);
    console.log(`✅ CRON Job finalizado! ${processados} contatos atualizados.`);
    console.log(`=============================================\n`);
    
    return NextResponse.json({ success: true, processados, totalAnalisados: contacts.length }, { status: 200 });

  } catch (error) {
    console.error('❌ Erro inesperado no CRON Job:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
