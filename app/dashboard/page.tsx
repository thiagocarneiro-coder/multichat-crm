'use client';

import { useState, useEffect } from 'react';
import { Users, MessageCircle, Clock, Inbox, Shield, ArrowRight, UserCheck, Loader2 } from 'lucide-react';
import { supabaseClient as supabase } from '@/lib/supabase-client';
import Link from 'next/link';

interface Department {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface Profile {
  id: string;
  workspace_id: string;
  full_name: string;
  role: 'gerente' | 'atendente';
  department_id: string | null;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  last_message: string;
  updated_at: string;
  created_at: string;
  department_id: string;
  assigned_user_id: string | null;
}

export default function DashboardPage() {
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [agents, setAgents] = useState<Profile[]>([]);
  const [messagesTodayCount, setMessagesTodayCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [debugUser, setDebugUser] = useState<any>(null);

  // Carregar dados
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          setDebugError('User Auth Error: ' + userError.message);
          setLoading(false);
          return;
        }
        if (!user) {
          setDebugError('No user logged in on auth client.');
          setLoading(false);
          return;
        }
        setDebugUser(user);

        // Buscar perfil
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          setDebugError('Profile query error: ' + profileError.message + ' (Code: ' + (profileError.code || 'none') + ')');
          setLoading(false);
          return;
        }

        if (!profile) {
          setDebugError('Profile not found in database for user ID: ' + user.id);
          setLoading(false);
          return;
        }
        setCurrentUserProfile(profile as Profile);

        const workspaceId = profile.workspace_id;

