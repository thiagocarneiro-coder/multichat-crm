-- 1. Adicionar a coluna 'curso' na tabela de click_sessions (para receber os dados do tracker)
ALTER TABLE public.click_sessions ADD COLUMN IF NOT EXISTS curso TEXT;

-- 2. Adicionar a coluna 'curso' na tabela de leads (para o webhook repassar o dado para o lead)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS curso TEXT;

-- 3. Adicionar a coluna 'slug' na tabela workspaces (se não existir)
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS slug TEXT;

-- 4. Inserir o Workspace do Marcelo Farani
-- Como a inserção pode falhar se já existir, fazemos um DO NOTHING no conflito (se houver chave única no slug)
-- Se não houver restrição, apenas inserimos se não existir.
INSERT INTO public.workspaces (name, slug) 
SELECT 'Marcelo Farani - Cursos', 'marcelo-farani'
WHERE NOT EXISTS (
    SELECT 1 FROM public.workspaces WHERE slug = 'marcelo-farani'
);
