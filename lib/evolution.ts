export async function createInstance(instanceName: string) {
  const API_URL = process.env.EVOLUTION_API_URL;
  const API_KEY = process.env.EVOLUTION_GLOBAL_KEY;

  if (!API_URL || !API_KEY) {
    throw new Error('Evolution API não configurada no .env');
  }

  // Cria a instância e configura o webhook
  const response = await fetch(`${API_URL}/instance/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: API_KEY,
    },
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS'
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    // Se a instância já existir, não tem problema, seguimos em frente.
    if (!err.includes('already exists')) {
      throw new Error(`Falha ao criar instância: ${err}`);
    }
  }
  return true;
}

export async function getQRCode(instanceName: string) {
  const API_URL = process.env.EVOLUTION_API_URL;
  const API_KEY = process.env.EVOLUTION_GLOBAL_KEY;

  if (!API_URL || !API_KEY) {
    throw new Error('Evolution API não configurada no .env');
  }

  const response = await fetch(`${API_URL}/instance/connect/${instanceName}`, {
    method: 'GET',
    headers: {
      apikey: API_KEY,
    },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Falha ao obter QR Code: ${err}`);
  }

  const data = await response.json();
  return data.base64; // Retorna a string base64 do QR code
}

export async function checkConnectionState(instanceName: string) {
  const API_URL = process.env.EVOLUTION_API_URL;
  const API_KEY = process.env.EVOLUTION_GLOBAL_KEY;

  if (!API_URL || !API_KEY) {
    throw new Error('Evolution API não configurada no .env');
  }

  const response = await fetch(`${API_URL}/instance/connectionState/${instanceName}`, {
    method: 'GET',
    headers: {
      apikey: API_KEY,
    },
  });

  if (!response.ok) {
    return 'close';
  }

  const data = await response.json();
  return data.instance?.state || 'close'; // open, connecting, close
}
