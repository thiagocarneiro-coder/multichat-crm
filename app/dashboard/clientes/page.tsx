import { supabase } from '@/lib/supabase';
import NewWorkspaceModal from './components/NewWorkspaceModal';
import WorkspaceCard from './components/WorkspaceCard';
import { Building2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function WorkspacesPage() {
  const { data: workspaces, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar workspaces:', error);
    return (
      <div className="p-12 text-center text-red-600 bg-red-50 rounded-2xl m-8">
        <h2 className="font-bold text-lg">Erro ao carregar clientes</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <div className="py-8 px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Clientes Cadastrados</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gerencie os workspaces, scripts de rastreamento e integrações dos seus clientes.
          </p>
        </div>
        <NewWorkspaceModal />
      </div>

      <div className="space-y-4">
        {workspaces && workspaces.length > 0 ? (
          workspaces.map((ws) => (
            <WorkspaceCard key={ws.id} workspace={ws} />
          ))
        ) : (
          <div className="p-12 text-center flex flex-col items-center bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <Building2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Nenhum cliente encontrado</h3>
            <p className="mt-1 text-sm text-slate-500">Adicione seu primeiro cliente clicando no botão acima.</p>
          </div>
        )}
      </div>
    </div>
  );
}
