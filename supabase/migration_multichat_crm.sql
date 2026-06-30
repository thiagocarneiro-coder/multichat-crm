-- =============================================================================
-- MultiChat CRM — Triagem Multi-Setores (Infraestrutura Independente)
-- =============================================================================
-- Execute este SQL no SQL Editor do seu projeto Supabase.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. TABELA: workspaces
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.workspaces (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL,  -- auth.uid() do Supabase Auth
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  phone      TEXT,  -- Número conectado ao WhatsApp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_user ON public.workspaces(user_id);

-- =============================================================================
-- 2. TABELA: departments (Setores)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.departments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL,
  color        TEXT NOT NULL, -- Ex: slate, blue, purple, etc. (ou hex)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_departments_workspace_slug UNIQUE (workspace_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_departments_workspace ON public.departments(workspace_id);

-- =============================================================================
-- 3. TABELA: profiles (Perfis de Atendentes / Gerentes)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'atendente' CHECK (role IN ('gerente', 'atendente')),
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_workspace ON public.profiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department_id);

-- =============================================================================
-- 4. TABELA: contacts (Contatos com Setor e Atendente)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.contacts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id     UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  phone            TEXT NOT NULL,
  name             TEXT DEFAULT 'Desconhecido',
  email            TEXT,
  company          TEXT,
  notes            TEXT,
  tags             TEXT[],
  pipeline_stage   TEXT NOT NULL DEFAULT 'novo',  -- Mantido para compatibilidade, mas o foco é o departamento
  last_message     TEXT,
  unread           INTEGER NOT NULL DEFAULT 0,
  department_id    UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_contacts_workspace_phone UNIQUE (workspace_id, phone)
);

-- Garante que as colunas novas existam caso a tabela contacts já exista
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';

CREATE INDEX IF NOT EXISTS idx_contacts_workspace ON public.contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON public.contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_department ON public.contacts(department_id);
CREATE INDEX IF NOT EXISTS idx_contacts_assigned ON public.contacts(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_updated ON public.contacts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts(status);

-- =============================================================================
-- 5. TABELA: messages (Mensagens com associação de quem enviou)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id   UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'user',       -- 'user' ou 'assistant'
  direction    TEXT NOT NULL DEFAULT 'inbound',    -- 'inbound' ou 'outbound'
  sender_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Atendente que enviou
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garante que a coluna nova exista caso a tabela messages já exista
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_contact ON public.messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at);

