import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Classifica a intenção do lead com base na mensagem.
 * 
 * Funil padronizado: NOVO → CURIOSO → EM NEGOCIAÇÃO → COMPROU
 * 
 * Usado pelo webhook (classificação inline) e pelo cron (classificação em lote).
 */
export async function analyzeLeadIntent(text: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Você é um classificador estrito de intenção de leads de uma agência de marketing e tráfego pago.
Classifique a mensagem do usuário em APENAS UMA destas 4 categorias:
NOVO
CURIOSO
EM NEGOCIAÇÃO
COMPROU

Regras:
- NOVO: Apenas um cumprimento básico como "Oi", "Boa tarde", ou algo vago.
- CURIOSO: Perguntou como funciona, pediu orçamento, valores, portfólio ou tirou dúvidas iniciais.
- EM NEGOCIAÇÃO: Está enviando dados da empresa, discutindo detalhes técnicos, pediu contrato ou está alinhando detalhes.
- COMPROU: Confirmou pagamento, enviou comprovante ou disse claramente que fechou.

Mensagem: "${text}"

Retorne RIGOROSAMENTE APENAS a palavra da categoria em letras maiúsculas, sem aspas, sem pontos e sem formatação markdown.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const category = response.text().trim().toUpperCase();
    
    const validStatuses = ['NOVO', 'CURIOSO', 'EM NEGOCIAÇÃO', 'COMPROU'];
    if (!validStatuses.includes(category)) {
      return 'NOVO';
    }
    
    return category;
  } catch (error) {
    console.error('AI Analysis Error:', error);
    return 'NOVO';
  }
}
