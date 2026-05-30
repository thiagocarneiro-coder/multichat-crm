'use client';

import { useState } from 'react';
import { Building2, Calendar, Link as LinkIcon, Code2, ChevronDown, ChevronUp } from 'lucide-react';
import OnboardingCard from './OnboardingCard';

type Workspace = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export default function WorkspaceList({ initialWorkspaces }: { initialWorkspaces: Workspace[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-4">
      {initialWorkspaces.map((ws) => (
        <div key={ws.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
          <div 
            className="p-6 cursor-pointer flex items-center justify-between"
            onClick={() => toggleExpand(ws.id)}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{ws.name}</h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" />
                    {ws.slug}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Criado em {new Date(ws.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5" />
                Instruções de Integração
              </button>
              {expandedId === ws.id ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </div>
          </div>
          
          {expandedId === ws.id && (
            <div className="px-6 pb-6 bg-slate-50 border-t border-slate-100">
              <OnboardingCard workspaceId={ws.id} slug={ws.slug} />
            </div>
          )}
        </div>
      ))}

      {initialWorkspaces.length === 0 && (
        <div className="p-12 text-center flex flex-col items-center bg-white rounded-2xl border border-dashed border-slate-300">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Nenhum cliente encontrado</h3>
          <p className="mt-1 text-sm text-slate-500">Adicione seu primeiro cliente clicando no botão acima.</p>
        </div>
      )}
    </div>
  );
}
