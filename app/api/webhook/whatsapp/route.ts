import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

    // Integração Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      
      const prompt = `Você é um assistente virtual de uma agência de audiovisual chamada Ursa Filme. Um cliente enviou a seguinte mensagem: "${textMessage}". Responda de forma profissional e curta.`;
      
      const result = await model.generateContent(prompt);
      const respostaIA = result.response.text();
      
      console.log('🧠 RESPOSTA DA IA:', respostaIA);
    } else {
      console.log('⚠️ GEMINI_API_KEY não encontrada. Pulando processamento de IA.');
    }

    // Retorno obrigatório de 200 OK para a Evolution API não re-enviar o webhook
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Erro ao processar Webhook do WhatsApp:', error);
    // Mesmo em caso de erro de parsing, é seguro retornar 200 para webhooks de third-party pararem de tentar,
    // mas se quisermos debug, podemos retornar 500. A regra de ouro é: retorne 200 OK a menos que queira retry.
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 200 });
  }
}
