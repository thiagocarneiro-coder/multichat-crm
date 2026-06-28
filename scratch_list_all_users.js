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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function listUsers() {
  console.log('Listando todos os usuários no Auth...');
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('Erro:', authError.message);
    return;
  }

  console.log(`Encontrados ${users.length} usuários no auth.users.`);

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*');

  if (profileError) {
    console.error('Erro profiles:', profileError.message);
    return;
  }

  const profileMap = new Map(profiles.map(p => [p.id, p]));

  users.forEach((u, i) => {
    const p = profileMap.get(u.id);
    console.log(`\n[Usuário ${i + 1}]`);
    console.log(`- Email: ${u.email}`);
    console.log(`- ID: ${u.id}`);
    if (p) {
      console.log(`- Perfil Encontrado:`);
      console.log(`  - Nome: ${p.full_name}`);
      console.log(`  - Role: ${p.role}`);
      console.log(`  - Setor ID: ${p.department_id}`);
      console.log(`  - Workspace ID: ${p.workspace_id}`);
    } else {
      console.log(`- ❌ Sem perfil correspondente em public.profiles.`);
    }
  });
}

listUsers();
