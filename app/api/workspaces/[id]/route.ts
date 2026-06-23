import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUser } from '@/lib/supabase-server';

/**
 * DELETE /api/workspaces/[id]
 * Remove um workspace (cliente) e todos os dados associados.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = await params;

    // Verificar se o workspace pertence ao usuário
    const { data: workspace, error: fetchError } = await supabaseAdmin
      .from('workspaces')
      .select('id, name, slug')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !workspace) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    // Deletar leads associados
    await supabaseAdmin
      .from('leads')
      .delete()
      .eq('workspace_id', id);

    // Deletar o workspace
    const { error: deleteError } = await supabaseAdmin
      .from('workspaces')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[Delete Workspace]', deleteError);
      return NextResponse.json({ error: 'Erro ao remover cliente' }, { status: 500 });
    }

    return NextResponse.json({ success: true, name: workspace.name });
  } catch (error: any) {
    console.error('[Delete Workspace]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
