import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/migrate-status
 * 
 * Migração: adiciona coluna status e marca contatos finalizados.
 */
export async function GET() {
  try {
    // 1. Verificar se a coluna status existe
    const { data: testData, error: testError } = await supabaseAdmin
      .from('contacts')
      .select('id, status')
      .limit(1);

    const columnExists = !testError || !testError.message.includes('status');

    if (!columnExists) {
      return NextResponse.json({ 
        success: false, 
        error: 'A coluna "status" não existe na tabela contacts.',
        action: 'Execute no SQL Editor do Supabase: ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT \'open\';'
      });
    }

    // 2. Buscar contatos que foram finalizados (têm mensagem __CLOSED__) 
    //    mas ainda estão com status diferente de 'closed'
    const { data: closedMsgs } = await supabaseAdmin
      .from('messages')
      .select('contact_id')
      .like('content', '__CLOSED__%');

    if (closedMsgs && closedMsgs.length > 0) {
      const contactIds = [...new Set(closedMsgs.map(m => m.contact_id))];
      
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('contacts')
        .update({ status: 'closed' })
        .in('id', contactIds)
        .select('id, name, status');

      return NextResponse.json({ 
        success: true, 
        column_exists: true,
        contacts_updated: updated?.length || 0,
        updated_contacts: updated,
        error: updateError?.message || null
      });
    }

    return NextResponse.json({ 
      success: true, 
      column_exists: true,
      contacts_updated: 0,
      message: 'Nenhum contato com __CLOSED__ encontrado.'
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
