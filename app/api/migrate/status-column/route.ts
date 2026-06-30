import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/migrate/status-column
 * 
 * Adiciona a coluna `status` na tabela contacts se não existir.
 * Endpoint temporário para migração.
 */
export async function GET() {
  try {
    // 1. Tentar adicionar a coluna status
    const { error: alterError } = await supabaseAdmin.rpc('exec_sql', {
      sql: "ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';"
    });

    // Se rpc não funcionar, tentar via update direto para verificar se a coluna existe
    if (alterError) {
      console.log('RPC não disponível, testando coluna diretamente...');
      
      // Testar se a coluna já existe tentando fazer um select
      const { data: testData, error: testError } = await supabaseAdmin
        .from('contacts')
        .select('id, status')
        .limit(1);
      
      if (testError && testError.message.includes('status')) {
        return NextResponse.json({ 
          success: false, 
          error: 'Coluna status não existe. Execute manualmente no SQL Editor do Supabase:\n\nALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT \'open\';',
          details: testError.message
        });
      }

      // Se chegou aqui, a coluna existe
      if (testData) {
        // Atualizar todos os contatos que foram finalizados (têm __CLOSED__ nas mensagens)
        // mas que ainda estão com status 'open'
        const { data: closedMsgs } = await supabaseAdmin
          .from('messages')
          .select('contact_id')
          .like('content', '__CLOSED__%');

        if (closedMsgs && closedMsgs.length > 0) {
          const contactIds = [...new Set(closedMsgs.map(m => m.contact_id))];
          
          const { error: updateError } = await supabaseAdmin
            .from('contacts')
            .update({ status: 'closed' })
            .in('id', contactIds)
            .is('assigned_user_id', null);

          return NextResponse.json({ 
            success: true, 
            message: `Coluna status já existe. ${contactIds.length} contatos marcados como closed.`,
            contactIds
          });
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Coluna status já existe. Nenhum contato para atualizar.'
        });
      }
    }

    // 2. Marcar contatos finalizados
    const { data: closedMsgs } = await supabaseAdmin
      .from('messages')
      .select('contact_id')
      .like('content', '__CLOSED__%');

    if (closedMsgs && closedMsgs.length > 0) {
      const contactIds = [...new Set(closedMsgs.map(m => m.contact_id))];
      
      await supabaseAdmin
        .from('contacts')
        .update({ status: 'closed' })
        .in('id', contactIds)
        .is('assigned_user_id', null);

      return NextResponse.json({ 
        success: true, 
        message: `Migração concluída. ${contactIds.length} contatos marcados como closed.`
      });
    }

    return NextResponse.json({ success: true, message: 'Migração concluída. Nenhum contato finalizado encontrado.' });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
