import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Extração segura baseada no formato da Evolution API v2 (messages.upsert)
    const data = body?.data;
    if (!data || !data.key) {
      // Se não for um evento de mensagem estruturado, ignora
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Barreira de segurança: Ignora mensagens enviadas pelo próprio Bot (eco)
    if (data.key.fromMe === true) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Extrai o número do remetente
    const remoteJid = data.key.remoteJid;

    // Extrai o texto da mensagem (suporta texto puro ou texto com reply/forward/media)
    const textMessage = 
      data.message?.conversation || 
      data.message?.extendedTextMessage?.text || 
      "";

    // Se não tiver texto, podemos ignorar (ex: mensagem de sistema, áudio isolado sem legenda, etc)
    if (!textMessage.trim()) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Log super visual no terminal
    console.log('\n=============================================');
    console.log('🟢 NOVA MENSAGEM RECEBIDA:');
    console.log('📱 De:', remoteJid);
    console.log('💬 Texto:', textMessage);
    console.log('=============================================\n');

    // Retorno obrigatório de 200 OK para a Evolution API não re-enviar o webhook
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Erro ao processar Webhook do WhatsApp:', error);
    // Mesmo em caso de erro de parsing, é seguro retornar 200 para webhooks de third-party pararem de tentar,
    // mas se quisermos debug, podemos retornar 500. A regra de ouro é: retorne 200 OK a menos que queira retry.
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 200 });
  }
}
