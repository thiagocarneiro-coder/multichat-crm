-- =============================================================================
-- MultiChat CRM — Schema Completo (Infraestrutura Independente)
-- =============================================================================
-- Execute este SQL no SQL Editor do seu NOVO projeto Supabase.
-- Ordem: extensões → tabelas → índices → funções → realtime
-- =============================================================================

-- 0. Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. TABELA: workspaces
-- =============================================================================
-- Cada workspace representa uma conta/empresa no MultiChat CRM.
-- No MVP, cada usuário tem 1 workspace.
CREATE TABLE public.workspaces (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL,  -- auth.uid() do Supabase Auth
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  phone      TEXT,  -- Número conectado ao WhatsApp (preenchido automaticamente)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspaces_user ON public.workspaces(user_id);

COMMENT ON TABLE public.workspaces IS 'Workspaces do MultiChat CRM — cada um representa uma conta/empresa.';

-- =============================================================================
-- 2. TABELA: contacts
-- =============================================================================
-- Centro do CRM. Cada contato é um cliente/lead com posição no pipeline.
CREATE TABLE public.contacts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id   UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  phone          TEXT NOT NULL,
  name           TEXT DEFAULT 'Desconhecido',
  email          TEXT,
  company        TEXT,
  notes          TEXT,
  tags           TEXT[],
  pipeline_stage TEXT NOT NULL DEFAULT 'novo',  -- novo, qualificado, negociacao, fechado, perdido
  last_message   TEXT,
  unread         INTEGER NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Impede contatos duplicados por workspace + telefone
  CONSTRAINT uq_contacts_workspace_phone UNIQUE (workspace_id, phone)
);

CREATE INDEX idx_contacts_workspace ON public.contacts(workspace_id);
CREATE INDEX idx_contacts_pipeline ON public.contacts(pipeline_stage);
CREATE INDEX idx_contacts_phone ON public.contacts(phone);
CREATE INDEX idx_contacts_updated ON public.contacts(updated_at DESC);

COMMENT ON TABLE public.contacts IS 'Contatos do CRM com pipeline stage, notas e tags.';

-- =============================================================================
-- 3. TABELA: messages
-- =============================================================================
-- Mensagens individuais vinculadas a contatos.
CREATE TABLE public.messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id   UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'user',       -- 'user' (cliente) ou 'assistant' (atendente)
  direction    TEXT NOT NULL DEFAULT 'inbound',    -- 'inbound' ou 'outbound'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_contact ON public.messages(contact_id);
CREATE INDEX idx_messages_created ON public.messages(created_at);

COMMENT ON TABLE public.messages IS 'Histórico de mensagens WhatsApp por contato.';

-- =============================================================================
-- 4. FUNÇÃO RPC: increment_unread
-- =============================================================================
-- Incrementa atomicamente o contador de mensagens não lidas de um contato.
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
-- 5. HABILITAR REALTIME
-- =============================================================================
-- O Chat e o CRM usam Supabase Realtime para atualizações em tempo real.
ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- =============================================================================
-- FIM DO MIGRATION — MultiChat CRM
-- =============================================================================
