import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name, slug')
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
