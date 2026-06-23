import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Resultado completo da análise de IA
 */
export type AIAnalysisResult = {
  status: string;          // NOVO | CURIOSO | EM NEGOCIAÇÃO | COMPROU
  sale_value: number | null;     // Valor da venda detectado (em reais)
  detected_source: string | null; // Origem detectada por frase ("instagram", "indicação", etc.)
};

/**
 * Classifica a intenção do lead com base na mensagem (versão simples para webhook inline).
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

/**
 * Análise COMPLETA de um lead com base no histórico de conversa.
 * 
 * Extrai:
 * - Estágio do funil (NOVO → CURIOSO → EM NEGOCIAÇÃO → COMPROU)
 * - Valor da venda (se mencionado na conversa)
 * - Origem detectada por frase (se o lead mencionou de onde veio)
 * 
 * Usado pelo CRON de classificação em lote.
 */
export async function analyzeLeadFull(historico: string): Promise<AIAnalysisResult> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Você é um analista de qualificação de leads de uma agência de marketing e tráfego pago.

Analise o HISTÓRICO COMPLETO da conversa abaixo e extraia 3 informações:

1. **ESTÁGIO DO FUNIL** — Em qual etapa o lead está:
   - NOVO (cumprimento básico, "oi", "boa tarde")
   - CURIOSO (perguntou como funciona, pediu orçamento, valores)
   - EM NEGOCIAÇÃO (discutindo detalhes, pediu contrato, alinhando)
   - COMPROU (confirmou pagamento, enviou comprovante, fechou)

2. **VALOR DA VENDA** — Se o lead COMPROU ou está negociando, tente encontrar o valor mencionado na conversa. Exemplos:
   - "Fechamos por R$1.500" → 1500
   - "O pacote sai por 3 mil" → 3000
   - "Vou pagar 800 reais" → 800
   - Se não houver valor mencionado → null

3. **ORIGEM POR FRASE** — Se o lead mencionou de onde conheceu/veio, identifique:
   - "Vi no Instagram" → instagram
   - "Vi o anúncio no Facebook" → meta_ads
   - "Pesquisei no Google" → google
   - "Amigo indicou" ou "fulano me indicou" → indicacao
   - "Vi no YouTube" → youtube
   - "Vi no TikTok" → tiktok
   - "Vi o site" → site
   - Se não mencionou → null

Histórico da conversa:
${historico}

RESPONDA EXATAMENTE neste formato JSON, sem markdown, sem crases, sem explicações:
{"status":"ESTÁGIO","sale_value":VALOR_OU_NULL,"detected_source":"ORIGEM_OU_NULL"}

Exemplos de resposta válida:
{"status":"COMPROU","sale_value":1500,"detected_source":"instagram"}
{"status":"CURIOSO","sale_value":null,"detected_source":"indicacao"}
{"status":"NOVO","sale_value":null,"detected_source":null}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    // Tentar parsear JSON
    try {
      // Remove possíveis crases markdown
      const cleanJson = responseText.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      const validStatuses = ['NOVO', 'CURIOSO', 'EM NEGOCIAÇÃO', 'COMPROU'];
      
      return {
        status: validStatuses.includes(parsed.status?.toUpperCase()) ? parsed.status.toUpperCase() : 'NOVO',
        sale_value: typeof parsed.sale_value === 'number' && parsed.sale_value > 0 ? parsed.sale_value : null,
        detected_source: typeof parsed.detected_source === 'string' && parsed.detected_source !== 'null' ? parsed.detected_source.toLowerCase() : null,
      };
    } catch {
      // Fallback: tenta extrair só o status
      const statusMatch = responseText.match(/"status"\s*:\s*"([^"]+)"/);
      const status = statusMatch ? statusMatch[1].toUpperCase() : 'NOVO';
      const validStatuses = ['NOVO', 'CURIOSO', 'EM NEGOCIAÇÃO', 'COMPROU'];
      
      return {
        status: validStatuses.includes(status) ? status : 'NOVO',
        sale_value: null,
        detected_source: null,
      };
    }
  } catch (error) {
    console.error('AI Full Analysis Error:', error);
    return { status: 'NOVO', sale_value: null, detected_source: null };
  }
}
