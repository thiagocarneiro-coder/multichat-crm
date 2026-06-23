import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUser } from '@/lib/supabase-server';
import crypto from 'crypto';

/**
 * POST /api/workspaces/[id]/share
 * Gera um token de compartilhamento para o workspace.
 * Se já existe, retorna o existente.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = await params;

    // Verificar se workspace pertence ao usuário
    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('id, share_token')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    // Se já tem token, retornar
    if (workspace.share_token) {
      return NextResponse.json({ share_token: workspace.share_token });
    }

    // Gerar novo token
    const share_token = crypto.randomBytes(16).toString('hex');

    const { error } = await supabaseAdmin
      .from('workspaces')
      .update({ share_token })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ share_token });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/workspaces/[id]/share
 * Remove o token de compartilhamento (revoga acesso).
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
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    await supabaseAdmin
      .from('workspaces')
      .update({ share_token: null })
      .eq('id', id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
