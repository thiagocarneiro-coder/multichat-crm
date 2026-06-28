import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/departments — MultiChat CRM Setores
 * 
 * Retorna os setores vinculados ao workspace do usuário autenticado.
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar perfil do usuário para obter o workspace_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('workspace_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[Departments] Perfil não encontrado:', profileError?.message);
      return NextResponse.json({ error: 'Workspace não configurado para este usuário' }, { status: 404 });
    }

    // Buscar todos os setores daquele workspace
    const { data: departments, error: deptsError } = await supabaseAdmin
      .from('departments')
      .select('*')
      .eq('workspace_id', profile.workspace_id)
      .order('created_at', { ascending: true }); // Preserva ordem padrão de inserção

    if (deptsError) {
      console.error('[Departments] Erro ao buscar setores:', deptsError.message);
      return NextResponse.json({ error: deptsError.message }, { status: 500 });
    }

    return NextResponse.json(departments, { status: 200 });

  } catch (error: any) {
    console.error('[Departments] Erro inesperado:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
