import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Classifies the lead's intent based on their message.
 * Returns strictly one of: NOVO, DUVIDA, NEGOCIACAO, VENDA_FECHADA
 */
export async function analyzeLeadIntent(text: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Você é um classificador estrito de intenção de leads. 
Classifique a mensagem do usuário em APENAS UMA destas 4 categorias:
NOVO
DUVIDA
NEGOCIACAO
VENDA_FECHADA

Mensagem: "${text}"

Retorne RIGOROSAMENTE APENAS a palavra da categoria em letras maiúsculas, sem aspas, sem pontos e sem formatação markdown.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const category = response.text().trim();
    
    // Fallback to ensure it's one of the valid categories
    if (!['NOVO', 'DUVIDA', 'NEGOCIACAO', 'VENDA_FECHADA'].includes(category)) {
      return 'NOVO';
    }
    
    return category;
  } catch (error) {
    console.error('AI Analysis Error:', error);
    // Return a default status in case of API failure
    return 'NOVO';
  }
}
