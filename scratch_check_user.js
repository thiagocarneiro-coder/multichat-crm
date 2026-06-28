const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Ler .env.local para pegar as credenciais
const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('Arquivo .env.local não encontrado');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkUser() {
  const targetEmail = 'thiagocarneiro9292@gmail.com';
  console.log(`Buscando dados para o email: ${targetEmail}`);

  // 1. Buscar no Auth do Supabase
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Erro ao buscar usuários no auth:', authError.message);
    return;
  }

  const authUser = users.find(u => u.email === targetEmail);
  if (!authUser) {
    console.log(`❌ Usuário com email ${targetEmail} NÃO existe na tabela auth.users.`);
    return;
  }

  console.log(`✅ Usuário encontrado no Auth!`);
  console.log(`- UUID: ${authUser.id}`);
  console.log(`- Criado em: ${authUser.created_at}`);

  // 2. Buscar na tabela public.profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*, departments(name)')
    .eq('id', authUser.id)
    .single();

  if (profileError) {
    console.log(`❌ Perfil correspondente NÃO encontrado em public.profiles. Erro:`, profileError.message);
  } else {
    console.log(`✅ Perfil encontrado em public.profiles!`);
    console.log(`- Nome: ${profile.full_name}`);
    console.log(`- Papel (Role): ${profile.role}`);
    console.log(`- Workspace ID: ${profile.workspace_id}`);
    console.log(`- Setor ID: ${profile.department_id} (Setor: ${profile.departments?.name || 'Nenhum'})`);
  }

  // 3. Buscar workspaces pertencentes a esse usuário
  const { data: workspaces, error: wsError } = await supabase
    .from('workspaces')
    .select('*')
    .eq('user_id', authUser.id);

  if (wsError) {
    console.error('Erro ao buscar workspaces:', wsError.message);
  } else {
    console.log(`- Workspaces criados por ele:`, workspaces);
  }
}

checkUser();
