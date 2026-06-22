import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { supabaseAdmin } from '@/lib/supabase';
import { getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verificar autenticação
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  // Buscar apenas os workspaces deste usuário
  const { data: workspaces } = await supabaseAdmin
    .from('workspaces')
    .select('id, name, slug')
    .eq('user_id', user.id)
    .order('name');

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header workspaces={workspaces || []} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
