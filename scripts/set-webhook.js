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
const NGROK_URL = "https://guzzler-snugly-annex.ngrok-free.dev";

if (!API_URL || !API_KEY) {
  console.error("❌ EVOLUTION_API_URL ou EVOLUTION_GLOBAL_KEY faltando no .env.local");
  process.exit(1);
}

const instanceName = process.argv[2];

if (!instanceName) {
  console.error("❌ Erro: Faltou informar o nome da instância.");
  console.log("👉 Uso correto: node scripts/set-webhook.js NOME_DA_INSTANCIA");
  process.exit(1);
}

async function setWebhook() {
  console.log(`\n⏳ Configurando Webhook na instância: [${instanceName}]...`);
  
  const webhookPayload = {
    webhook: {
      url: `${NGROK_URL}/api/webhook/whatsapp`,
      byEvents: false,
      base64: false,
      events: [
        "MESSAGES_UPSERT"
      ]
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
      console.error('❌ Falha ao configurar webhook:', data);
    }
  } catch (err) {
    console.error('❌ Erro de conexão com a API:', err.message);
  }
}

setWebhook();
