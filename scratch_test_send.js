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
const instanceName = 'multichat-1782314821371';

async function testSend() {
  const targetNumber = '188879927783677'; // O número retornado no webhook do cliente
  const text = 'Olá! Teste de envio de mensagem diretamente pela Evolution API.';

  console.log(`Disparando envio para: ${targetNumber} via instância ${instanceName}`);
  console.log(`URL: ${API_URL}/message/sendText/${instanceName}`);

  try {
    const res = await fetch(`${API_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY
      },
      body: JSON.stringify({
        number: targetNumber,
        text: text
      })
    });

    console.log(`Status da Resposta: ${res.status}`);
    const textRes = await res.text();
    console.log(`Corpo da Resposta:`, textRes);
  } catch (err) {
    console.error(`Erro na requisição:`, err);
  }
}

testSend();
