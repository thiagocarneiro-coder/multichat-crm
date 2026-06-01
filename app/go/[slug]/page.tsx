import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import WhatsAppButton from './components/WhatsAppButton';
import { Building2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function BridgePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;

  // Busca o workspace no banco para verificar se existe
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('slug', slug)
    .single();

  if (!workspace) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
          <Building2 className="w-8 h-8" />
        </div>
        
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
          Atendimento {workspace.name}
        </h1>
        
        <p className="text-slate-500 text-sm mb-8">
          Você está sendo redirecionado para o nosso WhatsApp oficial. Clique no botão abaixo para iniciar a conversa.
        </p>

        <WhatsAppButton workspaceId={workspace.id} />
        
        <p className="mt-8 text-xs text-slate-400">
          Atendimento seguro e imediato.
        </p>
      </div>
    </div>
  );
}
