import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agents — MultiChat CRM Atendentes
 * 
 * Lista todos os atendentes do workspace do gerente logado.
 * Apenas acessível por gerentes.
 */
export async function GET() {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar perfil do usuário atual
    const { data: currentProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (profileError || !currentProfile) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });
    }

    if (currentProfile.role !== 'gerente') {
      return NextResponse.json({ error: 'Acesso negado. Apenas gerentes podem listar atendentes.' }, { status: 403 });
    }

    // Buscar perfis do mesmo workspace
    const { data: profiles, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*, departments(name)')
      .eq('workspace_id', currentProfile.workspace_id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('[Agents GET] Erro ao buscar perfis:', fetchError.message);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Buscar emails da tabela auth para fazer o de/para
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.error('[Agents GET] Erro ao buscar usuários auth:', authError.message);
    }

    const emailMap = new Map((authData?.users || []).map(u => [u.id, u.email]));

    // Mapear emails para a lista de perfis
    const agents = profiles.map(p => ({
      ...p,
      email: emailMap.get(p.id) || 'Desconhecido',
      department_name: p.departments?.name || 'Nenhum'
    }));

    return NextResponse.json(agents, { status: 200 });

  } catch (error: any) {
    console.error('[Agents GET] Erro inesperado:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/agents — MultiChat CRM Criar Atendente
 * 
 * Cria uma nova credencial no Auth.users do Supabase e associa ao workspace/setor.
 * Apenas acessível por gerentes.
 */
export async function POST(request: Request) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar perfil do gerente
    const { data: currentProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (profileError || !currentProfile) {
      return NextResponse.json({ error: 'Perfil do gerente não encontrado' }, { status: 404 });
    }

    if (currentProfile.role !== 'gerente') {
      return NextResponse.json({ error: 'Acesso negado. Apenas gerentes podem cadastrar atendentes.' }, { status: 403 });
    }

    const { email, password, name, departmentId, role = 'atendente' } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, senha e nome são obrigatórios' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'A senha deve conter no mínimo 6 caracteres' }, { status: 400 });
    }

    // Criar o usuário no Auth (o trigger on_auth_user_created fará o insert automático em public.profiles)
    const { data: authUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        workspace_id: currentProfile.workspace_id,
        role: role,
        department_id: departmentId || null
      }
    });

    if (createAuthError) {
      console.error('[Agents POST] Erro ao criar auth user:', createAuthError.message);
      return NextResponse.json({ error: createAuthError.message }, { status: 500 });
    }

    // Buscar o perfil recém criado pelo trigger para retornar na resposta
    const { data: newProfile, error: fetchProfileError } = await supabaseAdmin
      .from('profiles')
      .select('*, departments(name)')
      .eq('id', authUser.user.id)
      .single();

    if (fetchProfileError) {
      console.error('[Agents POST] Erro ao buscar perfil criado:', fetchProfileError.message);
      return NextResponse.json({ 
        success: true, 
        agent: {
          id: authUser.user.id,
          full_name: name,
          role,
          department_id: departmentId || null,
          email
        }
      }, { status: 201 });
    }

    return NextResponse.json({
      success: true,
      agent: {
        ...newProfile,
        email,
        department_name: newProfile.departments?.name || 'Nenhum'
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('[Agents POST] Erro inesperado:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
