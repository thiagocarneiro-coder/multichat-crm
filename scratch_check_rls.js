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

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkPolicies() {
  console.log('Verificando se RLS está ativo e quais políticas existem...');

  // 1. Consultar pg_tables para ver se RLS (rowsecurity) está ativo nas tabelas
  const { data: tables, error: tablesError } = await supabase.rpc('get_tables_status');
  
  // Se a RPC get_tables_status não existir (o que é provável), podemos rodar uma query direta no SQL usando a API REST do Supabase?
  // Infelizmente, a API REST do Supabase não permite rodar SQL arbitrário diretamente, mas podemos usar query SQL
  // Wait, let's see if we can query pg_catalog tables via the postgrest API if exposed (usually not).
  // But wait! We can select from pg_policies if the service role key is used.
  // Actually, postgrest doesn't expose pg_catalog tables by default.
  // Wait, how can we run a query? Let's check if there is a way.
  // If not, we can check if the user is getting an error in the console.
  
  // Wait, let's look at migration_multichat_crm.sql again:
  // Is RLS enabled there? No ALTER TABLE ENABLE ROW LEVEL SECURITY was run.
  // But wait! In Supabase, if you create a new table, RLS is DISABLED by default (so anyone can read/write via PostgREST).
  // UNLESS they clicked "Enable RLS" in the Supabase Dashboard, or if they have existing policies.
  // Wait, if RLS is enabled on `profiles`, and they did not create any policies, then any select from `profiles` via the anon key will return 0 rows!
  // Let's check if the browser client actually fails to read `profiles` because of this!
  // Wait, let's write a simple script to verify if RLS is enabled by trying to read profiles WITH the public anon key (unauthenticated).
  // If RLS is enabled and no policies exist, even reading it will return empty or error.
  
  // Wait! Let's check if the client-side fetch in Sidebar.tsx and other pages is throwing an error or returning empty.
  // Let's write a script that does a query to `profiles` using the anon key.
  const anonSupabase = createClient(supabaseUrl, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  const { data: testAnon, error: testAnonError } = await anonSupabase
    .from('profiles')
    .select('*')
    .limit(1);
    
  console.log('--- Teste com Anon Key (Sem autenticação) ---');
  console.log('Result:', testAnon);
  console.log('Error:', testAnonError);
}

checkPolicies();
