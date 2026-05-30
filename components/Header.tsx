import WorkspaceSelector from './WorkspaceSelector';
import { cookies } from 'next/headers';
import { Bell, User } from 'lucide-react';

type Workspace = {
  id: string;
  name: string;
  slug: string;
};

export default async function Header({ workspaces }: { workspaces: Workspace[] }) {
  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get('activeWorkspaceId')?.value;

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center">
        {/* Aqui podemos colocar um breadcrumb ou título da página no futuro */}
      </div>

      <div className="flex items-center gap-4">
        <WorkspaceSelector 
          workspaces={workspaces} 
          initialWorkspaceId={activeWorkspaceId} 
        />
        
        <div className="h-6 w-px bg-slate-200 mx-1"></div>
        
        <button className="text-slate-400 hover:text-slate-600 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
        
        <button className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 hover:border-slate-300 transition-colors">
          <User className="w-4 h-4 text-slate-600" />
        </button>
      </div>
    </header>
  );
}