        // Buscar setores
        const { data: depts } = await supabase
          .from('departments')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: true });
        if (depts) setDepartments(depts);

        // Buscar atendentes
        const { data: allAgents } = await supabase
          .from('profiles')
          .select('*')
          .eq('workspace_id', workspaceId);
        if (allAgents) setAgents(allAgents);

        // Buscar contatos
        const { data: allContacts } = await supabase
          .from('contacts')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('updated_at', { ascending: false });
        if (allContacts) setContacts(allContacts);

        // Buscar contagem de mensagens de hoje
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count, error } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', today.toISOString());
        
        if (!error && count !== null) {
          setMessagesTodayCount(count);
        }

      } catch (err) {
        console.error('[Dashboard] Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Inscrição Realtime para atualizações dinâmicas
  useEffect(() => {
    if (!currentUserProfile) return;

    const workspaceId = currentUserProfile.workspace_id;

    // Escuta mudanças de contatos (atribuições, mensagens, transferências)
    const contactsChannel = supabase.channel('dashboard_contacts_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contacts',
        filter: `workspace_id=eq.${workspaceId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setContacts(prev => [payload.new as Contact, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setContacts(prev => prev.map(c => c.id === payload.new.id ? (payload.new as Contact) : c));
        } else if (payload.eventType === 'DELETE') {
          setContacts(prev => prev.filter(c => c.id !== payload.old.id));
        }
      })
      .subscribe();

    // Escuta novas mensagens para incrementar o contador do dia
    const messagesChannel = supabase.channel('dashboard_messages_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, () => {
        setMessagesTodayCount(prev => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(contactsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [currentUserProfile]);

  // Tempo relativo amigável
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `${minutes}m atrás`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  };

  const getDeptColorClass = (colorName: string) => {
    const classes: Record<string, string> = {
      slate: 'bg-slate-100 text-slate-700 border-slate-200',
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      purple: 'bg-purple-100 text-purple-700 border-purple-200',
      emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      amber: 'bg-amber-100 text-amber-700 border-amber-200',
      pink: 'bg-pink-100 text-pink-700 border-pink-200',
      red: 'bg-red-100 text-red-700 border-red-200',
    };
    return classes[colorName] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Mapeamentos em memória
  const departmentsMap = new Map(departments.map(d => [d.id, d]));
  const agentsMap = new Map(agents.map(a => [a.id, a]));

  // Métricas de acordo com o papel
  const totalContacts = contacts.length;
  const newToday = contacts.filter(c => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(c.created_at) >= today;
  }).length;

  const totalWaitingGlobal = contacts.filter(c => c.assigned_user_id === null).length;

  // Filtragem e métricas específicas se for Atendente
  const myDeptId = currentUserProfile?.department_id || '';
  const myDept = departmentsMap.get(myDeptId);
  const myChatsCount = contacts.filter(c => c.department_id === myDeptId && c.assigned_user_id === currentUserProfile?.id).length;
  const myDeptQueueCount = contacts.filter(c => c.department_id === myDeptId && c.assigned_user_id === null).length;

  return (
    <div className="py-8 px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {debugError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 font-mono text-xs">
          <p className="font-bold">⚠️ DIAGNÓSTICO DE ERRO:</p>
          <p>{debugError}</p>
          {debugUser && <p className="mt-1">User ID: {debugUser.id} | Email: {debugUser.email}</p>}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            {currentUserProfile?.role === 'gerente' 
              ? 'Acompanhamento de filas de atendimento e atividades dos setores.'
              : `Visão geral do setor ${myDept ? myDept.name : 'Atendente'}.`}
          </p>
        </div>
        <Link 
          href="/dashboard/conversas"
          className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all text-sm self-start sm:self-auto"
        >
          Ir para Atendimento <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* ─── CARDS DE MÉTRICAS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {currentUserProfile?.role === 'gerente' ? (
          <>
            {/* Card 1: Total Contatos */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total de Conversas</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">{totalContacts}</p>
                </div>
                <div className="w-11 h-11 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Card 2: Fila Geral */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fila Global (Espera)</p>
                  <p className={`text-3xl font-black mt-1 ${totalWaitingGlobal > 0 ? 'text-amber-500' : 'text-slate-900'}`}>{totalWaitingGlobal}</p>
                </div>
                <div className={`w-11 h-11 rounded-full flex items-center justify-center ${totalWaitingGlobal > 0 ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400'}`}>
                  <Inbox className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Card 3: Novos Hoje */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Novas Conversas Hoje</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">{newToday}</p>
                </div>
                <div className="w-11 h-11 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Atendente View Cards */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Meus Atendimentos</p>
                  <p className="text-3xl font-black text-emerald-600 mt-1">{myChatsCount}</p>
                </div>
                <div className="w-11 h-11 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fila do meu Setor</p>
                  <p className={`text-3xl font-black mt-1 ${myDeptQueueCount > 0 ? 'text-amber-500' : 'text-slate-900'}`}>{myDeptQueueCount}</p>
                </div>
                <div className={`w-11 h-11 rounded-full flex items-center justify-center ${myDeptQueueCount > 0 ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400'}`}>
                  <Inbox className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Setor</p>
                  <p className="text-xl font-bold text-slate-800 mt-2 truncate max-w-[150px]">
                    {myDept ? myDept.name : 'Indefinido'}
                  </p>
                </div>
                <div className="w-11 h-11 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                  {myDept ? myDept.name.slice(0, 2) : 'WA'}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Acesso</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">Atendente</p>
                </div>
                <div className="w-11 h-11 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                  <Shield className="w-5 h-5" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─── CONTEÚDO PRINCIPAL ─── */}
      {currentUserProfile?.role === 'gerente' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Coluna Esquerda: Métricas por Setor */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-fit">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-slate-400" />
              Filas por Setor
            </h3>
            <div className="space-y-4">
              {departments.map(dept => {
                const totalInDept = contacts.filter(c => c.department_id === dept.id).length;
                const unassignedInDept = contacts.filter(c => c.department_id === dept.id && c.assigned_user_id === null).length;
                const deptColor = getDeptColorClass(dept.color);

                return (
                  <div key={dept.id} className="flex items-center justify-between p-3 border border-slate-100 hover:border-slate-200 rounded-xl transition-all">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${deptColor}`}>
                      {dept.name}
                    </span>
                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 font-medium mr-1.5">Conversas:</span>
                        <strong className="text-slate-800">{totalInDept}</strong>
                      </div>
                      <div>
                        <span className="text-amber-500 font-medium mr-1.5">Aguardando:</span>
                        <strong className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">{unassignedInDept}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coluna Direita (2/3 de largura): Monitoramento em Tempo Real */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-500 animate-pulse" />
                Quem está conversando com quem?
              </h3>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                Ao Vivo
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Setor Atual</th>
                    <th className="px-4 py-3">Atendente</th>
                    <th className="px-4 py-3">Última Msg</th>
                    <th className="px-4 py-3 text-right">Atualização</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {contacts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        Nenhum atendimento ativo.
                      </td>
                    </tr>
                  ) : (
                    contacts.slice(0, 10).map((contact) => {
                      const dept = departmentsMap.get(contact.department_id);
                      const agent = agentsMap.get(contact.assigned_user_id || '');
                      const deptColor = dept ? getDeptColorClass(dept.color) : 'bg-slate-100 text-slate-700';

                      return (
                        <tr key={contact.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {contact.name || contact.phone}
                          </td>
                          <td className="px-4 py-3">
                            {dept && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${deptColor}`}>
                                {dept.name}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {agent ? (
                              <span className="font-semibold text-slate-700">
                                👤 {agent.full_name}
                              </span>
                            ) : (
                              <span className="text-amber-600 font-bold bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-md">
                                ⏳ Aguardando...
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-500 max-w-[150px] truncate" title={contact.last_message}>
                            {contact.last_message || '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-400 font-medium whitespace-nowrap">
                            {timeAgo(contact.updated_at)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {contacts.length > 10 && (
              <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                <Link 
                  href="/dashboard/conversas" 
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors inline-flex items-center gap-1"
                >
                  Visualizar todas as {contacts.length} conversas no chat →
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Se for Atendente: Exibir atalhos úteis e fila do próprio setor */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fila do Setor do Atendente */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col h-fit">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Inbox className="w-5 h-5 text-amber-500" />
              Clientes na Fila do seu Setor ({myDeptQueueCount})
            </h3>
            
            <div className="divide-y divide-slate-100">
              {contacts.filter(c => c.department_id === myDeptId && c.assigned_user_id === null).length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-sm">Não há nenhum cliente na fila deste setor agora.</p>
              ) : (
                contacts
                  .filter(c => c.department_id === myDeptId && c.assigned_user_id === null)
                  .slice(0, 5)
                  .map(c => (
                    <div key={c.id} className="py-3 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-semibold text-slate-800">{c.name || c.phone}</p>
                        <p className="text-xs text-slate-400 max-w-[200px] truncate">{c.last_message}</p>
                      </div>
                      <Link
                        href={`/dashboard/conversas?contact=${c.id}`}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                      >
                        Atender
                      </Link>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Atalho rápido */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-full">
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-500" />
                Atendimento Rápido
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                Você tem <strong>{myChatsCount}</strong> conversas em andamento sob sua responsabilidade. Acesse a tela de conversas para responder seus clientes.
              </p>
            </div>
            <Link
              href="/dashboard/conversas"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all text-sm"
            >
              Iniciar Atendimentos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
