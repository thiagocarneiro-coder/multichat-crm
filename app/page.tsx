import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * Raiz do Aplicativo (/)
 * 
 * Sem Landing Page ativa: Redireciona o usuário para o dashboard se estiver 
 * autenticado ou para a página de login caso contrário.
 */
export default async function HomePage() {
  const user = await getUser();

  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
