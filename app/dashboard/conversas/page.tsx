'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, User, Bot, Clock, MessageCircle, Send, ChevronDown, Check, ArrowRight, UserCheck, Inbox, Shield, CheckCircle2 } from 'lucide-react';
import { supabaseClient as supabase } from '@/lib/supabase-client';
import { useSearchParams, useRouter } from 'next/navigation';

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
  unread: number;
  updated_at: string;
  department_id: string;
  assigned_user_id: string | null;
  status: 'open' | 'closed';
}

interface Message {
  id: string;
  contact_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  sender_id: string | null;
}

interface Transfer {
  id: string;
  contact_id: string;
  from_department_id: string | null;
  to_department_id: string | null;
  transferred_by: string | null;
  created_at: string;
}

interface TimelineItem {
  id: string;
  type: 'message' | 'transfer' | 'claim' | 'closed';
  created_at: string;
  // Message fields
  role?: 'user' | 'assistant' | 'system';
  content?: string;
  sender_id?: string | null;
  // Transfer fields
  from_department_id?: string | null;
  to_department_id?: string | null;
  transferred_by?: string | null;
  // Claim fields
  claimed_by?: string | null;
  // Closed fields
  closed_by?: string | null;
}

export default function ConversasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Perfis, Departamentos e Usuário Logado
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [agents, setAgents] = useState<Profile[]>([]);
  
  // Contatos e Mensagens
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  
  // Filtros e UI
  const [filterDepartmentId, setFilterDepartmentId] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [showTransferDropdown, setShowTransferDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'meus' | 'fila' | 'finalizados'>('meus');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll para última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [timelineItems]);

  // 1. Obter usuário logado, departamentos e atendentes
  useEffect(() => {
    const bootstrapData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        // Buscar perfil do usuário
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          setCurrentUserProfile(profile as Profile);
          if (profile.role === 'atendente') {
            setActiveTab('meus');
          }
        }

        // Buscar setores
        const { data: depts } = await supabase
          .from('departments')
          .select('*')
          .order('created_at', { ascending: true });

        if (depts) setDepartments(depts);

        // Buscar todos os perfis para mapeamento
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id, workspace_id, full_name, role, department_id');

        if (allProfiles) setAgents(allProfiles);

      } catch (err) {
        console.error('[Conversas bootstrap] Erro:', err);
      }
    };

    bootstrapData();
  }, [router]);

  // 2. Buscar contatos e inscrever no Realtime
  useEffect(() => {
    if (!currentUserProfile) return;

    const fetchContacts = async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('workspace_id', currentUserProfile.workspace_id)
        .order('updated_at', { ascending: false });
      
      if (!error && data) {
        setContacts(data);
        
        // Selecionar se vier via Query Parameter (?contact=ID)
        const contactId = searchParams.get('contact');
        if (contactId) {
          const found = data.find((c: Contact) => c.id === contactId);
          if (found) setSelectedContact(found);
        }
      }
    };

    fetchContacts();

    // Inscrever em atualizações em tempo real da tabela de contatos
    const channel = supabase.channel('contacts_department_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'contacts',
        filter: `workspace_id=eq.${currentUserProfile.workspace_id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setContacts(prev => [payload.new as Contact, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          const updatedContact = payload.new as Contact;
          
          setContacts(prev => {
            const index = prev.findIndex(c => c.id === updatedContact.id);
            if (index !== -1) {
              const copy = [...prev];
              copy[index] = updatedContact;
              return copy.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
            }
            return [updatedContact, ...prev].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
          });
          
          setSelectedContact(prev => {
            if (prev?.id === updatedContact.id) {
              // Se o contato foi atualizado e mudou de departamento, e o usuário atual é atendente do setor antigo, deselecionar!
              if (currentUserProfile.role === 'atendente' && updatedContact.department_id !== currentUserProfile.department_id) {
                return null;
              }
              return updatedContact;
            }
            return prev;
          });
        } else if (payload.eventType === 'DELETE') {
          setContacts(prev => prev.filter(c => c.id !== payload.old.id));
          setSelectedContact(prev => prev?.id === payload.old.id ? null : prev);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserProfile, searchParams]);

  // 3. Buscar mensagens e transferências quando um contato for selecionado
  useEffect(() => {
    if (!selectedContact?.id || !currentUserProfile) return;

    const fetchTimeline = async () => {
      // Buscar mensagens
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('contact_id', selectedContact.id)
        .order('created_at', { ascending: true });

      if (msgError) console.error('Erro ao buscar mensagens:', msgError.message);

      // Buscar logs de transferências
      const { data: transfers, error: transferError } = await supabase
        .from('transfers')
        .select('*')
        .eq('contact_id', selectedContact.id)
        .order('created_at', { ascending: true });

      if (transferError) console.error('Erro ao buscar transferências:', transferError.message);

      // Formatar e mesclar na timeline unificada
      const items: TimelineItem[] = [];

      (messages || []).forEach((m: Message) => {
        // Detectar mensagens de sistema (claim)
        if (m.content.startsWith('__CLAIM__')) {
          const claimedById = m.content.replace('__CLAIM__', '');
          items.push({
            id: m.id,
            type: 'claim' as const,
            created_at: m.created_at,
            claimed_by: claimedById
          });
        } else if (m.content.startsWith('__CLOSED__')) {
          const closedById = m.content.replace('__CLOSED__', '');
          items.push({
            id: m.id,
            type: 'closed' as const,
            created_at: m.created_at,
            closed_by: closedById
          });
        } else {
          items.push({
            id: m.id,
            type: 'message' as const,
            created_at: m.created_at,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            sender_id: m.sender_id
          });
        }
      });

      (transfers || []).forEach((t: Transfer) => {
        items.push({
          id: t.id,
          type: 'transfer' as const,
          created_at: t.created_at,
          from_department_id: t.from_department_id,
          to_department_id: t.to_department_id,
          transferred_by: t.transferred_by
        });
      });

      // Ordenar por data de criação
      items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setTimelineItems(items);
    };

    fetchTimeline();

    // Zera os unreads no banco ao abrir a conversa (apenas se for atendente do setor ou gerente)
    const canRead = currentUserProfile.role === 'gerente' || selectedContact.department_id === currentUserProfile.department_id;
    if (canRead && selectedContact.unread > 0) {
      supabase.from('contacts').update({ unread: 0 }).eq('id', selectedContact.id).then();
    }

    // Inscrever em tempo real para novas mensagens deste contato
    const messagesChannel = supabase.channel(`messages_changes_${selectedContact.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `contact_id=eq.${selectedContact.id}` 
      }, (payload) => {
        const newMsg = payload.new as Message;
        
        // Filtrar mensagens de sistema (__CLAIM__, __CLOSED__) — já são renderizadas como eventos
        if (newMsg.content.startsWith('__CLAIM__') || newMsg.content.startsWith('__CLOSED__')) {
          return; // Ignorar — o evento já foi adicionado localmente
        }
        
        setTimelineItems(prev => [
          ...prev, 
          {
            id: newMsg.id,
            type: 'message' as const,
            created_at: newMsg.created_at,
            role: newMsg.role as 'user' | 'assistant',
            content: newMsg.content,
            sender_id: newMsg.sender_id
          }
        ]);
        
        if (canRead) {
          supabase.from('contacts').update({ unread: 0 }).eq('id', selectedContact.id).then();
        }
      })
      .subscribe();

    // Inscrever em tempo real para novos logs de transferência deste contato
    const transfersChannel = supabase.channel(`transfers_changes_${selectedContact.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'transfers', 
        filter: `contact_id=eq.${selectedContact.id}` 
      }, (payload) => {
        const newTransfer = payload.new as Transfer;
        setTimelineItems(prev => [
          ...prev, 
          {
            id: newTransfer.id,
            type: 'transfer' as const,
            created_at: newTransfer.created_at,
            from_department_id: newTransfer.from_department_id,
            to_department_id: newTransfer.to_department_id,
            transferred_by: newTransfer.transferred_by
          }
        ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(transfersChannel);
    };
  }, [selectedContact?.id, currentUserProfile]);

  // 4. Reivindicar conversa (Claim)
  const handleClaimContact = async () => {
    if (!selectedContact || claiming || !currentUserProfile) return;
    setClaiming(true);

    try {
      const { error } = await supabase
        .from('contacts')
        .update({ 
          assigned_user_id: currentUserProfile.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedContact.id);

      if (error) {
        alert('Erro ao assumir conversa: ' + error.message);
      } else {
        // Inserir mensagem de sistema na timeline (evento de claim)
        await supabase.from('messages').insert({
          contact_id: selectedContact.id,
          content: `__CLAIM__${currentUserProfile.id}`,
          role: 'system',
          direction: 'outbound',
          sender_id: currentUserProfile.id
        });

        // Atualizar localmente
        setSelectedContact(prev => prev ? { ...prev, assigned_user_id: currentUserProfile.id } : null);
        
        // Adicionar evento de claim na timeline local
        setTimelineItems(prev => [...prev, {
          id: `claim-${Date.now()}`,
          type: 'claim' as const,
          created_at: new Date().toISOString(),
          claimed_by: currentUserProfile.id
        }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClaiming(false);
    }
  };

  // 4b. Finalizar atendimento
  const handleCloseContact = async () => {
    if (!selectedContact || !currentUserProfile) return;
    if (!confirm('Finalizar este atendimento? O contato voltará para a fila de espera.')) return;

    try {
      // Desatribuir o atendente e marcar como closed
      const { error } = await supabase
        .from('contacts')
        .update({ 
          assigned_user_id: null,
          status: 'closed',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedContact.id);

      if (error) {
        alert('Erro ao finalizar: ' + error.message);
        return;
      }

      // Inserir mensagem de sistema na timeline
      await supabase.from('messages').insert({
        contact_id: selectedContact.id,
        content: `__CLOSED__${currentUserProfile.id}`,
        role: 'system',
        direction: 'outbound',
        sender_id: currentUserProfile.id
      });

      // Atualizar localmente
      setSelectedContact(prev => prev ? { ...prev, assigned_user_id: null, status: 'closed' as const } : null);
      
      // Adicionar evento na timeline local
      setTimelineItems(prev => [...prev, {
        id: `closed-${Date.now()}`,
        type: 'closed' as const,
        created_at: new Date().toISOString(),
        closed_by: currentUserProfile.id
      }]);
    } catch (err) {
      console.error(err);
    }
  };

  // 5. Encaminhar para outro setor
  const handleTransfer = async (targetDeptId: string) => {
    if (!selectedContact || !currentUserProfile) return;
    setShowTransferDropdown(false);

    try {
      const res = await fetch(`/api/contacts/${selectedContact.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_INTERNAL_API_SECRET}`
        },
        body: JSON.stringify({ 
          department_id: targetDeptId,
          assigned_user_id: null,
          status: 'open',
          transferred_by: currentUserProfile.id
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert('Erro ao transferir: ' + (data.error || 'Tente novamente'));
      } else {
        // Deselecionar após transferir (se for atendente e sumiu da tela)
        if (currentUserProfile.role === 'atendente') {
          setSelectedContact(null);
        } else {
          // Gerente apenas atualiza a visualização do contato selecionado
          const data = await res.json();
          setSelectedContact(data.contact);
        }
      }
    } catch (err) {
      console.error('Erro ao transferir contato:', err);
    }
  };

  // 6. Enviar mensagem
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || sending || !currentUserProfile) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Se a conversa não estava atribuída a ninguém, atribui ao atendente atual
    let needsAssignment = selectedContact.assigned_user_id === null;

    // Inserção otimista de mensagem na tela
    const optimisticMsg: TimelineItem = {
      id: `temp-${Date.now()}`,
      type: 'message' as const,
      role: 'assistant',
      content: messageText,
      created_at: new Date().toISOString(),
      sender_id: currentUserProfile.id
    };
    setTimelineItems(prev => [...prev, optimisticMsg]);

    try {
      // 1. Atualizar atribuição do contato se necessário
      if (needsAssignment) {
        await supabase
          .from('contacts')
          .update({ assigned_user_id: currentUserProfile.id })
          .eq('id', selectedContact.id);
        
        setSelectedContact(prev => prev ? { ...prev, assigned_user_id: currentUserProfile.id } : null);
      }

      // 2. Enviar mensagem via API (chama Evolution API e grava no banco)
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_INTERNAL_API_SECRET}`
        },
        body: JSON.stringify({
          phone: selectedContact.phone,
          message: messageText,
          contactId: selectedContact.id,
          senderId: currentUserProfile.id // Passa o ID do atendente para salvar no message.sender_id
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert('Erro ao enviar: ' + (data.error || 'Tente novamente'));
        // Rollback da mensagem otimista
        setTimelineItems(prev => prev.filter(m => m.id !== optimisticMsg.id));
      }
    } catch (err) {
      alert('Erro de conexão ao enviar. Tente novamente.');
      setTimelineItems(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Mapeamentos para exibição amigável
  const departmentsMap = new Map(departments.map(d => [d.id, d]));
  const agentsMap = new Map(agents.map(a => [a.id, a]));

  // Filtragem dos contatos
  const filteredContacts = contacts.filter(contact => {
    // 1. Filtro por busca de texto
    const matchesSearch = (contact.name || contact.phone || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // 2. Filtro de acordo com o Perfil/Papel do Usuário
    if (currentUserProfile?.role === 'atendente') {
      // Atendente nunca vê finalizados
      if (contact.status === 'closed') return false;
      
      // O Atendente só pode ver contatos que estão no seu departamento
      const matchesDept = contact.department_id === currentUserProfile.department_id;
      if (!matchesDept) return false;

      // Filtro por abas (Meus Chats vs Fila de Espera)
      if (activeTab === 'meus') {
        return contact.assigned_user_id === currentUserProfile.id;
      } else {
        return contact.assigned_user_id === null;
      }
    } else {
      // Gerente
      if (activeTab === 'finalizados') {
        return contact.status === 'closed';
      }
      
      // Nas outras abas do gerente, excluir finalizados
      if (contact.status === 'closed') return false;
      
      // Filtro de setor
      if (filterDepartmentId !== 'TODOS') {
        return contact.department_id === filterDepartmentId;
      }
      return true;
    }
  });

  // Métricas rápidas para exibição das abas (para Atendentes)
  const countMyChats = contacts.filter(c => c.status !== 'closed' && c.department_id === currentUserProfile?.department_id && c.assigned_user_id === currentUserProfile?.id).length;
  const countQueueChats = contacts.filter(c => c.status !== 'closed' && c.department_id === currentUserProfile?.department_id && c.assigned_user_id === null).length;
  const countFinalizados = contacts.filter(c => c.status === 'closed').length;

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-slate-50 border-t border-slate-200">
      
      {/* ─── COLUNA ESQUERDA: LISTA DE CONVERSAS ─── */}
      <div className="w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-500" />
              Conversas
            </h1>
            {currentUserProfile?.role === 'atendente' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Setor: {departmentsMap.get(currentUserProfile.department_id || '')?.name}
              </span>
            )}
          </div>
          
          {/* Se for Gerente: Abas Ativos/Finalizados + Filtro de Setor */}
          {currentUserProfile?.role === 'gerente' ? (
            <>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('meus')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab !== 'finalizados' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <Inbox className="w-3.5 h-3.5" />
                  Ativos
                </button>
                <button
                  onClick={() => setActiveTab('finalizados')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'finalizados' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Finalizados
                  {countFinalizados > 0 && (
                    <span className="bg-slate-500 text-white text-[10px] font-extrabold px-1.5 py-0.1 rounded-full">{countFinalizados}</span>
                  )}
                </button>
              </div>
              {activeTab !== 'finalizados' && (
                <div className="relative">
                  <select
                    value={filterDepartmentId}
                    onChange={(e) => setFilterDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                  >
                    <option value="TODOS">📁 Todos os Setores</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}
            </>
          ) : (
            /* Se for Atendente: Abas "Meus Chats" vs "Fila de Espera" */
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('meus')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'meus' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Meus Chats
                {countMyChats > 0 && (
                  <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-1.5 py-0.1 rounded-full">{countMyChats}</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('fila')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'fila' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Inbox className="w-3.5 h-3.5" />
                Fila de Espera
                {countQueueChats > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-extrabold px-1.5 py-0.1 rounded-full animate-pulse">{countQueueChats}</span>
                )}
              </button>
            </div>
          )}

          {/* Busca por texto */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar contatos..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Lista de Leads */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
              <MessageCircle className="w-8 h-8 text-slate-200" />
              <span>Nenhuma conversa encontrada.</span>
            </div>
          ) : (
            filteredContacts.map(contact => {
              const dept = departmentsMap.get(contact.department_id);
              const assignedAgent = agentsMap.get(contact.assigned_user_id || '');
              const stageColor = dept ? getDeptColorClass(dept.color) : 'bg-slate-100 text-slate-700';
              
              return (
                <div 
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`p-4 cursor-pointer transition-colors flex gap-3 ${selectedContact?.id === contact.id ? 'bg-emerald-50/70 border-l-4 border-l-emerald-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                >
                  <div className="relative flex-shrink-0 mt-1">
                    <div className="w-11 h-11 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
                      <User className="w-5 h-5 text-slate-500" />
                    </div>
                    {contact.unread > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 text-white text-[10px] font-extrabold flex items-center justify-center rounded-full border-2 border-white">
                        {contact.unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-semibold text-slate-800 truncate text-sm">{contact.name || contact.phone}</h3>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{formatTime(contact.updated_at)}</span>
                    </div>
                    
                    <p className="text-xs text-slate-500 truncate mb-1.5">{contact.last_message || 'Nenhuma mensagem'}</p>
                    
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Setor do lead */}
                      {dept && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${stageColor}`}>
                          {dept.name}
                        </span>
                      )}
                      {/* Atendente responsável */}
                      {assignedAgent ? (
                        <span className="text-[9px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                          👤 {assignedAgent.id === currentUserProfile?.id ? 'Você' : assignedAgent.full_name.split(' ')[0]}
                        </span>
                      ) : (
                        <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                          ⏳ Fila
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── COLUNA DIREITA: CONVERSA E HISTÓRICO ─── */}
      <div className="flex-1 flex flex-col bg-slate-50/50 relative">
        {selectedContact ? (
          <>
            {/* Cabeçalho */}
            <div className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
                  <User className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-sm md:text-base">{selectedContact.name || selectedContact.phone}</h2>
                  <p className="text-[10px] text-slate-400 flex items-center gap-2">
                    <span>{selectedContact.phone}</span>
                    <span>•</span>
                    <span className="font-medium text-slate-500">Setor: {departmentsMap.get(selectedContact.department_id)?.name}</span>
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Atendente responsável no header */}
                <div className="text-right hidden md:block">
                  <p className="text-[10px] text-slate-400 font-medium">Responsável</p>
                  <p className="text-xs font-semibold text-slate-700">
                    {selectedContact.assigned_user_id 
                      ? (agentsMap.get(selectedContact.assigned_user_id)?.full_name || 'Desconhecido') 
                      : '⏳ Aguardando atendente'}
                  </p>
                </div>

                {/* Dropdown de Transferência de Setor */}
                <div className="relative">
                  <button 
                    onClick={() => setShowTransferDropdown(!showTransferDropdown)}
                    className="text-xs font-bold px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    Encaminhar Setor
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  
                  {showTransferDropdown && (
                    <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 min-w-[200px]">
                      <div className="px-3 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Escolha o Setor Destino
                      </div>
                      {departments
                        .filter(d => d.id !== selectedContact.department_id)
                        .map((dept) => (
                          <button
                            key={dept.id}
                            onClick={() => handleTransfer(dept.id)}
                            className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center justify-between"
                          >
                            <span>{dept.name}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                {/* Botão Finalizar */}
                {selectedContact.assigned_user_id && (
                  <button
                    onClick={handleCloseContact}
                    className="text-xs font-bold px-3 py-2 bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Finalizado
                  </button>
                )}
              </div>
            </div>

            {/* Linha de Tempo (Mensagens + Logs de Roteamento) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
              {timelineItems.length > 0 && (() => {
                const firstDate = new Date(timelineItems[0].created_at);
                const today = new Date();
                const isToday = firstDate.toDateString() === today.toDateString();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                const isYesterday = firstDate.toDateString() === yesterday.toDateString();
                const label = isToday ? 'Hoje' : isYesterday ? 'Ontem' : firstDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
                return (
                  <div className="flex justify-center mb-4">
                    <span className="bg-slate-200/80 text-slate-600 text-[10px] px-3 py-1 rounded-full flex items-center gap-1 font-semibold">
                      <Clock className="w-3 h-3" /> {label}
                    </span>
                  </div>
                );
              })()}
              
              {timelineItems.map((item) => {
                if (item.type === 'transfer') {
                  // Render do Log de Transferência
                  const fromDeptName = departmentsMap.get(item.from_department_id || '')?.name || 'Comercial';
                  const toDeptName = departmentsMap.get(item.to_department_id || '')?.name || 'Desconhecido';
                  const transferBy = agentsMap.get(item.transferred_by || '')?.full_name || 'Sistema';
                  
                  return (
                    <div key={item.id} className="flex justify-center py-2">
                      <div className="bg-amber-50 border border-amber-100 text-amber-800 text-[11px] font-medium px-4 py-2 rounded-xl flex items-center gap-2 max-w-md shadow-sm">
                        <ArrowRight className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                        <span>
                          Transferido de <strong>{fromDeptName}</strong> para <strong>{toDeptName}</strong> por <em>{transferBy}</em> às {formatTime(item.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                }

                if (item.type === 'claim') {
                  // Render do Log de Atendimento Assumido
                  const claimedByName = agentsMap.get(item.claimed_by || '')?.full_name || 'Atendente';
                  
                  return (
                    <div key={item.id} className="flex justify-center py-2">
                      <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] font-medium px-4 py-2 rounded-xl flex items-center gap-2 max-w-md shadow-sm">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span>
                          <strong>{claimedByName}</strong> assumiu o atendimento às {formatTime(item.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                }

                if (item.type === 'closed') {
                  // Render do Log de Atendimento Finalizado
                  const closedByName = agentsMap.get(item.closed_by || '')?.full_name || 'Atendente';
                  
                  return (
                    <div key={item.id} className="flex justify-center py-2">
                      <div className="bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-medium px-4 py-2 rounded-xl flex items-center gap-2 max-w-md shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          <strong>{closedByName}</strong> finalizou o atendimento às {formatTime(item.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                }
                // Render do Balão de Mensagem
                const isAgent = item.role === 'assistant';
                const msgSender = item.sender_id ? agentsMap.get(item.sender_id) : null;
                const senderLabel = isAgent 
                  ? (msgSender ? `${msgSender.full_name.split(' ')[0]} (Atendente)` : 'Atendente')
                  : 'Cliente';

                return (
                  <div 
                    key={item.id} 
                    className={`flex ${!isAgent ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`flex max-w-[70%] gap-2 ${!isAgent ? 'flex-row' : 'flex-row-reverse'}`}>
                      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-auto mb-1 border border-slate-200">
                        {!isAgent ? (
                           <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center">
                             <User className="w-3.5 h-3.5 text-slate-500" />
                           </div>
                        ) : (
                          <div className="w-full h-full bg-emerald-50 rounded-full flex items-center justify-center">
                             <Bot className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                        )}
                      </div>

                      <div>
                        {/* Nome do Atendente acima do balão se for outbound */}
                        {isAgent && (
                          <div className="text-[10px] text-slate-400 text-right mb-0.5 mr-1.5 font-medium">
                            {senderLabel}
                          </div>
                        )}
                        
                        <div className={`p-3.5 rounded-2xl ${
                          !isAgent 
                            ? 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm' 
                            : 'bg-emerald-600 text-white rounded-br-none shadow-md shadow-emerald-500/10'
                        }`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.content}</p>
                          <div className={`text-[9px] mt-1.5 text-right font-medium ${!isAgent ? 'text-slate-400' : 'text-emerald-200'}`}>
                            {formatTime(item.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Ações de Atendimento (Se estiver Sem Atendente) */}
            {selectedContact.assigned_user_id === null && (
              <div className="bg-amber-50/80 border-t border-b border-amber-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                  <div>
                    <p className="text-xs font-bold text-amber-800">Esta conversa está na Fila de Espera</p>
                    <p className="text-[10px] text-amber-600">Nenhum atendente iniciou a conversa ainda neste setor.</p>
                  </div>
                </div>
                <button
                  onClick={handleClaimContact}
                  disabled={claiming}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  {claiming ? 'Reivindicando...' : 'Atender Conversa'}
                </button>
              </div>
            )}

            {/* Input de Envio */}
            <div className="p-4 bg-white border-t border-slate-200">
              <div className="flex items-end gap-3 max-w-4xl mx-auto">
                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={selectedContact.assigned_user_id === null ? "Digite uma resposta para assumir o chat automaticamente..." : "Digite sua mensagem..."}
                  rows={1}
                  className="flex-1 px-4 py-3 bg-slate-100 border border-transparent rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all outline-none resize-none max-h-32"
                  style={{ minHeight: '44px' }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="w-11 h-11 bg-emerald-600 text-white rounded-full flex items-center justify-center hover:bg-emerald-500 active:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex-shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 text-center">
                Enter para enviar · Shift+Enter para nova linha · Responder atribui a conversa automaticamente a você
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col text-slate-400">
            <MessageCircle className="w-16 h-16 mb-4 text-slate-200 animate-pulse" />
            <p className="font-semibold text-slate-600">Selecione uma conversa para começar</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs text-center leading-relaxed">
              {currentUserProfile?.role === 'atendente' 
                ? 'Aqui aparecerão os clientes encaminhados para o seu setor no WhatsApp.'
                : 'Selecione e monitore qualquer conversa em tempo real.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
