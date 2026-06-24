import { supabaseAdmin } from '@/lib/supabase';
import { getUser } from '@/lib/supabase-server';
import { 
  Users, 
  MessageCircle, 
  UserPlus,
  Clock,
  Columns3,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const PIPELINE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  'novo': { label: 'Novo', color: 'text-slate-700', bg: 'bg-slate-100' },
  'qualificado': { label: 'Qualificado', color: 'text-blue-700', bg: 'bg-blue-100' },
  'negociacao': { label: 'Em Negociação', color: 'text-amber-700', bg: 'bg-amber-100' },
  'fechado': { label: 'Fechado', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  'perdido': { label: 'Perdido', color: 'text-red-700', bg: 'bg-red-100' },
};

export default async function DashboardPage() {
  const user = await getUser();

  // Buscar workspace do usuário
  const { data: workspace } = await supabaseAdmin
    .from('workspaces')
    .select('id')
    .eq('user_id', user?.id)
    .limit(1)
    .single();

  if (!workspace) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-5 border border-slate-200">
          <Columns3 className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Workspace não encontrado</h3>
        <p className="mt-2 text-base text-slate-500 max-w-md">
          Verifique se seu workspace foi configurado corretamente.
        </p>
      </div>
    );
  }

  // Métricas
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const { data: contacts } = await supabaseAdmin
    .from('contacts')
    .select('id, pipeline_stage, created_at, updated_at')
    .eq('workspace_id', workspace.id);

  const { count: messagesToday } = await supabaseAdmin
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', todayISO);

  const totalContacts = contacts?.length || 0;
  const newToday = contacts?.filter(c => new Date(c.created_at) >= today).length || 0;
  
  // Contagem por pipeline stage
  const pipelineCounts: Record<string, number> = {};
  for (const c of contacts || []) {
    pipelineCounts[c.pipeline_stage] = (pipelineCounts[c.pipeline_stage] || 0) + 1;
  }

  // Aguardando resposta (updated_at > 24h e no pipeline ativo)
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const waitingResponse = contacts?.filter(c => 
    new Date(c.updated_at) < dayAgo && 
    !['fechado', 'perdido'].includes(c.pipeline_stage)
  ).length || 0;

  // Max para escala do gráfico de barras
  const maxCount = Math.max(...Object.values(pipelineCounts), 1);

  return (
    <div className="py-8 px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Visão geral do atendimento e pipeline de contatos.</p>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Contatos */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contatos</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{totalContacts}</p>
            </div>
            <div className="w-11 h-11 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 2: Novos Hoje */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Novos Hoje</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{newToday}</p>
            </div>
            <div className="w-11 h-11 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
              <UserPlus className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 3: Mensagens Hoje */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Msgs Hoje</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{messagesToday || 0}</p>
            </div>
            <div className="w-11 h-11 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">
              <MessageCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 4: Aguardando Resposta */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sem Resposta 24h</p>
              <p className={`text-3xl font-black mt-1 ${waitingResponse > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {waitingResponse}
              </p>
            </div>
            <div className={`w-11 h-11 rounded-full flex items-center justify-center ${waitingResponse > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Chart */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Columns3 className="w-5 h-5 text-slate-400" />
            Pipeline de Contatos
          </h3>
          <a 
            href="/dashboard/crm" 
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Ver CRM completo →
          </a>
        </div>

        <div className="space-y-3">
          {Object.entries(PIPELINE_LABELS).map(([key, config]) => {
            const count = pipelineCounts[key] || 0;
            const percent = maxCount > 0 ? (count / maxCount) * 100 : 0;

            return (
              <div key={key} className="flex items-center gap-3">
                <div className="w-28 flex-shrink-0">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${config.bg} ${config.color}`}>
                    {config.label}
                  </span>
                </div>
                <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      key === 'novo' ? 'bg-slate-400' :
                      key === 'qualificado' ? 'bg-blue-500' :
                      key === 'negociacao' ? 'bg-amber-500' :
                      key === 'fechado' ? 'bg-emerald-500' :
                      'bg-red-400'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-700 w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
