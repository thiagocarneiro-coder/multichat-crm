import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { supabaseAdmin } from '@/lib/supabase';
import { getUser } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { PLANS, PlanKey } from '@/lib/plans';

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
    .select('id, name, slug, stripe_plan')
    .eq('user_id', user.id)
    .order('name');

  // Determinar o plano ativo do usuário
  const activePlan = workspaces?.find(w => w.stripe_plan)?.stripe_plan as PlanKey | undefined;
  const planConfig = activePlan ? PLANS[activePlan] : undefined;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      <Sidebar 
        planName={planConfig?.name}
        workspaceCount={workspaces?.length || 0}
        maxWorkspaces={planConfig?.maxWorkspaces || 1}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header workspaces={workspaces || []} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
