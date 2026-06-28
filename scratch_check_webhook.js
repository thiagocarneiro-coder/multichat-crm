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

const API_URL = env.EVOLUTION_API_URL;
const API_KEY = env.EVOLUTION_GLOBAL_KEY;

if (!API_URL || !API_KEY) {
  console.error('EVOLUTION_API_URL ou EVOLUTION_GLOBAL_KEY ausentes no .env.local');
  process.exit(1);
}

async function checkWebhook() {
  console.log(`Conectando à Evolution API em: ${API_URL}`);

  try {
    // 1. Listar instâncias para achar a aberta
    const listRes = await fetch(`${API_URL}/instance/fetchInstances`, {
      headers: { 'apikey': API_KEY }
    });

    if (!listRes.ok) {
      console.error(`Erro ao listar instâncias: ${listRes.status} ${await listRes.text()}`);
      return;
    }

    const instances = await listRes.json();
    console.log(`Instâncias brutas encontradas:`, JSON.stringify(instances, null, 2));

    const openInstance = instances.find(i => {
      const instObj = i.instance || i;
      const status = instObj.status || instObj.connectionStatus;
      return status === 'open';
    });

    if (!openInstance) {
      console.log('❌ Nenhuma instância aberta encontrada.');
      return;
    }

    const instanceName = openInstance.instance?.instanceName || openInstance.name || openInstance.instanceName;
    console.log(`\nIdentificada instância aberta: ${instanceName}`);

    // 2. Buscar Webhook atual da instância
    const findRes = await fetch(`${API_URL}/webhook/find/${instanceName}`, {
      headers: { 'apikey': API_KEY }
    });

    if (findRes.ok) {
      const webhookData = await findRes.json();
      console.log(`Configuração atual do Webhook da instância:`, JSON.stringify(webhookData, null, 2));
    } else {
      console.log(`Não foi possível buscar o webhook atual (talvez não configurado). Código: ${findRes.status}`);
    }

    // 3. Atualizar/Configurar Webhook para apontar para a Vercel
    const targetWebhookUrl = 'https://multichat-crm.vercel.app/api/webhook/whatsapp';
    const webhookSecret = '790c89ea50277a28f5981b8c4fe8c70aca2fd0c2e468f253d37a3554d12d88d1';

    console.log(`\nConfigurando webhook para: ${targetWebhookUrl}`);

    const setRes = await fetch(`${API_URL}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY
      },
      body: JSON.stringify({
        enabled: true,
        url: targetWebhookUrl,
        webhookByEvents: false,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
        headers: {
          'x-webhook-secret': webhookSecret
        }
      })
    });

    if (setRes.ok) {
      console.log(`✅ Webhook configurado com sucesso!`);
      const setJson = await setRes.json();
      console.log(JSON.stringify(setJson, null, 2));
    } else {
      console.error(`❌ Erro ao configurar webhook: ${setRes.status} ${await setRes.text()}`);
    }

  } catch (err) {
    console.error('Erro na requisição:', err);
  }
}

checkWebhook();
