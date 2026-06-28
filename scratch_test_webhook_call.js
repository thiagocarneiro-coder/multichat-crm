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

const webhookSecret = '790c89ea50277a28f5981b8c4fe8c70aca2fd0c2e468f253d37a3554d12d88d1';
const targetUrl = 'https://multichat-crm.vercel.app/api/webhook/whatsapp';

async function testWebhookCall() {
  console.log(`Disparando chamada de teste para: ${targetUrl}`);

  const payload = {
    event: "messages.upsert",
    instance: "multichat-1782314821371",
    data: {
      key: {
        remoteJid: "553199999888@s.whatsapp.net",
        fromMe: false,
        id: "TEST_MESSAGE_" + Date.now()
      },
      message: {
        conversation: "Olá, isso é um teste de webhook!"
      },
      pushName: "Cliente Teste Webhook",
      instanceId: "a9c397c8-40c1-40ff-a028-296b6d4b0e7c"
    }
  };

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': webhookSecret
      },
      body: JSON.stringify(payload)
    });

    console.log(`Status da resposta: ${res.status}`);
    const text = await res.text();
    console.log(`Corpo da resposta:`, text);
  } catch (err) {
    console.error(`Erro ao fazer a requisição:`, err);
  }
}

testWebhookCall();
