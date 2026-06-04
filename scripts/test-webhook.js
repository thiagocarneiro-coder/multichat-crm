const fs = require('fs');
const path = require('path');

// 1. Carrega as variáveis do .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
let envConfig = {};
try {
  const envFile = fs.readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
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

if (!API_URL || !API_KEY) {
  console.error("❌ EVOLUTION_API_URL ou EVOLUTION_GLOBAL_KEY faltando no .env.local");
  process.exit(1);
}

async function simulateWebhook() {
  console.log('🔍 Buscando a instância ativa na Evolution API...');
  
  let instanceName = null;

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
      // Procura a primeira que está open, se não tiver pega a primeira da lista
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

  const webhookUrl = 'http://localhost:3000/api/webhook/whatsapp';

  const mockPayload = {
    "event": "messages.upsert",
    "instance": instanceName,
    "data": {
      "key": {
        "remoteJid": "5531928324668@s.whatsapp.net",
        "fromMe": false
      },
      "message": {
        "conversation": "Olá! Vi o portfólio da Ursa Filme e gostaria de entender como funciona a produção de uma campanha para o mercado de Ciudad del Este."
      }
    }
  };

  console.log(`\n🚀 Disparando webhook falso para: ${webhookUrl}`);
  console.log('📦 Payload:', JSON.stringify(mockPayload, null, 2));

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mockPayload)
    });

    const data = await response.json();

    if (response.ok) {
      console.log('\n✅ Webhook simulado com sucesso!');
      console.log('📥 Resposta do Next.js:', data);
    } else {
      console.error('\n❌ Falha na simulação. Status:', response.status);
      console.error('Retorno:', data);
    }
  } catch (error) {
    console.error('\n❌ Erro ao disparar fetch:', error.message);
  }
}

simulateWebhook();
