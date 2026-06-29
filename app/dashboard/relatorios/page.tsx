'use client';

import { useState, useEffect } from 'react';
import { BarChart3, MessageCircle, Users, Clock, TrendingUp, ArrowUpRight, ArrowDownRight, Filter, Calendar, Loader2, ChevronDown } from 'lucide-react';
import { supabaseClient as supabase } from '@/lib/supabase-client';

interface Summary {
  total_messages: number;
  total_inbound: number;
  total_outbound: number;
  total_conversations: number;
  avg_response_time_minutes: number;
  active_agents: number;
}

interface AgentMetric {
  id: string;
  name: string;
  department: string;
  role: string;
  messages_sent: number;
  conversations_handled: number;
  transfers_made: number;
}

interface DailyVolume {
  date: string;
  inbound: number;
  outbound: number;
}

interface Department {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  workspace_id: string;
  full_name: string;
  role: string;
}

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Esta Semana' },
  { value: 'month', label: 'Este Mês' },
  { value: 'last_month', label: 'Mês Passado' },
];

export default function RelatoriosPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [agents, setAgents] = useState<AgentMetric[]>([]);
  const [dailyVolume, setDailyVolume] = useState<DailyVolume[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [period, setPeriod] = useState('week');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Bootstrap: buscar workspace_id
  useEffect(() => {
    const bootstrap = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        setWorkspaceId(profile.workspace_id);
      }

      // Buscar departamentos
      const { data: depts } = await supabase
        .from('departments')
        .select('id, name')
        .eq('workspace_id', profile?.workspace_id);

      if (depts) setDepartments(depts);
    };

    bootstrap();
  }, []);

  // Buscar relatório quando filtros mudam
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
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_INTERNAL_API_SECRET}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setSummary(data.summary);
          setAgents(data.agents);
          setDailyVolume(data.daily_volume);
        }
      } catch (err) {
        console.error('[Relatórios] Erro:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [workspaceId, period, departmentFilter]);

  // Calcular valor máximo para gráfico
  const maxVolume = Math.max(
    ...dailyVolume.map(d => d.inbound + d.outbound),
    1
  );

  const periodLabel = PERIOD_OPTIONS.find(p => p.value === period)?.label || '';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const formatDayOfWeek = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            Relatórios
          </h1>
          <p className="text-sm text-slate-500 mt-1">Performance da equipe de atendimento</p>
        </div>

        {/* Filtros */}
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
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none appearance-none cursor-pointer"
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
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* ─── Cards de Resumo ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total de Mensagens */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                  <ArrowUpRight className="w-3 h-3" />
                  {periodLabel}
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800">{summary?.total_messages || 0}</p>
              <p className="text-xs text-slate-500 mt-1">
                📥 {summary?.total_inbound || 0} recebidas · 📤 {summary?.total_outbound || 0} enviadas
              </p>
            </div>

            {/* Conversas Atendidas */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                  <ArrowUpRight className="w-3 h-3" />
                  {periodLabel}
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800">{summary?.total_conversations || 0}</p>
              <p className="text-xs text-slate-500 mt-1">Conversas com resposta</p>
            </div>

            {/* Tempo Médio */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${
                  (summary?.avg_response_time_minutes || 0) <= 5 
                    ? 'text-emerald-600 bg-emerald-50' 
                    : 'text-amber-600 bg-amber-50'
                }`}>
                  {(summary?.avg_response_time_minutes || 0) <= 5 
                    ? <ArrowDownRight className="w-3 h-3" />
                    : <ArrowUpRight className="w-3 h-3" />
                  }
                  {(summary?.avg_response_time_minutes || 0) <= 5 ? 'Bom' : 'Atenção'}
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800">
                {summary?.avg_response_time_minutes || 0}<span className="text-lg text-slate-400 ml-1">min</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">Tempo médio de resposta</p>
            </div>

            {/* Atendentes Ativos */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-violet-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800">{summary?.active_agents || 0}</p>
              <p className="text-xs text-slate-500 mt-1">Atendentes ativos no período</p>
            </div>
          </div>

          {/* ─── Grid: Gráfico + Ranking ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Gráfico de Volume Diário */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-violet-500" />
                Volume de Mensagens por Dia
              </h3>

              {dailyVolume.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-sm text-slate-400">
                  Nenhum dado para o período selecionado
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Gráfico de barras horizontais */}
                  {dailyVolume.map((day) => {
                    const total = day.inbound + day.outbound;
                    const inboundWidth = maxVolume > 0 ? (day.inbound / maxVolume) * 100 : 0;
                    const outboundWidth = maxVolume > 0 ? (day.outbound / maxVolume) * 100 : 0;
                    return (
                      <div key={day.date} className="flex items-center gap-3 group">
                        <div className="w-20 text-right flex-shrink-0">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase">{formatDayOfWeek(day.date)}</span>
                          <span className="text-[10px] text-slate-400 ml-1">{formatDate(day.date)}</span>
                        </div>
                        <div className="flex-1 flex items-center gap-0.5 h-8">
                          {/* Barra Inbound */}
                          <div 
                            className="h-6 bg-blue-400 rounded-l-md transition-all duration-500 group-hover:opacity-80"
                            style={{ width: `${inboundWidth}%`, minWidth: day.inbound > 0 ? '4px' : '0' }}
                            title={`📥 ${day.inbound} recebidas`}
                          />
                          {/* Barra Outbound */}
                          <div 
                            className="h-6 bg-emerald-500 rounded-r-md transition-all duration-500 group-hover:opacity-80"
                            style={{ width: `${outboundWidth}%`, minWidth: day.outbound > 0 ? '4px' : '0' }}
                            title={`📤 ${day.outbound} enviadas`}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-600 w-8 text-right">{total}</span>
                      </div>
                    );
                  })}
                  
                  {/* Legenda */}
                  <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-blue-400 rounded-sm" />
                      <span className="text-[10px] text-slate-500 font-medium">Recebidas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                      <span className="text-[10px] text-slate-500 font-medium">Enviadas</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Ranking de Atendentes */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-500" />
                Ranking de Atendentes
              </h3>

              {agents.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-sm text-slate-400">
                  Nenhum atendimento registrado
                </div>
              ) : (
                <div className="space-y-3">
                  {agents.map((agent, index) => {
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`;
                    const barWidth = agents[0].messages_sent > 0 
                      ? (agent.messages_sent / agents[0].messages_sent) * 100 
                      : 0;

                    return (
                      <div key={agent.id} className="group">
                        <div className="flex items-center gap-2.5 mb-1">
                          <span className="text-sm w-6 text-center">{medal}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-slate-700 truncate">
                                {agent.name}
                              </span>
                              <span className="text-xs font-bold text-slate-800 ml-2">
                                {agent.messages_sent}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-400 font-medium">{agent.department}</span>
                              <span className="text-[10px] text-slate-300">•</span>
                              <span className="text-[10px] text-slate-400">{agent.conversations_handled} conversas</span>
                              {agent.transfers_made > 0 && (
                                <>
                                  <span className="text-[10px] text-slate-300">•</span>
                                  <span className="text-[10px] text-amber-500">{agent.transfers_made} transf.</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Barra de progresso */}
                        <div className="ml-8 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-700"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ─── Tabela Detalhada ─── */}
          <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-700">Detalhamento por Colaborador</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Colaborador</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Setor</th>
                    <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Msgs Enviadas</th>
                    <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Atendimentos</th>
                    <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transferências</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agents.map((agent, index) => (
                    <tr key={agent.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3.5">
                        <span className="text-xs font-bold text-slate-400">{index + 1}</span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                            {agent.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{agent.name}</p>
                            <p className="text-[10px] text-slate-400 capitalize">{agent.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{agent.department}</span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span className="text-sm font-bold text-slate-700">{agent.messages_sent}</span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span className="text-sm font-bold text-emerald-600">{agent.conversations_handled}</span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span className={`text-sm font-bold ${agent.transfers_made > 0 ? 'text-amber-500' : 'text-slate-300'}`}>
                          {agent.transfers_made}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {agents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                        Nenhum dado para exibir no período selecionado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
