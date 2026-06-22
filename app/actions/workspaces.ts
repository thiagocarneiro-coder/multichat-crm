'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { getUser } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export async function createWorkspace(name: string, slug: string) {
  // Obter usuário autenticado
  const user = await getUser();
  if (!user) {
    throw new Error('Você precisa estar logado para criar um workspace.');
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
