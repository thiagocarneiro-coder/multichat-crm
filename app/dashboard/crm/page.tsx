'use client';

import { useState, useEffect } from 'react';
import { Search, User, MessageCircle, Clock, GripVertical } from 'lucide-react';
import { supabaseClient as supabase } from '@/lib/supabase-client';
import { authenticatedFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface Contact {
  id: string;
  name: string;
  phone: string;
  last_message: string;
  pipeline_stage: string;
  unread: number;
  updated_at: string;
  created_at: string;
}

const PIPELINE_COLUMNS = [
  { key: 'novo', label: 'Novo', color: 'border-t-slate-400', headerBg: 'bg-slate-50', badge: 'bg-slate-100 text-slate-700' },
  { key: 'qualificado', label: 'Qualificado', color: 'border-t-blue-500', headerBg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700' },
  { key: 'negociacao', label: 'Em Negociação', color: 'border-t-amber-500', headerBg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-700' },
  { key: 'fechado', label: 'Fechado', color: 'border-t-emerald-500', headerBg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700' },
  { key: 'perdido', label: 'Perdido', color: 'border-t-red-500', headerBg: 'bg-red-50', badge: 'bg-red-100 text-red-700' },
];

export default function CRMPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const router = useRouter();

  // Fetch contatos + Realtime
  useEffect(() => {
    const fetchContacts = async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (!error && data) {
        setContacts(data);
      }
    };

    fetchContacts();

    const channel = supabase.channel('crm_contacts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setContacts(prev => [payload.new as Contact, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setContacts(prev => prev.map(c => c.id === payload.new.id ? payload.new as Contact : c));
        } else if (payload.eventType === 'DELETE') {
          setContacts(prev => prev.filter(c => c.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, contactId: string) => {
    setDraggedId(contactId);
    e.dataTransfer.effectAllowed = 'move';
    // Add a slight delay for visual feedback
    const target = e.target as HTMLElement;
    setTimeout(() => {
      target.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedId(null);
    setDragOverColumn(null);
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnKey);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedId) return;

    const contact = contacts.find(c => c.id === draggedId);
    if (!contact || contact.pipeline_stage === newStage) return;

    // Atualização otimista
    setContacts(prev => prev.map(c => 
      c.id === draggedId ? { ...c, pipeline_stage: newStage } : c
    ));

    try {
      const res = await authenticatedFetch(`/api/contacts/${draggedId}`, {
        method: 'PATCH',
        body: JSON.stringify({ pipeline_stage: newStage }),
      });

      if (!res.ok) {
        // Rollback em caso de erro
        setContacts(prev => prev.map(c => 
          c.id === draggedId ? { ...c, pipeline_stage: contact.pipeline_stage } : c
        ));
      }
    } catch {
      // Rollback em caso de erro
      setContacts(prev => prev.map(c => 
        c.id === draggedId ? { ...c, pipeline_stage: contact.pipeline_stage } : c
      ));
    }

    setDraggedId(null);
  };

  // Ir para a conversa
  const handleOpenConversation = (contactId: string) => {
    router.push(`/dashboard/conversas?contact=${contactId}`);
  };

  // Tempo relativo
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const filteredContacts = contacts.filter(c => 
    (c.name || c.phone).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-100">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">CRM Pipeline</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Arraste os contatos entre as etapas do funil
          </p>
        </div>
        <div className="relative w-64">
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

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 h-full min-w-max">
          {PIPELINE_COLUMNS.map((column) => {
            const columnContacts = filteredContacts.filter(c => c.pipeline_stage === column.key);
            const isDragOver = dragOverColumn === column.key;

            return (
              <div
                key={column.key}
                className={`w-72 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm transition-all duration-200 ${isDragOver ? 'ring-2 ring-emerald-500 ring-offset-2 scale-[1.01]' : ''}`}
                onDragOver={(e) => handleDragOver(e, column.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.key)}
              >
                {/* Column Header */}
                <div className={`px-4 py-3 rounded-t-2xl border-t-4 ${column.color} ${column.headerBg} flex items-center justify-between`}>
                  <h3 className="text-sm font-bold text-slate-800">{column.label}</h3>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${column.badge}`}>
                    {columnContacts.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  {columnContacts.length === 0 ? (
                    <div className={`p-4 border-2 border-dashed rounded-xl text-center transition-colors ${isDragOver ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`}>
                      <p className="text-xs text-slate-400">
                        {isDragOver ? 'Solte aqui' : 'Nenhum contato'}
                      </p>
                    </div>
                  ) : (
                    columnContacts.map((contact) => (
                      <div
                        key={contact.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, contact.id)}
                        onDragEnd={handleDragEnd}
                        className={`bg-white border border-slate-200 rounded-xl p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 group ${draggedId === contact.id ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-semibold text-slate-800 truncate">
                                {contact.name || 'Sem nome'}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-mono">{contact.phone}</p>
                            </div>
                          </div>
                          <GripVertical className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </div>

                        {contact.last_message && (
                          <p className="text-xs text-slate-500 truncate mb-2 pl-10">
                            {contact.last_message}
                          </p>
                        )}

                        <div className="flex items-center justify-between pl-10">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo(contact.updated_at)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenConversation(contact.id);
                            }}
                            className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                          >
                            <MessageCircle className="w-3 h-3" />
                            Conversar
                          </button>
                        </div>

                        {contact.unread > 0 && (
                          <div className="absolute -top-1 -right-1">
                            <span className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                              {contact.unread}
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
