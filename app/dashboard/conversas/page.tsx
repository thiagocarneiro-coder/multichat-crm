'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, User, Bot, Clock, MessageCircle, Send, ChevronDown } from 'lucide-react';
import { supabaseClient as supabase } from '@/lib/supabase-client';
import { authenticatedFetch } from '@/lib/api';
import { useSearchParams } from 'next/navigation';

interface Contact {
  id: string;
  name: string;
  phone: string;
  last_message: string;
  pipeline_stage: string;
  unread: number;
  updated_at: string;
}

interface Message {
  id: string;
  contact_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const PIPELINE_STAGES: Record<string, { label: string; color: string; bg: string }> = {
  'novo': { label: 'Novo', color: 'text-slate-700', bg: 'bg-slate-100 border-slate-200' },
  'qualificado': { label: 'Qualificado', color: 'text-blue-700', bg: 'bg-blue-100 border-blue-200' },
  'negociacao': { label: 'Em Negociação', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200' },
  'fechado': { label: 'Fechado', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200' },
  'perdido': { label: 'Perdido', color: 'text-red-700', bg: 'bg-red-100 border-red-200' },
};

export default function ConversasPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [filterStage, setFilterStage] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showStageDropdown, setShowStageDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const searchParams = useSearchParams();

  // Auto-scroll para última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch inicial de contatos + Realtime
  useEffect(() => {
    const fetchContacts = async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (!error && data) {
        setContacts(data);
        
        // Se veio com ?contact=ID, selecionar automaticamente
        const contactId = searchParams.get('contact');
        if (contactId) {
          const found = data.find((c: Contact) => c.id === contactId);
          if (found) setSelectedContact(found);
        }
      }
    };

    fetchContacts();

    const channel = supabase.channel('contacts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setContacts(prev => [payload.new as Contact, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setContacts(prev => {
            const updated = prev.map(c => c.id === payload.new.id ? payload.new as Contact : c);
            return updated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
          });
          
          setSelectedContact(prev => prev?.id === payload.new.id ? payload.new as Contact : prev);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [searchParams]);

  // Fetch das mensagens ao selecionar um contato + Realtime
  useEffect(() => {
    if (!selectedContact?.id) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, contact_id, content, role, created_at')
        .eq('contact_id', selectedContact.id)
        .order('created_at', { ascending: true });
        
      if (error) {
        console.error('Erro Supabase:', error.message);
      } else if (data) {
        setMessages(data);
      }
    };

    fetchMessages();
    
    // Zera os unreads no banco ao abrir a conversa
    if (selectedContact.unread > 0) {
      supabase.from('contacts').update({ unread: 0 }).eq('id', selectedContact.id).then();
    }

    const channel = supabase.channel(`messages_changes_${selectedContact.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `contact_id=eq.${selectedContact.id}` }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
        supabase.from('contacts').update({ unread: 0 }).eq('id', selectedContact.id).then();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedContact?.id]);

  // Enviar mensagem
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Inserção otimista
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      contact_id: selectedContact.id,
      role: 'assistant',
      content: messageText,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await authenticatedFetch('/api/whatsapp/send', {
        method: 'POST',
        body: JSON.stringify({
          phone: selectedContact.phone,
          message: messageText,
          contactId: selectedContact.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert('Erro ao enviar: ' + (data.error || 'Tente novamente'));
        // Remover mensagem otimista em caso de erro
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      }
    } catch (err: unknown) {
      alert('Erro ao enviar: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    }

    setSending(false);
    inputRef.current?.focus();
  };

  // Alterar pipeline stage
  const handleChangeStage = async (stage: string) => {
    if (!selectedContact) return;
    setShowStageDropdown(false);

    try {
      await authenticatedFetch(`/api/contacts/${selectedContact.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ pipeline_stage: stage }),
      });
    } catch (err) {
      console.error('Erro ao atualizar stage:', err);
    }
  };

  // Tecla Enter para enviar
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesStage = filterStage === 'TODOS' ? true : contact.pipeline_stage === filterStage;
    const matchesSearch = (contact.name || contact.phone).toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStage && matchesSearch;
  });

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-slate-50 border-t border-slate-200">
      
      {/* Sidebar de Contatos */}
      <div className="w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 space-y-3">
          <h1 className="text-xl font-bold text-slate-800">Conversas</h1>
          
          {/* Filtros de Pipeline Stage */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { key: 'TODOS', label: 'Todos', activeClass: 'bg-slate-800 text-white', inactiveClass: 'bg-slate-100 text-slate-600 hover:bg-slate-200' },
              { key: 'novo', label: 'Novos', activeClass: 'bg-slate-600 text-white', inactiveClass: 'bg-slate-50 text-slate-600 hover:bg-slate-100' },
              { key: 'qualificado', label: 'Qualificados', activeClass: 'bg-blue-600 text-white', inactiveClass: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
              { key: 'negociacao', label: 'Negociação', activeClass: 'bg-amber-500 text-white', inactiveClass: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
              { key: 'fechado', label: 'Fechados', activeClass: 'bg-emerald-600 text-white', inactiveClass: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
            ].map(f => (
              <button 
                key={f.key}
                onClick={() => setFilterStage(f.key)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filterStage === f.key ? f.activeClass : f.inactiveClass}`}
              >
                {f.label}
              </button>
            ))}
          </div>

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

        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">
              Nenhum contato encontrado.
            </div>
          ) : (
            filteredContacts.map(contact => {
              const stage = PIPELINE_STAGES[contact.pipeline_stage] || PIPELINE_STAGES['novo'];
              
              return (
              <div 
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`p-4 border-b border-slate-100 cursor-pointer transition-colors flex gap-3 ${selectedContact?.id === contact.id ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-slate-500" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800 truncate text-sm">{contact.name || contact.phone}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${stage.bg} ${stage.color}`}>
                        {stage.label}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap ml-2">{formatTime(contact.updated_at)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-sm text-slate-500 truncate">{contact.last_message}</p>
                    {contact.unread > 0 && (
                      <span className="ml-2 bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {contact.unread}
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

      {/* Área Principal de Chat */}
      <div className="flex-1 flex flex-col bg-slate-50/50 relative">
        {selectedContact ? (
          <>
            {/* Cabeçalho do Chat */}
            <div className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">{selectedContact.name || selectedContact.phone}</h2>
                  <p className="text-xs text-slate-500">{selectedContact.phone}</p>
                </div>
              </div>
              
              {/* Pipeline Stage Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setShowStageDropdown(!showStageDropdown)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors ${PIPELINE_STAGES[selectedContact.pipeline_stage]?.bg || 'bg-slate-100 border-slate-200'} ${PIPELINE_STAGES[selectedContact.pipeline_stage]?.color || 'text-slate-700'}`}
                >
                  {PIPELINE_STAGES[selectedContact.pipeline_stage]?.label || 'Novo'}
                  <ChevronDown className="w-3 h-3" />
                </button>
                
                {showStageDropdown && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 min-w-[160px]">
                    {Object.entries(PIPELINE_STAGES).map(([key, stage]) => (
                      <button
                        key={key}
                        onClick={() => handleChangeStage(key)}
                        className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors ${stage.color}`}
                      >
                        {stage.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Histórico de Mensagens */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length > 0 && (() => {
                const firstDate = new Date(messages[0].created_at);
                const today = new Date();
                const isToday = firstDate.toDateString() === today.toDateString();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                const isYesterday = firstDate.toDateString() === yesterday.toDateString();
                const label = isToday ? 'Hoje' : isYesterday ? 'Ontem' : firstDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
                return (
                  <div className="flex justify-center mb-4">
                    <span className="bg-slate-200 text-slate-600 text-xs px-3 py-1 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {label}
                    </span>
                  </div>
                );
              })()}
              
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`flex max-w-[75%] gap-2 ${msg.role === 'user' ? 'flex-row' : 'flex-row-reverse'}`}>
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-auto mb-1">
                      {msg.role === 'user' ? (
                         <div className="w-full h-full bg-slate-200 rounded-full flex items-center justify-center">
                           <User className="w-4 h-4 text-slate-500" />
                         </div>
                      ) : (
                        <div className="w-full h-full bg-emerald-100 rounded-full flex items-center justify-center">
                           <Bot className="w-4 h-4 text-emerald-600" />
                        </div>
                      )}
                    </div>

                    <div className={`p-3 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm' 
                        : 'bg-emerald-600 text-white rounded-br-none shadow-md'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <div className={`text-[10px] mt-1 text-right ${msg.role === 'user' ? 'text-slate-400' : 'text-emerald-200'}`}>
                        {formatTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de Envio */}
            <div className="p-4 bg-white border-t border-slate-200">
              <div className="flex items-end gap-3">
                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua mensagem..."
                  rows={1}
                  className="flex-1 px-4 py-3 bg-slate-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none max-h-32"
                  style={{ minHeight: '44px' }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="w-11 h-11 bg-emerald-600 text-white rounded-full flex items-center justify-center hover:bg-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex-shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                Enter para enviar · Shift+Enter para nova linha
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col text-slate-400">
            <MessageCircle className="w-16 h-16 mb-4 text-slate-200" />
            <p className="font-medium">Selecione uma conversa para começar</p>
            <p className="text-sm mt-1">As mensagens do WhatsApp aparecerão aqui em tempo real.</p>
          </div>
        )}
      </div>
    </div>
  );
}
