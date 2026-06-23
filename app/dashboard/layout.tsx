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
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  // Buscar workspaces do usuário com plano
  const { data: workspaces } = await supabaseAdmin
    .from('workspaces')
    .select('id, name, slug, plan, stripe_customer_id')
    .eq('user_id', user.id)
    .order('name');

  // Determinar plano ativo (primeiro workspace com plano não-free)
  const activePlan = workspaces?.find(w => w.plan && w.plan !== 'free')?.plan as PlanKey | undefined;
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
