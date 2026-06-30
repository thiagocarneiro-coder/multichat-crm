'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Search, Edit2, Trash2, Mail, Shield, UserCheck, Key, Plus, X, Loader2, CheckCircle2, Layers, Palette } from 'lucide-react';
import { supabaseClient as supabase } from '@/lib/supabase-client';

interface Department {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface Agent {
  id: string;
  full_name: string;
  role: 'gerente' | 'atendente';
  department_id: string | null;
  department_name: string;
  email: string;
  created_at: string;
}

export default function AtendentesPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

  // Estados dos Modais
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Estados dos Formulários
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    departmentId: '',
    role: 'atendente'
  });

  // Tab ativa
  const [activeTab, setActiveTab] = useState<'usuarios' | 'setores'>('usuarios');

  // Estados para CRUD de Setores
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
  const [isEditDeptModalOpen, setIsEditDeptModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptColor, setNewDeptColor] = useState('slate');
  const [deptActionLoading, setDeptActionLoading] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 1. Carregar dados básicos
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setCurrentUserProfile(profile);

      if (profile && profile.role === 'gerente') {
        // Buscar setores
        const deptsRes = await fetch('/api/departments');
        if (deptsRes.ok) {
          const deptsData = await deptsRes.json();
          setDepartments(deptsData);
          if (deptsData.length > 0) {
            setFormData(prev => ({ ...prev, departmentId: deptsData[0].id }));
          }
        }

        // Buscar atendentes
        const agentsRes = await fetch('/api/agents');
        if (agentsRes.ok) {
          const agentsData = await agentsRes.json();
          setAgents(agentsData);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Limpa notificação após 4s
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // 2. Criar Atendente
  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setNotification(null);

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        setNotification({ type: 'error', message: data.error || 'Erro ao cadastrar atendente.' });
      } else {
        setNotification({ type: 'success', message: 'Atendente cadastrado com sucesso!' });
        setIsAddModalOpen(false);
        // Reset form
        setFormData({
          name: '',
          email: '',
          password: '',
          departmentId: departments[0]?.id || '',
          role: 'atendente'
        });
        // Atualizar lista
        fetchData();
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Erro de rede. Tente novamente.' });
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Atualizar Atendente
  const handleEditAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;
    setActionLoading(true);
    setNotification(null);

    try {
      const res = await fetch(`/api/agents/${selectedAgent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedAgent.full_name,
          role: selectedAgent.role,
          departmentId: selectedAgent.department_id
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setNotification({ type: 'error', message: data.error || 'Erro ao salvar alterações.' });
      } else {
        setNotification({ type: 'success', message: 'Dados atualizados com sucesso!' });
        setIsEditModalOpen(false);
        fetchData();
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Erro de rede.' });
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Excluir Atendente
  const handleDeleteAgent = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta de atendente? Ele perderá acesso ao sistema imediatamente.')) return;
    setNotification(null);

    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (!res.ok) {
        setNotification({ type: 'error', message: data.error || 'Erro ao excluir atendente.' });
      } else {
        setNotification({ type: 'success', message: 'Atendente excluído com sucesso.' });
        fetchData();
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Erro de rede.' });
    }
  };

  // ─── CRUD de Setores ───

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeptActionLoading(true);
    setNotification(null);
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDeptName, color: newDeptColor })
      });
      const data = await res.json();
      if (!res.ok) {
        setNotification({ type: 'error', message: data.error || 'Erro ao criar setor.' });
      } else {
        setNotification({ type: 'success', message: `Setor "${newDeptName}" criado com sucesso!` });
        setIsAddDeptModalOpen(false);
        setNewDeptName('');
        setNewDeptColor('slate');
        fetchData();
      }
    } catch {
      setNotification({ type: 'error', message: 'Erro de rede.' });
    } finally {
      setDeptActionLoading(false);
    }
  };

  const handleEditDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept) return;
    setDeptActionLoading(true);
    setNotification(null);
    try {
      const res = await fetch(`/api/departments/${selectedDept.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selectedDept.name, color: selectedDept.color })
      });
      const data = await res.json();
      if (!res.ok) {
        setNotification({ type: 'error', message: data.error || 'Erro ao salvar.' });
      } else {
        setNotification({ type: 'success', message: 'Setor atualizado!' });
        setIsEditDeptModalOpen(false);
        fetchData();
      }
    } catch {
      setNotification({ type: 'error', message: 'Erro de rede.' });
    } finally {
      setDeptActionLoading(false);
    }
  };

  const handleDeleteDept = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o setor "${name}"? Contatos e atendentes precisam ser movidos antes.`)) return;
    setNotification(null);
    try {
      const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setNotification({ type: 'error', message: data.error || 'Erro ao excluir.' });
      } else {
        setNotification({ type: 'success', message: `Setor "${name}" excluído!` });
        fetchData();
      }
    } catch {
      setNotification({ type: 'error', message: 'Erro de rede.' });
    }
  };

  const AVAILABLE_COLORS = [
    { name: 'slate', label: 'Cinza' },
    { name: 'blue', label: 'Azul' },
    { name: 'purple', label: 'Roxo' },
    { name: 'emerald', label: 'Verde' },
    { name: 'indigo', label: 'Índigo' },
    { name: 'amber', label: 'Amarelo' },
    { name: 'pink', label: 'Rosa' },
    { name: 'red', label: 'Vermelho' },
  ];

  // Classes estáticas para Tailwind não purgar (classes dinâmicas como bg-${name}-500 não funcionam)
  const colorBgClass: Record<string, string> = {
    slate: 'bg-slate-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    emerald: 'bg-emerald-500',
    indigo: 'bg-indigo-500',
    amber: 'bg-amber-500',
    pink: 'bg-pink-500',
    red: 'bg-red-500',
  };

  const filteredAgents = agents.filter(agent => 
    agent.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    agent.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  if (currentUserProfile?.role !== 'gerente') {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto">
        <Shield className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-slate-800">Acesso Negado</h3>
        <p className="text-slate-500 mt-2 text-sm">
          Apenas usuários com privilégios de <strong>Gerência</strong> podem visualizar e configurar a equipe de atendentes.
        </p>
      </div>
    );
  }

  return (
    <div className="py-8 px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* Notificação Temporária */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-2xl flex items-center gap-3 text-sm shadow-xl border animate-bounce ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-8 h-8 text-emerald-500" />
            Usuários e Setores
          </h1>
          <p className="mt-1 text-sm text-slate-500">Gerencie sua equipe e os setores de atendimento da empresa.</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'usuarios' ? (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all text-sm"
            >
              <UserPlus className="w-4 h-4" />
              Novo Usuário
            </button>
          ) : (
            <button
              onClick={() => setIsAddDeptModalOpen(true)}
              className="px-5 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20 transition-all text-sm"
            >
              <Plus className="w-4 h-4" />
              Novo Setor
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'usuarios' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Usuários
        </button>
        <button
          onClick={() => setActiveTab('setores')}
          className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'setores' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          Setores
        </button>
      </div>

      {activeTab === 'usuarios' && (
      <>
      {/* Caixa de Busca */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm max-w-md flex items-center relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-7 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
        />
      </div>

      {/* Grid de Atendentes */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Papel / Acesso</th>
                <th className="px-6 py-4">Setor Designado</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    Nenhum atendente cadastrado com esse critério.
                  </td>
                </tr>
              ) : (
                filteredAgents.map((agent) => {
                  const dept = departments.find(d => d.id === agent.department_id);
                  const isSelf = agent.id === currentUserProfile.id;

                  return (
                    <tr key={agent.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800 flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-slate-100 border border-slate-200 text-slate-600 rounded-full flex items-center justify-center font-bold">
                          {agent.full_name[0].toUpperCase()}
                        </div>
                        <div>
                          <span>{agent.full_name}</span>
                          {isSelf && <span className="ml-2 text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border">Você</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-xs">{agent.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${agent.role === 'gerente' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                          {agent.role === 'gerente' ? <Shield className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                          {agent.role === 'gerente' ? 'Gerência' : 'Atendente'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {agent.role === 'gerente' ? (
                          <span className="text-xs text-slate-400 italic">Acesso Global</span>
                        ) : dept ? (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${getDeptColorClass(dept.color)}`}>
                            {dept.name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Sem setor</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedAgent(agent);
                              setIsEditModalOpen(true);
                            }}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                            title="Editar atendente"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAgent(agent.id)}
                            disabled={isSelf}
                            className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 disabled:opacity-40 transition-colors"
                            title={isSelf ? 'Você não pode excluir a sua própria conta' : 'Excluir atendente'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL: CADASTRAR ATENDENTE ─── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-500" />
              Novo Atendente
            </h2>

            <form onSubmit={handleAddAgent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do atendente"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@atendente.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Senha de Acesso</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Acesso</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="atendente">Atendente</option>
                    <option value="gerente">Gerência</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Setor Padrão</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    disabled={formData.role === 'gerente'}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer disabled:opacity-50"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDITAR ATENDENTE ─── */}
      {isEditModalOpen && selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-emerald-500" />
              Editar Atendente
            </h2>

            <form onSubmit={handleEditAgent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={selectedAgent.full_name}
                  onChange={(e) => setSelectedAgent({ ...selectedAgent, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                <input
                  type="email"
                  disabled
                  value={selectedAgent.email}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-400 cursor-not-allowed font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Acesso</label>
                  <select
                    value={selectedAgent.role}
                    onChange={(e) => setSelectedAgent({ ...selectedAgent, role: e.target.value as any })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="atendente">Atendente</option>
                    <option value="gerente">Gerência</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Setor Designado</label>
                  <select
                    value={selectedAgent.department_id || ''}
                    onChange={(e) => setSelectedAgent({ ...selectedAgent, department_id: e.target.value || null })}
                    disabled={selectedAgent.role === 'gerente'}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="">Sem setor</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </>
      )}

      {/* ═══════════════════ TAB: SETORES ═══════════════════ */}
      {activeTab === 'setores' && (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(dept => {
            const agentCount = agents.filter(a => a.department_id === dept.id).length;
            const colorClass = getDeptColorClass(dept.color);
            return (
              <div key={dept.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-3 h-3 rounded-full bg-${dept.color}-500`} />
                    <h3 className="font-bold text-slate-800">{dept.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setSelectedDept({ ...dept });
                        setIsEditDeptModalOpen(true);
                      }}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                      title="Editar setor"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteDept(dept.id, dept.name)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                      title="Excluir setor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${colorClass}`}>{dept.name}</span>
                  <span className="text-xs text-slate-400">{agentCount} usuário{agentCount !== 1 ? 's' : ''}</span>
                </div>
                {agentCount > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                    {agents.filter(a => a.department_id === dept.id).map(a => (
                      <div key={a.id} className="flex items-center gap-2 text-xs text-slate-500">
                        <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-600">
                          {a.full_name[0]}
                        </div>
                        {a.full_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {departments.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Layers className="w-12 h-12 mx-auto mb-3 text-slate-200" />
            <p className="text-sm">Nenhum setor cadastrado. Crie o primeiro!</p>
          </div>
        )}
      </>
      )}

      {/* ─── MODAL: CRIAR SETOR ─── */}
      {isAddDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl p-6 relative">
            <button onClick={() => setIsAddDeptModalOpen(false)} className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-violet-500" />
              Novo Setor
            </h2>
            <form onSubmit={handleAddDept} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome do Setor</label>
                <input
                  type="text"
                  required
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="Ex: Financeiro, RH, Logística..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_COLORS.map(c => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setNewDeptColor(c.name)}
                      className={`w-8 h-8 rounded-lg ${colorBgClass[c.name] || 'bg-slate-500'} border-2 transition-all ${
                        newDeptColor === c.name ? 'border-slate-800 scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddDeptModalOpen(false)} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl">Cancelar</button>
                <button type="submit" disabled={deptActionLoading} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5">
                  {deptActionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Criar Setor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDITAR SETOR ─── */}
      {isEditDeptModalOpen && selectedDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl p-6 relative">
            <button onClick={() => setIsEditDeptModalOpen(false)} className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-violet-500" />
              Editar Setor
            </h2>
            <form onSubmit={handleEditDept} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome do Setor</label>
                <input
                  type="text"
                  required
                  value={selectedDept.name}
                  onChange={(e) => setSelectedDept({ ...selectedDept, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_COLORS.map(c => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setSelectedDept({ ...selectedDept, color: c.name })}
                      className={`w-8 h-8 rounded-lg ${colorBgClass[c.name] || 'bg-slate-500'} border-2 transition-all ${
                        selectedDept.color === c.name ? 'border-slate-800 scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsEditDeptModalOpen(false)} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl">Cancelar</button>
                <button type="submit" disabled={deptActionLoading} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5">
                  {deptActionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
