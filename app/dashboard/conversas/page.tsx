'use client';

import { useState } from 'react';
import { Search, MoreVertical, Send, User, Bot, Clock, MessageCircle } from 'lucide-react';

// Mock Data
const MOCK_CONTACTS = [
  {
    id: '1',
    name: 'João Silva',
    number: '+55 11 99999-9999',
    lastMessage: 'Gostaria de um orçamento para vídeo institucional.',
    time: '10:32',
    unread: 2,
    status: 'online',
    leadStatus: 'curioso'
  },
  {
    id: '2',
    name: 'Maria Fernanda',
    number: '+55 21 98888-8888',
    lastMessage: 'Quais os valores para cobertura de evento?',
    time: 'Ontem',
    unread: 0,
    status: 'offline',
    leadStatus: 'em_negociacao'
  },
  {
    id: '3',
    name: 'Carlos Empreendimentos',
    number: '+55 31 97777-7777',
    lastMessage: 'Perfeito, aguardo o envio do contrato.',
    time: 'Terça',
    unread: 0,
    status: 'online',
    leadStatus: 'comprou'
  },
  {
    id: '4',
    name: 'Ana Souza',
    number: '+55 41 96666-6666',
    lastMessage: '...',
    time: 'Segunda',
    unread: 0,
    status: 'offline',
    leadStatus: 'nao_responde'
  }
];

const MOCK_MESSAGES = [
  { id: '1', sender: 'client', text: 'Olá! Vi o portfólio da Ursa Filme e gostaria de entender como funciona a produção de uma campanha.', time: '10:30' },
  { id: '2', sender: 'system', text: 'Olá, João! Tudo bem? Sou a assistente virtual da Ursa Filme. Trabalhamos com produções de alto padrão. Para entender melhor, qual o foco da sua campanha?', time: '10:31' },
  { id: '3', sender: 'client', text: 'Gostaria de um orçamento para vídeo institucional.', time: '10:32' }
];

const STATUS_CONFIG: Record<string, { label: string, color: string }> = {
  'novo': { label: 'Novo', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  'curioso': { label: 'Curioso', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  'em_negociacao': { label: 'Em Negociação', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  'comprou': { label: 'Comprou', color: 'bg-green-100 text-green-800 border-green-200' },
  'nao_responde': { label: 'Não Responde', color: 'bg-red-100 text-red-800 border-red-200' }
};

export default function ConversasPage() {
  const [selectedContact, setSelectedContact] = useState(MOCK_CONTACTS[0]);
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  const filteredContacts = MOCK_CONTACTS.filter(contact => 
    filterStatus === 'todos' ? true : contact.leadStatus === filterStatus
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-slate-50 border-t border-slate-200">
      
      {/* Sidebar de Contatos */}
      <div className="w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 space-y-4">
          <h1 className="text-xl font-bold text-slate-800">Conversas</h1>
          
          {/* Filtros de Status */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button 
              onClick={() => setFilterStatus('todos')}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filterStatus === 'todos' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilterStatus('curioso')}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filterStatus === 'curioso' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'}`}
            >
              Curiosos
            </button>
            <button 
              onClick={() => setFilterStatus('em_negociacao')}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filterStatus === 'em_negociacao' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
            >
              Em Negociação
            </button>
            <button 
              onClick={() => setFilterStatus('comprou')}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filterStatus === 'comprou' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
            >
              Compraram
            </button>
            <button 
              onClick={() => setFilterStatus('nao_responde')}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filterStatus === 'nao_responde' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
            >
              Não Responde
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar contatos..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredContacts.map(contact => {
            const statusStyle = STATUS_CONFIG[contact.leadStatus] || STATUS_CONFIG['novo'];
            
            return (
            <div 
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className={`p-4 border-b border-slate-100 cursor-pointer transition-colors flex gap-3 ${selectedContact.id === contact.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
            >
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-slate-500" />
                </div>
                {contact.status === 'online' && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800 truncate text-sm">{contact.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusStyle.color}`}>
                      {statusStyle.label}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap ml-2">{contact.time}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-sm text-slate-500 truncate">{contact.lastMessage}</p>
                  {contact.unread > 0 && (
                    <span className="ml-2 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {contact.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
            );
          })}
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
                  <h2 className="font-bold text-slate-800">{selectedContact.name}</h2>
                  <p className="text-xs text-slate-500">{selectedContact.number}</p>
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
              
              {MOCK_MESSAGES.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.sender === 'client' ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`flex max-w-[75%] gap-2 ${msg.sender === 'client' ? 'flex-row' : 'flex-row-reverse'}`}>
                    
                    {/* Avatar da mensagem */}
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-auto mb-1">
                      {msg.sender === 'client' ? (
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
                      msg.sender === 'client' 
                        ? 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm' 
                        : 'bg-blue-600 text-white rounded-br-none shadow-md'
                    }`}>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                      <div className={`text-[10px] mt-1 text-right ${msg.sender === 'client' ? 'text-slate-400' : 'text-blue-200'}`}>
                        {msg.time}
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
                  placeholder="Mensagens serão respondidas automaticamente pela IA..." 
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
