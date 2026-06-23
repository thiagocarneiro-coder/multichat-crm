import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateCronRequest } from '@/lib/auth';
import { analyzeLeadFull } from '@/lib/ai';

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    // Security: validate Vercel Cron Secret
    const auth = validateCronRequest(request);
    if (!auth.valid) return auth.response!;

    console.log('\n=============================================');
    console.log('🕒 Iniciando CRON Job: Classificação de Leads em Lote...');
    console.log('=============================================\n');

    // 1. Busca contatos que precisam de análise
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

    let processados = 0;

    // 2. Loop sobre os contatos para análise individual
    for (const contact of contacts) {
      // 3. Busca as últimas 15 mensagens do contato
      const { data: messages, error: msgsError } = await supabaseAdmin
        .from('messages')
        .select('content, role, created_at')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false })
        .limit(15);

      if (msgsError) {
        console.error(`❌ Erro ao buscar mensagens para o contato ${contact.id}:`, msgsError.message);
        continue;
      }

      if (!messages || messages.length === 0) {
        console.log(`⚠️ Nenhuma mensagem encontrada para o contato ${contact.phone} (ID: ${contact.id}).`);
        continue;
      }

      // Inverte para ordem cronológica
      messages.reverse();

      // 4. Montar histórico
      const historico = messages.map(msg => {
        const remetente = msg.role === 'user' ? 'Cliente' : 'Agência';
        return `${remetente}: ${msg.content}`;
      }).join('\n');

      console.log(`\n---------------------------------------------`);
      console.log(`🔎 Analisando contato: ${contact.phone} (ID: ${contact.id})`);
      console.log(`📌 Status Atual: ${contact.status}`);
      console.log(`💬 Mensagens: ${messages.length}`);
      console.log(`---------------------------------------------\n`);

      // Delay entre chamadas para respeitar rate limit
      if (contacts.indexOf(contact) > 0) {
        console.log('⏳ Aguardando 5s para respeitar rate limit...');
        await new Promise(r => setTimeout(r, 5000));
      }

      try {
        // 5. Análise completa com IA (estágio + valor + origem)
        const analysis = await analyzeLeadFull(historico);

        console.log(`🤖 IA resultado para ${contact.phone}:`);
        console.log(`   📊 Estágio: ${analysis.status}`);
        console.log(`   💰 Valor: ${analysis.sale_value ? `R$${analysis.sale_value}` : 'não detectado'}`);
        console.log(`   🔗 Origem: ${analysis.detected_source || 'não detectada'}`);

        // 6. Preparar dados para update
        const updateData: Record<string, any> = {};
        
        if (analysis.status !== contact.status) {
          updateData.status = analysis.status;
        }
        
        if (analysis.sale_value) {
          updateData.sale_value = analysis.sale_value;
        }
        
        if (analysis.detected_source) {
          updateData.detected_source = analysis.detected_source;
        }

        // 7. Atualizar se houver mudanças
        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabaseAdmin
            .from('contacts')
            .update(updateData)
            .eq('id', contact.id);

          if (updateError) {
            console.error(`❌ Erro ao atualizar contato ${contact.id}:`, updateError.message);
          } else {
            console.log(`✅ Contato ${contact.phone} atualizado!`, updateData);
            processados++;
          }
        } else {
          console.log(`⏸️ Nenhuma alteração necessária para ${contact.phone}.`);
        }
      } catch (iaError) {
        console.error(`⚠️ Erro na IA ao processar contato ${contact.id}:`, iaError);
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
