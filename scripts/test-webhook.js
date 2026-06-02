async function simulateWebhook() {
  const webhookUrl = 'http://localhost:3000/api/webhook/whatsapp';

  const mockPayload = {
    "event": "messages.upsert",
    "instance": "nome-da-sua-instancia",
    "data": {
      "key": {
        "remoteJid": "5511999999999@s.whatsapp.net",
        "fromMe": false
      },
      "message": {
        "conversation": "Olá! Vi o portfólio da Ursa Filme e gostaria de entender como funciona a produção de uma campanha para o mercado de Ciudad del Este."
      }
    }
  };

  console.log(`🚀 Disparando webhook falso para: ${webhookUrl}`);
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
