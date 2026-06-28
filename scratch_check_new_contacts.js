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

async function checkRecentData() {
  console.log('Buscando contatos recentes...');
  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (contactsError) {
    console.error('Erro contatos:', contactsError.message);
  } else {
    console.log(`Contatos recentes (últimos 5):`, contacts.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      department_id: c.department_id,
      created_at: c.created_at,
      updated_at: c.updated_at
    })));
  }

  console.log('\nBuscando mensagens recentes...');
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('*, contacts(name, phone)')
    .order('created_at', { ascending: false })
    .limit(5);

  if (messagesError) {
    console.error('Erro mensagens:', messagesError.message);
  } else {
    console.log(`Mensagens recentes (últimas 5):`, messages.map(m => ({
      id: m.id,
      contact_name: m.contacts?.name,
      contact_phone: m.contacts?.phone,
      content: m.content,
      role: m.role,
      direction: m.direction,
      created_at: m.created_at
    })));
  }
}

checkRecentData();
