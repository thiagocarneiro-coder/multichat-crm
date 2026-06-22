const fs = require('fs');
const path = require('path');

// 1. Carrega as variáveis do .env.local manualmente para não precisarmos instalar pacotes extras (como dotenv) no script avulso.
const envPath = path.resolve(process.cwd(), '.env.local');
let envConfig = {};
try {
  const envFile = fs.readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove aspas caso tenha
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      envConfig[key] = value;
    }
  });
} catch (e) {
  console.error("❌ Erro ao ler .env.local", e);
  process.exit(1);
}

const API_URL = envConfig.EVOLUTION_API_URL;
const API_KEY = envConfig.EVOLUTION_GLOBAL_KEY;
const APP_URL = envConfig.NEXT_PUBLIC_APP_URL;

if (!API_URL || !API_KEY) {
  console.error("❌ EVOLUTION_API_URL ou EVOLUTION_GLOBAL_KEY faltando no .env.local");
  process.exit(1);
}

const instanceNameArg = process.argv[2];

async function setWebhook() {
  console.log('🔍 Buscando a instância ativa na Evolution API...');
  
  let instanceName = instanceNameArg;

  if (!instanceName) {
    try {
      const instancesRes = await fetch(`${API_URL}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': API_KEY,
          'cache': 'no-store'
        }
      });

      const instancesData = await instancesRes.json();
      
      if (Array.isArray(instancesData) && instancesData.length > 0) {
        const activeInstance = instancesData.find(inst => inst.connectionStatus === 'open') || instancesData[0];
        instanceName = activeInstance.name;
        console.log(`✅ Instância encontrada: ${instanceName} (Status: ${activeInstance.connectionStatus})`);
      } else {
        console.error('❌ Nenhuma instância encontrada na Evolution API.');
        return;
      }
    } catch (err) {
      console.error('❌ Erro ao buscar instâncias:', err.message);
      return;
    }
  }

  console.log(`\n⏳ Configurando Webhook na instância: [${instanceName}]...`);
  
  // URL base para o Webhook (preferimos o NEXT_PUBLIC_APP_URL, com fallback pro Ngrok se aplicável)
  const webhookBaseUrl = envConfig.NEXT_PUBLIC_APP_URL || APP_URL;

  const webhookPayload = {
    webhook: {
      enabled: true,
      url: `${webhookBaseUrl}/api/webhook/whatsapp`,
      webhookByEvents: false,
      events: [
        "MESSAGES_UPSERT", 
        "CONNECTION_UPDATE"
      ],
      headers: {
        "x-webhook-secret": envConfig.WEBHOOK_GLOBAL_SECRET || ""
      }
    }
  };

  try {
    const response = await fetch(`${API_URL}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY
      },
      body: JSON.stringify(webhookPayload)
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Webhook configurado com sucesso!');
      console.log('🔗 URL:', webhookPayload.webhook.url);
      console.log('📦 Resposta da AWS:', data);
    } else {
      console.error('❌ Falha ao configurar webhook:');
      console.log('Detalhes do Erro:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('❌ Erro de conexão com a API:', err.message);
  }
}

setWebhook();
