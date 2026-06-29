'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Users, Clock, Loader2, Calendar, ChevronDown, Trophy, ArrowRightLeft } from 'lucide-react';
import { supabaseClient as supabase } from '@/lib/supabase-client';

interface AgentMetric {
  id: string;
  name: string;
  department: string;
  role: string;
  messages_sent: number;
  conversations_handled: number;
  transfers_made: number;
}

interface Department {
  id: string;
  name: string;
}

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Esta Semana' },
  { value: 'month', label: 'Este Mês' },
  { value: 'last_month', label: 'Mês Passado' },
];

export default function RelatoriosPage() {
  const [agents, setAgents] = useState<AgentMetric[]>([]);
  const [avgResponseMin, setAvgResponseMin] = useState(0);
  const [totalTransfers, setTotalTransfers] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [period, setPeriod] = useState('week');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('id', user.id)
        .single();
      if (profile) setWorkspaceId(profile.workspace_id);

      const { data: depts } = await supabase
        .from('departments')
        .select('id, name')
        .eq('workspace_id', profile?.workspace_id);
      if (depts) setDepartments(depts);
    };
    bootstrap();
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    const fetchReport = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          period,
          department: departmentFilter,
          workspace_id: workspaceId
        });
        const res = await fetch(`/api/reports?${params}`, {
          headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_INTERNAL_API_SECRET}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAgents(data.agents);
          setAvgResponseMin(data.summary.avg_response_time_minutes);
          setTotalTransfers(data.agents.reduce((sum: number, a: AgentMetric) => sum + a.transfers_made, 0));
        }
      } catch (err) {
        console.error('[Relatórios] Erro:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [workspaceId, period, departmentFilter]);

  const periodLabel = PERIOD_OPTIONS.find(p => p.value === period)?.label || '';

  return (
    <div className="p-6 lg:p-8 max-w-[1000px] mx-auto">
      {/* Header + Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            Relatórios
          </h1>
          <p className="text-sm text-slate-500 mt-1">Resumo de performance da equipe</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none appearance-none cursor-pointer"
            >
              {PERIOD_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none appearance-none cursor-pointer"
            >
              <option value="all">Todos os Setores</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Mini cards: Tempo médio + Transferências */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">
                  {avgResponseMin}<span className="text-sm text-slate-400 ml-1">min</span>
                </p>
                <p className="text-[11px] text-slate-500">Tempo médio de resposta</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{totalTransfers}</p>
                <p className="text-[11px] text-slate-500">Transferências no período</p>
              </div>
            </div>
          </div>

          {/* Ranking de Atendentes */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-700">Ranking de Atendimentos — {periodLabel}</h3>
            </div>

            {agents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Users className="w-10 h-10 mb-2 text-slate-200" />
                <p className="text-sm">Nenhum atendimento registrado no período</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider w-12">#</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Colaborador</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Setor</th>
                    <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Atendimentos</th>
                    <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Msgs Enviadas</th>
                    <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transf.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agents.map((agent, index) => {
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                    return (
                      <tr key={agent.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3.5">
                          {medal ? (
                            <span className="text-base">{medal}</span>
                          ) : (
                            <span className="text-xs font-bold text-slate-400">{index + 1}º</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                              {agent.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-semibold text-slate-700">{agent.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{agent.department}</span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className="text-sm font-bold text-emerald-600">{agent.conversations_handled}</span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className="text-sm font-bold text-slate-700">{agent.messages_sent}</span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className={`text-sm font-bold ${agent.transfers_made > 0 ? 'text-amber-500' : 'text-slate-300'}`}>
                            {agent.transfers_made}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
