'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { getUser } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { PLANS, PlanKey } from '@/lib/plans';

export async function createWorkspace(name: string, slug: string) {
  // Obter usuário autenticado
  const user = await getUser();
  if (!user) {
    throw new Error('Você precisa estar logado para criar um workspace.');
  }

  // Buscar workspaces existentes e plano
  const { data: workspaces } = await supabaseAdmin
    .from('workspaces')
    .select('id, plan')
    .eq('user_id', user.id);

  const currentCount = workspaces?.length || 0;

  // Determinar plano ativo
  const activePlan = workspaces?.find(w => w.plan && w.plan !== 'free')?.plan as PlanKey | undefined;
  const planConfig = activePlan ? PLANS[activePlan] : undefined;
  const maxWorkspaces = planConfig?.maxWorkspaces || 1;

  // Verificar limite (maxWorkspaces -1 = ilimitado)
  if (maxWorkspaces !== -1 && currentCount >= maxWorkspaces) {
    const planName = planConfig?.name || 'Gratuito';
    throw new Error(
      `Seu plano ${planName} permite até ${maxWorkspaces} workspace${maxWorkspaces > 1 ? 's' : ''}. ` +
      `Faça upgrade para adicionar mais clientes.`
    );
  }

  // Verifica se slug já existe
  const { data: existing } = await supabaseAdmin
    .from('workspaces')
    .select('id')
    .eq('slug', slug)
    .single();

  if (existing) {
    throw new Error('Um cliente com esse identificador (slug) já existe. Escolha outro nome.');
  }

  const { error: insertError } = await supabaseAdmin
    .from('workspaces')
    .insert([{ name, slug, user_id: user.id }]);

  if (insertError) {
    throw new Error(insertError.message);
  }

  // Revalida a página de clientes e de layout para atualizar as listas
  revalidatePath('/dashboard/clientes');
  revalidatePath('/dashboard', 'layout');
}