-- =============================================================================
-- 6. TABELA: transfers (Log de Encaminhamentos)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.transfers (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id         UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  from_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  to_department_id   UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  transferred_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transfers_contact ON public.transfers(contact_id);

-- =============================================================================
-- 7. FUNÇÕES E TRIGGERS POSTGRES
-- =============================================================================

-- A. Trigger para criação automática de Workspace/Perfil/Setores no Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_workspace_id UUID;
  workspace_name TEXT;
  workspace_slug TEXT;
  email_prefix TEXT;
BEGIN
  -- Se for atendente criado pelo gerente (que já tem workspace_id nos metadados), não criamos novo workspace
  IF (new.raw_user_meta_data->>'workspace_id') IS NOT NULL THEN
    INSERT INTO public.profiles (id, workspace_id, full_name, role, department_id)
    VALUES (
      new.id,
      (new.raw_user_meta_data->>'workspace_id')::UUID,
      COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      COALESCE(new.raw_user_meta_data->>'role', 'atendente'),
      (new.raw_user_meta_data->>'department_id')::UUID
    );
  ELSE
    -- É um novo Gerente/Signup independente
    email_prefix := split_part(new.email, '@', 1);
    workspace_name := COALESCE(new.raw_user_meta_data->>'full_name', email_prefix) || ' Workspace';
    workspace_slug := email_prefix || '-' || floor(random() * 100000)::text;

    -- 1. Criar Workspace
    INSERT INTO public.workspaces (user_id, name, slug)
    VALUES (new.id, workspace_name, workspace_slug)
    RETURNING id INTO new_workspace_id;

    -- 2. Criar os 8 setores padrão
    INSERT INTO public.departments (workspace_id, name, slug, color)
    VALUES 
      (new_workspace_id, 'Comercial', 'comercial', 'slate'),
      (new_workspace_id, 'Financeiro', 'financeiro', 'blue'),
      (new_workspace_id, 'Suporte', 'suporte', 'purple'),
      (new_workspace_id, 'Pós-Venda', 'pos-venda', 'emerald'),
      (new_workspace_id, 'Administrativo', 'administrativo', 'indigo'),
      (new_workspace_id, 'Logística', 'logistica', 'amber'),
      (new_workspace_id, 'Recursos Humanos', 'recursos-humanos', 'pink'),
      (new_workspace_id, 'Diretoria', 'diretoria', 'red');

    -- 3. Criar Perfil de Gerente
    INSERT INTO public.profiles (id, workspace_id, full_name, role)
    VALUES (
      new.id,
      new_workspace_id,
      COALESCE(new.raw_user_meta_data->>'full_name', email_prefix),
      'gerente'
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- B. Trigger para definir setor Comercial padrão para novos contatos
CREATE OR REPLACE FUNCTION public.set_default_contact_department()
RETURNS trigger AS $$
DECLARE
  comercial_id UUID;
BEGIN
  IF NEW.department_id IS NULL THEN
    SELECT id INTO comercial_id 
    FROM public.departments 
    WHERE workspace_id = NEW.workspace_id AND slug = 'comercial' 
    LIMIT 1;
    
    NEW.department_id := comercial_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_contact_insert
  BEFORE INSERT ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_default_contact_department();

-- C. Trigger para desvincular atendente e registrar log quando transferido de setor
CREATE OR REPLACE FUNCTION public.log_contact_transfer()
RETURNS trigger AS $$
BEGIN
  IF OLD.department_id IS DISTINCT FROM NEW.department_id THEN
    -- Limpa o atendente atribuído (volta para a fila de espera do novo setor)
    NEW.assigned_user_id := NULL;
    
    -- Só insere log se auth.uid() existir (chamada direta do frontend)
    -- Chamadas via service role (API) fazem o insert manualmente com transferred_by correto
    IF auth.uid() IS NOT NULL THEN
      INSERT INTO public.transfers (
        contact_id, 
        from_department_id, 
        to_department_id, 
        transferred_by
      )
      VALUES (
        NEW.id, 
        OLD.department_id, 
        NEW.department_id, 
        auth.uid()
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_contact_transfer
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.log_contact_transfer();

-- D. Função RPC para incrementar unread (já existente, garantida)
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

-- =============================================================================
-- 8. MIGRAÇÃO E SEED DE DADOS EXISTENTES (Backwards Compatibility)
-- =============================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  -- A. Criar setores e perfis para workspaces e usuários existentes
  FOR r IN SELECT id, user_id, name FROM public.workspaces LOOP
    IF NOT EXISTS (SELECT 1 FROM public.departments WHERE workspace_id = r.id) THEN
      INSERT INTO public.departments (workspace_id, name, slug, color)
      VALUES 
        (r.id, 'Comercial', 'comercial', 'slate'),
        (r.id, 'Financeiro', 'financeiro', 'blue'),
        (r.id, 'Suporte', 'suporte', 'purple'),
        (r.id, 'Pós-Venda', 'pos-venda', 'emerald'),
        (r.id, 'Administrativo', 'administrativo', 'indigo'),
        (r.id, 'Logística', 'logistica', 'amber'),
        (r.id, 'Recursos Humanos', 'recursos-humanos', 'pink'),
        (r.id, 'Diretoria', 'diretoria', 'red');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = r.user_id) THEN
      INSERT INTO public.profiles (id, workspace_id, full_name, role)
      VALUES (
        r.user_id, 
        r.id, 
        COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = r.user_id), 'Gerente'), 
        'gerente'
      );
    END IF;
  END LOOP;

  -- B. Associar contatos sem setor ao setor Comercial do workspace
  UPDATE public.contacts c
  SET department_id = (
    SELECT id FROM public.departments d 
    WHERE d.workspace_id = c.workspace_id AND d.slug = 'comercial' 
    LIMIT 1
  )
  WHERE c.department_id IS NULL;
END;
$$;

-- =============================================================================
-- 9. HABILITAR REALTIME
-- =============================================================================
-- Adiciona novas tabelas à publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.departments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transfers;

-- =============================================================================
-- FIM DO SCHEMA
-- =============================================================================
