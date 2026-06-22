-- =============================================================================
-- Tracker-SaaS — Schema Completo (Migration v1)
-- =============================================================================
-- Execute este SQL no SQL Editor do seu novo projeto Supabase.
-- Ordem de execução: extensões → tabelas → índices → funções → realtime
-- =============================================================================

-- 0. Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. TABELA: workspaces
-- =============================================================================
-- Cada workspace representa um cliente/empresa na plataforma multi-tenant.
CREATE TABLE public.workspaces (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  phone      TEXT,  -- Número WhatsApp do workspace (para bridge page redirect)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.workspaces IS 'Workspaces multi-tenant — cada um representa um cliente da agência.';

-- =============================================================================
-- 2. TABELA: click_sessions
-- =============================================================================
-- Registra cada sessão de clique vinda de campanhas (Meta Ads, Google Ads).
CREATE TABLE public.click_sessions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  session_code TEXT UNIQUE NOT NULL,  -- Código injetado no WhatsApp para matching
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  fbclid       TEXT,
  gclid        TEXT,
  curso        TEXT,   -- Campo customizado (ex: nome do curso para Farani)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_click_sessions_workspace ON public.click_sessions(workspace_id);
CREATE INDEX idx_click_sessions_code ON public.click_sessions(session_code);

COMMENT ON TABLE public.click_sessions IS 'Sessões de clique de campanhas pagas com UTMs e códigos de rastreamento.';

-- =============================================================================
-- 3. TABELA: leads
-- =============================================================================
-- Leads capturados via WhatsApp com vínculo à sessão de origem.
CREATE TABLE public.leads (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id     UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  phone_number     TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'NOVO',   -- NOVO, DUVIDA, NEGOCIACAO, VENDA_FECHADA
  pipeline_stage   TEXT,                           -- bridge_page_click, whatsapp_contact, etc.
  click_session_id UUID REFERENCES public.click_sessions(id) ON DELETE SET NULL,
  curso            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Impede leads duplicados por workspace + telefone
  CONSTRAINT uq_leads_workspace_phone UNIQUE (workspace_id, phone_number)
);

CREATE INDEX idx_leads_workspace ON public.leads(workspace_id);
CREATE INDEX idx_leads_status ON public.leads(status);

COMMENT ON TABLE public.leads IS 'Leads capturados com vínculo a sessões de clique e classificação por IA.';

-- =============================================================================
-- 4. TABELA: contacts
-- =============================================================================
-- Contatos do WhatsApp (conversas). Usado pelo Inbox de Conversas + Realtime.
CREATE TABLE public.contacts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone        TEXT UNIQUE NOT NULL,  -- Número limpo (sem @s.whatsapp.net)
  name         TEXT DEFAULT 'Desconhecido',
  last_message TEXT,
  status       TEXT DEFAULT 'NOVO',   -- NOVO, CURIOSO, EM NEGOCIAÇÃO, COMPROU, NAO_RESPONDE
  utm_source   TEXT,
  utm_campaign TEXT,
  unread       INTEGER NOT NULL DEFAULT 0,  -- Contador de mensagens não lidas
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contacts_phone ON public.contacts(phone);
CREATE INDEX idx_contacts_status ON public.contacts(status);
CREATE INDEX idx_contacts_updated ON public.contacts(updated_at DESC);

COMMENT ON TABLE public.contacts IS 'Contatos WhatsApp para o inbox de conversas com status de funil.';

-- =============================================================================
-- 5. TABELA: messages
-- =============================================================================
-- Mensagens individuais vinculadas a contatos.
CREATE TABLE public.messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'user',       -- 'user' (cliente) ou 'assistant' (agência/bot)
  direction  TEXT NOT NULL DEFAULT 'inbound',    -- 'inbound' ou 'outbound'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_contact ON public.messages(contact_id);
CREATE INDEX idx_messages_created ON public.messages(created_at);

COMMENT ON TABLE public.messages IS 'Histórico de mensagens do WhatsApp por contato.';

-- =============================================================================
-- 6. FUNÇÃO RPC: increment_unread
-- =============================================================================
-- Incrementa atomicamente o contador de mensagens não lidas de um contato.
-- Chamada via: supabase.rpc('increment_unread', { row_id: contactId })
CREATE OR REPLACE FUNCTION public.increment_unread(row_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.contacts
  SET unread = unread + 1,
      updated_at = now()
  WHERE id = row_id;
END;
$$;

COMMENT ON FUNCTION public.increment_unread IS 'Incrementa o contador de unreads de um contato atomicamente.';

-- =============================================================================
-- 7. HABILITAR REALTIME
-- =============================================================================
-- O Inbox de Conversas usa Supabase Realtime para receber atualizações em tempo real.
-- IMPORTANTE: No Supabase, Realtime precisa ser habilitado manualmente via painel
-- OU via a publicação abaixo:

ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- =============================================================================
-- 8. ROW LEVEL SECURITY (RLS) — Desabilitado por enquanto
-- =============================================================================
-- No estado atual, o app usa Service Role Key (bypass RLS).
-- Quando autenticação de usuário for implementada, habilitar RLS:
--
-- ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.click_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
--
-- E criar policies por workspace_id vinculado ao auth.uid()

-- =============================================================================
-- FIM DO MIGRATION
-- =============================================================================
