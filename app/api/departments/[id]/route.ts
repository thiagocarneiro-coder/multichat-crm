import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * PATCH /api/departments/:id — Editar setor
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('workspace_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'gerente') {
      return NextResponse.json({ error: 'Apenas gerentes podem editar setores' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, color } = body;

    const updateData: Record<string, string> = {};
    if (name) {
      updateData.name = name.trim();
      updateData.slug = name.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    if (color) updateData.color = color;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('departments')
      .update(updateData)
      .eq('id', id)
      .eq('workspace_id', profile.workspace_id) // Segurança: só edita do seu workspace
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/departments/:id — Excluir setor
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('workspace_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'gerente') {
      return NextResponse.json({ error: 'Apenas gerentes podem excluir setores' }, { status: 403 });
    }

    const { id } = await params;

    // Verificar se há contatos ou atendentes nesse setor
    const { count: contactCount } = await supabaseAdmin
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('department_id', id);

    const { count: agentCount } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('department_id', id);

    if ((contactCount || 0) > 0) {
      return NextResponse.json({ 
        error: `Não é possível excluir: existem ${contactCount} contato(s) neste setor. Mova-os para outro setor primeiro.` 
      }, { status: 409 });
    }

    if ((agentCount || 0) > 0) {
      return NextResponse.json({ 
        error: `Não é possível excluir: existem ${agentCount} atendente(s) neste setor. Mova-os para outro setor primeiro.` 
      }, { status: 409 });
    }

    const { error } = await supabaseAdmin
      .from('departments')
      .delete()
      .eq('id', id)
      .eq('workspace_id', profile.workspace_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
