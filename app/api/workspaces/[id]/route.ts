import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUser } from '@/lib/supabase-server';

/**
 * PATCH /api/workspaces/[id]
 * Atualiza configurações de integração do workspace (Meta Ads, etc.)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verificar se workspace pertence ao usuário
    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    // Campos permitidos para update
    const allowedFields = ['meta_pixel_id', 'meta_access_token', 'phone', 'webhook_url'];
    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field] || null;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('workspaces')
      .update(updateData)
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('id, name')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    await supabaseAdmin.from('leads').delete().eq('workspace_id', id);
    
    const { error } = await supabaseAdmin
      .from('workspaces')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: 'Erro ao remover cliente' }, { status: 500 });
    }

    return NextResponse.json({ success: true, name: workspace.name });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
