'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ChevronDown, Building2, Check } from 'lucide-react';

type Workspace = {
  id: string;
  name: string;
  slug: string;
};

export default function WorkspaceSelector({ initialWorkspaceId }: { initialWorkspaceId?: string }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(initialWorkspaceId || null);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchWorkspaces() {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name, slug')
        .order('name');
        
      if (data && data.length > 0) {
        setWorkspaces(data);
        
        // Se não tiver cookie, definir o primeiro como ativo
        if (!activeWorkspaceId) {
          handleSelect(data[0].id);
        }
      }
    }
    fetchWorkspaces();
  }, []);

  const handleSelect = (id: string) => {
    setActiveWorkspaceId(id);
    setIsOpen(false);
    
    // Set cookie that expires in 30 days
    document.cookie = `activeWorkspaceId=${id}; path=/; max-age=${30 * 24 * 60 * 60}`;
    
    // Refresh server components
    router.refresh();
  };

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
      >
        <Building2 className="w-4 h-4 text-slate-500" />
        <span className="truncate max-w-[150px]">
          {activeWorkspace ? activeWorkspace.name : 'Carregando...'}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-500" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 z-20 py-1 animate-in fade-in slide-in-from-top-2">
            <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Workspaces
            </div>
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => handleSelect(workspace.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors"
              >
                <span className="truncate font-medium text-slate-700">{workspace.name}</span>
                {activeWorkspaceId === workspace.id && (
                  <Check className="w-4 h-4 text-blue-600" />
                )}
              </button>
            ))}
            <div className="border-t border-slate-100 mt-1 pt-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/dashboard/workspaces');
                }}
                className="w-full px-3 py-2 text-sm text-left text-blue-600 font-medium hover:bg-slate-50 transition-colors"
              >
                + Gerenciar Clientes
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
