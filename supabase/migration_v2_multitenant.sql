-- =============================================
-- Sprint 5: Multi-tenant Migration
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- =============================================

-- 1. Adicionar coluna user_id na tabela workspaces
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Associar workspaces existentes ao seu usuário
-- (substitua pelo seu user_id real — veja nas instruções abaixo)
-- UPDATE workspaces SET user_id = 'SEU_USER_ID_AQUI';

-- 3. Adicionar colunas para Stripe (Fase 3)
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- Verificação
SELECT id, name, slug, user_id, plan FROM workspaces;
