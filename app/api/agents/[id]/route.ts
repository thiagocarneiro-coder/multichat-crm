import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * PATCH /api/agents/[id] — MultiChat CRM Editar Atendente
 * 
 * Permite alterar nome, setor (department_id) ou papel (role) de um atendente.
 * Apenas acessível por gerentes.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar perfil do gerente logado
    const { data: currentProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (profileError || !currentProfile) {
      return NextResponse.json({ error: 'Perfil do gerente não encontrado' }, { status: 404 });
    }

    if (currentProfile.role !== 'gerente') {
      return NextResponse.json({ error: 'Acesso negado. Apenas gerentes podem editar atendentes.' }, { status: 403 });
    }

    const { id } = await params;
    const { name, departmentId, role } = await request.json();

    // Buscar perfil do atendente a ser editado
    const { data: agentProfile, error: fetchAgentLinkError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', currentProfile.workspace_id)
      .single();

    if (fetchAgentLinkError || !agentProfile) {
      return NextResponse.json({ error: 'Atendente não encontrado neste workspace' }, { status: 404 });
    }

    // Atualizar tabela public.profiles
    const updateFields: Record<string, any> = {};
    if (name !== undefined) updateFields.full_name = name;
    if (role !== undefined) updateFields.role = role;
    if (departmentId !== undefined) updateFields.department_id = departmentId || null;

    const { data: updatedProfile, error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update(updateFields)
      .eq('id', id)
      .select('*, departments(name)')
      .single();

    if (updateProfileError) {
      console.error('[Agents PATCH] Erro ao atualizar perfil:', updateProfileError.message);
      return NextResponse.json({ error: updateProfileError.message }, { status: 500 });
    }

    // Sincronizar o Auth metadata
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: {
        full_name: updatedProfile.full_name,
        role: updatedProfile.role,
        department_id: updatedProfile.department_id
      }
    });

    if (updateAuthError) {
      console.error('[Agents PATCH] Erro ao sincronizar auth metadata:', updateAuthError.message);
    }

    return NextResponse.json({
      success: true,
      agent: {
        ...updatedProfile,
        department_name: updatedProfile.departments?.name || 'Nenhum'
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Agents PATCH] Erro inesperado:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/agents/[id] — MultiChat CRM Excluir Atendente
 * 
 * Exclui a conta do atendente no Supabase Auth e o perfil public correspondente.
 * Apenas acessível por gerentes.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar perfil do gerente logado
    const { data: currentProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (profileError || !currentProfile) {
      return NextResponse.json({ error: 'Perfil do gerente não encontrado' }, { status: 404 });
    }

    if (currentProfile.role !== 'gerente') {
      return NextResponse.json({ error: 'Acesso negado. Apenas gerentes podem excluir atendentes.' }, { status: 403 });
    }

    const { id } = await params;

    // Impedir que o gerente exclua a si mesmo
    if (id === currentUser.id) {
      return NextResponse.json({ error: 'Operação inválida. Você não pode excluir a sua própria conta.' }, { status: 400 });
    }

    // Validar se o atendente pertence ao mesmo workspace
    const { data: agentProfile, error: fetchAgentError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', id)
      .eq('workspace_id', currentProfile.workspace_id)
      .single();

    if (fetchAgentError || !agentProfile) {
      return NextResponse.json({ error: 'Atendente não encontrado neste workspace' }, { status: 404 });
    }

    // Excluir conta no auth.users (a exclusão do profiles correspondente ocorre em cascata)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (deleteAuthError) {
      console.error('[Agents DELETE] Erro ao deletar no auth:', deleteAuthError.message);
      return NextResponse.json({ error: deleteAuthError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Atendente excluído com sucesso.' }, { status: 200 });

  } catch (error: any) {
    console.error('[Agents DELETE] Erro inesperado:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
