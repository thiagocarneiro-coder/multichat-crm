'use client';

import { useState, useEffect } from 'react';
import { Search, MoreVertical, Send, User, Bot, Clock, MessageCircle, Globe, Target } from 'lucide-react';
import { supabaseClient as supabase } from '@/lib/supabase-client';

interface Contact {
  id: string;
  name: string;
  phone_number: string;
  last_message: string;
  status: string;
  unread: number;
  updated_at: string;
  utm_source: string | null;
  utm_campaign: string | null;
}

interface Message {
  id: string;
  contact_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string, color: string }> = {
  'NOVO': { label: 'Novo', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  'CURIOSO': { label: 'Curioso', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  'EM NEGOCIAÇÃO': { label: 'Em Negociação', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  'COMPROU': { label: 'Comprou', color: 'bg-green-100 text-green-800 border-green-200' },
  'NAO_RESPONDE': { label: 'Não Responde', color: 'bg-red-100 text-red-800 border-red-200' }
};

const SOURCE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  'meta_ads': { label: 'Meta Ads', icon: '📘', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  'facebook': { label: 'Facebook', icon: '📘', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  'instagram': { label: 'Instagram', icon: '📸', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  'google_ads': { label: 'Google Ads', icon: '🔍', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'google': { label: 'Google', icon: '🔍', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'tiktok': { label: 'TikTok', icon: '🎵', color: 'bg-gray-50 text-gray-700 border-gray-200' },
  'youtube': { label: 'YouTube', icon: '▶️', color: 'bg-red-50 text-red-700 border-red-200' },
  'organic': { label: 'Orgânico', icon: '🌱', color: 'bg-green-50 text-green-700 border-green-200' },
  'direct': { label: 'Direto', icon: '💬', color: 'bg-slate-50 text-slate-600 border-slate-200' },
};

export default function ConversasPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch inicial de contatos e inscrição no Realtime
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
  }, []);

  // 2. Fetch das mensagens ao selecionar um contato e Realtime
  useEffect(() => {
    if (!selectedContact?.id) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, contact_id, content, role, created_at')
        .eq('contact_id', selectedContact.id)
        .order('created_at', { ascending: true });
        
      if (error) {
        console.error('Erro Supabase:', error.message, error.hint, error.details);
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
        
        // Zera unreads instantaneamente se a pessoa estiver com a conversa aberta
        supabase.from('contacts').update({ unread: 0 }).eq('id', selectedContact.id).then();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedContact?.id]);

  const filteredContacts = contacts.filter(contact => {
    const matchesStatus = filterStatus === 'TODOS' ? true : contact.status === filterStatus;
    const matchesSearch = (contact.name || contact.phone_number).toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
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
        <div className="p-4 border-b border-slate-200 space-y-4">
          <h1 className="text-xl font-bold text-slate-800">Conversas</h1>
          
          {/* Filtros de Status */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button 
              onClick={() => setFilterStatus('TODOS')}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filterStatus === 'TODOS' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilterStatus('CURIOSO')}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filterStatus === 'CURIOSO' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'}`}
            >
              Curiosos
            </button>
            <button 
              onClick={() => setFilterStatus('EM NEGOCIAÇÃO')}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filterStatus === 'EM NEGOCIAÇÃO' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
            >
              Em Negociação
            </button>
            <button 
              onClick={() => setFilterStatus('COMPROU')}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filterStatus === 'COMPROU' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
            >
              Compraram
            </button>
            <button 
              onClick={() => setFilterStatus('NAO_RESPONDE')}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filterStatus === 'NAO_RESPONDE' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
            >
              Não Responde
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar contatos..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
              const statusStyle = STATUS_CONFIG[contact.status] || STATUS_CONFIG['NOVO'];
              
              return (
              <div 
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`p-4 border-b border-slate-100 cursor-pointer transition-colors flex gap-3 ${selectedContact?.id === contact.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-slate-500" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800 truncate text-sm">{contact.name || contact.phone_number}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusStyle.color}`}>
                        {statusStyle.label}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap ml-2">{formatTime(contact.updated_at)}</span>
                  </div>
                  {contact.utm_source && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${SOURCE_CONFIG[contact.utm_source]?.color || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        <span>{SOURCE_CONFIG[contact.utm_source]?.icon || '🔗'}</span>
                        {SOURCE_CONFIG[contact.utm_source]?.label || contact.utm_source}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-sm text-slate-500 truncate">{contact.last_message}</p>
                    {contact.unread > 0 && (
                      <span className="ml-2 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
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
            {/* Cabecalho do Chat */}
            <div className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-slate-800">{selectedContact.name || selectedContact.phone_number}</h2>
                    {selectedContact.utm_source && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${SOURCE_CONFIG[selectedContact.utm_source]?.color || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        <span>{SOURCE_CONFIG[selectedContact.utm_source]?.icon || '🔗'}</span>
                        {SOURCE_CONFIG[selectedContact.utm_source]?.label || selectedContact.utm_source}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {selectedContact.phone_number}
                    {selectedContact.utm_campaign && (
                      <span className="ml-2 text-slate-400">• Campanha: {selectedContact.utm_campaign}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className="text-slate-400 hover:text-slate-600">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Histórico de Mensagens */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex justify-center mb-6">
                <span className="bg-slate-200 text-slate-600 text-xs px-3 py-1 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Hoje
                </span>
              </div>
              
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`flex max-w-[75%] gap-2 ${msg.role === 'user' ? 'flex-row' : 'flex-row-reverse'}`}>
                    
                    {/* Avatar da mensagem */}
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-auto mb-1">
                      {msg.role === 'user' ? (
                         <div className="w-full h-full bg-slate-200 rounded-full flex items-center justify-center">
                           <User className="w-4 h-4 text-slate-500" />
                         </div>
                      ) : (
                        <div className="w-full h-full bg-blue-100 rounded-full flex items-center justify-center">
                           <Bot className="w-4 h-4 text-blue-600" />
                        </div>
                      )}
                    </div>

                    {/* Bolha da Mensagem */}
                    <div className={`p-3 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm' 
                        : 'bg-blue-600 text-white rounded-br-none shadow-md'
                    }`}>
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      <div className={`text-[10px] mt-1 text-right ${msg.role === 'user' ? 'text-slate-400' : 'text-blue-200'}`}>
                        {formatTime(msg.created_at)}
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>

            {/* Input de Mensagem (Desativado no mock) */}
            <div className="p-4 bg-white border-t border-slate-200">
              <div className="flex items-center gap-2 bg-slate-100 rounded-full px-4 py-2">
                <input 
                  type="text" 
                  placeholder="Escreva uma mensagem para o lead..." 
                  className="flex-1 bg-transparent border-none outline-none text-sm text-slate-600 placeholder:text-slate-400"
                  disabled
                />
                <button disabled className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-400 cursor-not-allowed">
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-center text-[10px] text-slate-400 mt-2">
                * As respostas são gerenciadas pelo agente de IA. A intervenção manual será liberada na próxima versão.
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col text-slate-400">
            <MessageCircle className="w-16 h-16 mb-4 text-slate-200" />
            <p>Selecione uma conversa para visualizar o histórico.</p>
          </div>
        )}
      </div>
    </div>
  );
}
